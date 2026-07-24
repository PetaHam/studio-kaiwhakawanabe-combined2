#!/usr/bin/env python3
"""
benchmark_compression.py
========================

Scientific benchmarking harness for a patent-pending lossless floating-point
compression algorithm ("the Invention") compared against prior-art baselines
(Gorilla, Chimp128, Elf+, and DEFLATE/zlib).

The harness:
  1. Implements the Invention (per-block predictor selection + XOR residuals +
     bit-plane transposition + occupancy mask).
  2. Implements prior-art baselines for comparison.
  3. Generates realistic synthetic time-series corpora (or reads a raw
     float64 binary file via --file).
  4. Verifies EVERY codec round-trips bit-exactly (including NaN / inf / -0.0).
  5. Emits the [MEASURE] table (Markdown + CSV + JSON) and a final
     Invention-vs-Elf+ verdict against the patent viability threshold.

Design constraints honoured:
  * Losslessness    : every encoder has a decoder; round-trip is asserted at the
                      bit level (`view('uint64')` equality), so NaN payloads,
                      +/-inf and -0.0 must survive exactly.
  * Bit-accurate size: reported bytes derive from the actual number of bits the
                      encoder emitted, never from an entropy estimate.
  * Deterministic   : np.random.seed(42).
  * Self-contained  : only numpy, struct, zlib and the standard library.

Notes on baseline fidelity: Gorilla is implemented per the Facebook paper
(leading/trailing-zero elimination with a reuse control bit). Chimp128 and Elf+
are faithful, documented *simplifications* of their published schemes -- they
capture the essential ideas (a 128-entry reference dictionary for Chimp128; a
per-block predictor with residual-length coding for Elf+) and are provably
lossless, but they are not the reference C implementations. Numbers should be
read as relative indicators, not as absolute reproductions of published results.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import struct
import sys
import time
import zlib

import numpy as np

SEED = 42
UMASK64 = (1 << 64) - 1
U1 = np.uint64(1)


# ---------------------------------------------------------------------------
# Bit I/O (MSB-first)
# ---------------------------------------------------------------------------
class BitWriter:
    """Accumulates bits MSB-first into a byte buffer. Supports arbitrary width
    (values are Python ints, so N-bit bit-planes up to N=256 work directly)."""

    __slots__ = ("buf", "cur", "nbits", "count")

    def __init__(self) -> None:
        self.buf = bytearray()
        self.cur = 0      # pending bits, right-aligned
        self.nbits = 0    # number of pending bits in `cur`
        self.count = 0    # total bits written

    def write_bits(self, value: int, n: int) -> None:
        if n <= 0:
            return
        self.cur = (self.cur << n) | (int(value) & ((1 << n) - 1))
        self.nbits += n
        self.count += n
        while self.nbits >= 8:
            self.nbits -= 8
            self.buf.append((self.cur >> self.nbits) & 0xFF)
        self.cur &= (1 << self.nbits) - 1

    def write_bit(self, bit: int) -> None:
        self.write_bits(bit & 1, 1)

    def getbytes(self) -> bytes:
        if self.nbits:
            return bytes(self.buf) + bytes([(self.cur << (8 - self.nbits)) & 0xFF])
        return bytes(self.buf)


class BitReader:
    """Reads bits MSB-first from a byte buffer, mirroring BitWriter."""

    __slots__ = ("data", "byteidx", "cur", "nbits")

    def __init__(self, data: bytes) -> None:
        self.data = data
        self.byteidx = 0
        self.cur = 0
        self.nbits = 0

    def read_bits(self, n: int) -> int:
        if n <= 0:
            return 0
        while self.nbits < n:
            self.cur = (self.cur << 8) | self.data[self.byteidx]
            self.byteidx += 1
            self.nbits += 8
        self.nbits -= n
        val = (self.cur >> self.nbits) & ((1 << n) - 1)
        self.cur &= (1 << self.nbits) - 1
        return val

    def read_bit(self) -> int:
        return self.read_bits(1)


# ---------------------------------------------------------------------------
# Bit helpers
# ---------------------------------------------------------------------------
def clz64(x: int) -> int:
    """Leading zero count of a non-zero 64-bit integer."""
    return 64 - x.bit_length()


def ctz64(x: int) -> int:
    """Trailing zero count of a non-zero 64-bit integer."""
    return (x & -x).bit_length() - 1


def meaningful_counts(x: np.ndarray) -> np.ndarray:
    """Vectorised count of 'meaningful' bits (64 - leading - trailing zeros) for
    each uint64 in `x`. Zero entries yield 0. Uses np.bitwise_count (numpy>=2.0).
    """
    x = np.asarray(x, dtype=np.uint64)
    # leading: smear bits rightwards, popcount => bit_length => 64 - bit_length.
    f = x.copy()
    for s in (1, 2, 4, 8, 16, 32):
        f |= f >> np.uint64(s)
    bitlen = np.bitwise_count(f).astype(np.int64)
    lead = 64 - bitlen
    # trailing: isolate lowest set bit, popcount(lsb-1).
    lsb = x & (((~x) + U1))          # x & (-x) in modular uint64 arithmetic
    trail = np.bitwise_count(lsb - U1).astype(np.int64)
    m = 64 - lead - trail
    m[x == 0] = 0
    return m


# ---------------------------------------------------------------------------
# Predictors (shared by the Invention and by Elf+)
# ---------------------------------------------------------------------------
# P0 (zero order) : pred = prev
# P1 (first order): pred = prev + (prev - prev2)
# P2 (second ord.): pred = prev + (prev-prev2) + ((prev-prev2) - (prev2-prev3))
#
# Predictions are computed on the *true* previous values; the decoder recovers
# those values bit-exactly and re-applies the identical arithmetic, so the XOR
# residual inverts exactly. Encoder (vectorised) and decoder (scalar) MUST use
# byte-identical expressions -- they do below.

def build_prediction_bits(values: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (p0_bits, p1_bits, p2_bits) as uint64 arrays of predicted bit
    patterns for every index, matching predict_scalar()."""
    v = values.astype(np.float64, copy=False)
    n = v.shape[0]

    p0 = np.zeros(n, dtype=np.float64)
    p1 = np.zeros(n, dtype=np.float64)
    p2 = np.zeros(n, dtype=np.float64)

    if n >= 2:
        p0[1:] = v[:-1]
        p1[1] = v[0]
        p2[1] = v[0]
    elif n == 1:
        pass  # all predictions for index 0 are 0.0

    if n >= 3:
        p1[2:] = v[1:-1] + (v[1:-1] - v[0:-2])
        p2[2] = v[1] + (v[1] - v[0])

    if n >= 4:
        a = v[2:-1]      # v[i-1]
        b = v[1:-2]      # v[i-2]
        c = v[0:-3]      # v[i-3]
        p2[3:] = a + (a - b) + ((a - b) - (b - c))

    return (p0.view(np.uint64).copy(),
            p1.view(np.uint64).copy(),
            p2.view(np.uint64).copy())


def predict_scalar(pid: int, out: np.ndarray, i: int) -> np.float64:
    """Scalar prediction for index i from already-reconstructed values `out`.
    Must match build_prediction_bits() exactly (same operand order)."""
    if i == 0:
        return np.float64(0.0)
    if pid == 0:
        return out[i - 1]
    if pid == 1:
        if i == 1:
            return out[0]
        return out[i - 1] + (out[i - 1] - out[i - 2])
    # pid == 2
    if i == 1:
        return out[0]
    if i == 2:
        return out[1] + (out[1] - out[0])
    a = out[i - 1]
    b = out[i - 2]
    c = out[i - 3]
    return a + (a - b) + ((a - b) - (b - c))


def _pred_bits_scalar(pid: int, out: np.ndarray, i: int) -> int:
    return int(np.float64(predict_scalar(pid, out, i)).view(np.uint64))


# ---------------------------------------------------------------------------
# THE INVENTION
# ---------------------------------------------------------------------------
class InventionCodec:
    """Per-block predictor selection + XOR residual + bit-plane transpose +
    occupancy mask.

    Block layout on the wire:
        [global header] n (32b) | block_size N (16b)
        per block:
            predictor id (8b) | occupancy mask (64b) |
            for each occupied plane k (ascending k): N residual-bits (MSB=res[0])

    Predictor selection cost = number of non-zero bit-planes = popcount of the
    OR of all residuals in the block (== the occupancy mask itself).
    """

    def __init__(self, block_size: int = 128):
        assert block_size in (64, 128, 256)
        self.N = block_size

    def encode(self, values: np.ndarray,
               predbits: tuple[np.ndarray, np.ndarray, np.ndarray] | None = None) -> bytes:
        v = values.astype(np.float64, copy=False)
        vb = v.view(np.uint64)
        n = vb.shape[0]
        if predbits is None:
            predbits = build_prediction_bits(v)
        p_all = predbits

        bw = BitWriter()
        bw.write_bits(n, 32)
        bw.write_bits(self.N, 16)

        N = self.N
        for s in range(0, n, N):
            e = min(s + N, n)
            blen = e - s
            best = None  # (cost, pid, residuals, mask)
            for pid in range(3):
                res = vb[s:e] ^ p_all[pid][s:e]
                mask = int(np.bitwise_or.reduce(res)) if blen else 0
                cost = bin(mask).count("1")
                if best is None or cost < best[0]:
                    best = (cost, pid, res, mask)
            _, pid, res, mask = best

            bw.write_bits(pid, 8)
            bw.write_bits(mask, 64)

            # Emit only occupied planes, each exactly `blen` bits, MSB = res[0].
            npad = (blen + 7) // 8
            shift = npad * 8 - blen
            for k in range(64):
                if (mask >> k) & 1:
                    bitk = ((res >> np.uint64(k)) & U1).astype(np.uint8)
                    packed = np.packbits(bitk)  # right-padded to a byte multiple
                    val = int.from_bytes(packed.tobytes(), "big") >> shift
                    bw.write_bits(val, blen)

        return bw.getbytes()

    def decode(self, data: bytes) -> np.ndarray:
        br = BitReader(data)
        n = br.read_bits(32)
        N = br.read_bits(16)

        out = np.zeros(n, dtype=np.float64)
        outb = out.view(np.uint64)

        i = 0
        for s in range(0, n, N):
            e = min(s + N, n)
            blen = e - s
            pid = br.read_bits(8)
            mask = br.read_bits(64)

            res = np.zeros(blen, dtype=np.uint64)
            nb = (blen + 7) // 8
            shift = nb * 8 - blen
            for k in range(64):
                if (mask >> k) & 1:
                    val = br.read_bits(blen)
                    aligned = val << shift
                    arr = np.frombuffer(aligned.to_bytes(nb, "big"), dtype=np.uint8)
                    bits = np.unpackbits(arr)[:blen].astype(np.uint64)
                    res |= bits << np.uint64(k)

            for j in range(blen):
                pbits = _pred_bits_scalar(pid, out, i)
                outb[i] = np.uint64(int(res[j]) ^ pbits)
                i += 1

        return out


# ---------------------------------------------------------------------------
# BASELINE A: Gorilla (Facebook)
# ---------------------------------------------------------------------------
class GorillaCodec:
    """Classic Gorilla XOR compression with a leading/trailing-zero reuse
    control bit. First value stored raw (64b)."""

    def encode(self, values: np.ndarray) -> bytes:
        vb = values.astype(np.float64, copy=False).view(np.uint64)
        n = vb.shape[0]
        bw = BitWriter()
        bw.write_bits(int(n), 32)
        if n == 0:
            return bw.getbytes()

        prev = int(vb[0])
        bw.write_bits(prev, 64)
        prev_lead = -1
        prev_trail = -1

        for idx in range(1, n):
            x = int(vb[idx])
            xor = prev ^ x
            if xor == 0:
                bw.write_bit(0)
            else:
                bw.write_bit(1)
                lead = clz64(xor)
                trail = ctz64(xor)
                if prev_lead != -1 and lead >= prev_lead and trail >= prev_trail:
                    # Reuse previous window.
                    bw.write_bit(0)
                    mlen = 64 - prev_lead - prev_trail
                    bw.write_bits((xor >> prev_trail) & ((1 << mlen) - 1), mlen)
                else:
                    bw.write_bit(1)
                    mlen = 64 - lead - trail
                    bw.write_bits(lead, 5)
                    bw.write_bits(mlen & 0x3F, 6)   # 64 -> 0
                    bw.write_bits((xor >> trail) & ((1 << mlen) - 1), mlen)
                    prev_lead, prev_trail = lead, trail
            prev = x
        return bw.getbytes()

    def decode(self, data: bytes) -> np.ndarray:
        br = BitReader(data)
        n = br.read_bits(32)
        out = np.zeros(n, dtype=np.float64)
        if n == 0:
            return out
        outb = out.view(np.uint64)
        prev = br.read_bits(64)
        outb[0] = np.uint64(prev)
        prev_lead = -1
        prev_trail = -1
        for idx in range(1, n):
            if br.read_bit() == 0:
                x = prev
            else:
                if br.read_bit() == 0:
                    mlen = 64 - prev_lead - prev_trail
                    meaningful = br.read_bits(mlen)
                    xor = meaningful << prev_trail
                else:
                    lead = br.read_bits(5)
                    mlen = br.read_bits(6)
                    if mlen == 0:
                        mlen = 64
                    meaningful = br.read_bits(mlen)
                    trail = 64 - lead - mlen
                    xor = meaningful << trail
                    prev_lead, prev_trail = lead, trail
                x = prev ^ xor
            outb[idx] = np.uint64(x)
            prev = x
        return out


# ---------------------------------------------------------------------------
# BASELINE B: Chimp128 (simplified)
# ---------------------------------------------------------------------------
class Chimp128Codec:
    """Simplified Chimp128: maintains a 128-entry window of recent values and
    picks the reference that minimises the meaningful-bit count of the XOR.

    2-bit flag per value:
        00 -> equal to previous value              (no payload)
        01 -> equal to a dictionary reference      (idx:7)
        10 -> non-zero XOR vs previous value       (lead:6, mlen:6, meaningful)
        11 -> non-zero XOR vs dictionary reference (idx:7, lead:6, mlen:6, mean.)
    """

    WINDOW = 128
    IDX_BITS = 7  # ceil(log2(128))

    def encode(self, values: np.ndarray) -> bytes:
        vb = values.astype(np.float64, copy=False).view(np.uint64)
        n = vb.shape[0]
        bw = BitWriter()
        bw.write_bits(int(n), 32)
        if n == 0:
            return bw.getbytes()
        bw.write_bits(int(vb[0]), 64)

        W = self.WINDOW
        # Vectorised reference selection: for each back-offset o in [1, W], compare
        # value i with value i-o across the whole array at once, tracking the
        # reference that minimises meaningful bits. Iterating o ascending with a
        # strict '<' keeps the most-recent reference on ties. This replaces a
        # per-value window scan (O(n*W) numpy calls) with W whole-array passes.
        best_m = np.full(n, 65, dtype=np.int64)       # 65 > any real count (<=64)
        best_d = np.zeros(n, dtype=np.int64)
        prev_m = np.zeros(n, dtype=np.int64)          # meaningful bits vs previous
        for o in range(1, W + 1):
            if o >= n:
                break
            m_o = meaningful_counts(vb[o:] ^ vb[:-o])  # aligns i with i-o, i>=o
            idx = np.arange(o, n)
            if o == 1:
                prev_m[idx] = m_o
            better = m_o < best_m[idx]
            sel = idx[better]
            best_m[sel] = m_o[better]
            best_d[sel] = o - 1                        # distance-from-recent

        for i in range(1, n):
            x = int(vb[i])
            d_best = int(best_d[i])
            m_best = int(best_m[i])

            xorp = int(vb[i - 1] ^ vb[i])
            if xorp == 0:
                bw.write_bits(0b00, 2)
            elif m_best == 0 and d_best > 0:
                bw.write_bits(0b01, 2)
                bw.write_bits(d_best, self.IDX_BITS)
            else:
                m_prev = int(prev_m[i])
                if d_best > 0 and (self.IDX_BITS + m_best) < m_prev:
                    ref = int(vb[i - 1 - d_best])
                    xor = ref ^ x
                    lead = clz64(xor)
                    trail = ctz64(xor)
                    mlen = 64 - lead - trail
                    bw.write_bits(0b11, 2)
                    bw.write_bits(d_best, self.IDX_BITS)
                    bw.write_bits(lead, 6)
                    bw.write_bits(mlen & 0x3F, 6)
                    bw.write_bits((xor >> trail) & ((1 << mlen) - 1), mlen)
                else:
                    xor = xorp
                    lead = clz64(xor)
                    trail = ctz64(xor)
                    mlen = 64 - lead - trail
                    bw.write_bits(0b10, 2)
                    bw.write_bits(lead, 6)
                    bw.write_bits(mlen & 0x3F, 6)
                    bw.write_bits((xor >> trail) & ((1 << mlen) - 1), mlen)
        return bw.getbytes()

    def decode(self, data: bytes) -> np.ndarray:
        br = BitReader(data)
        n = br.read_bits(32)
        out = np.zeros(n, dtype=np.float64)
        if n == 0:
            return out
        outb = out.view(np.uint64)
        outb[0] = np.uint64(br.read_bits(64))
        for i in range(1, n):
            flag = br.read_bits(2)
            if flag == 0b00:
                x = int(outb[i - 1])
            elif flag == 0b01:
                d = br.read_bits(self.IDX_BITS)
                x = int(outb[i - 1 - d])
            elif flag == 0b10:
                lead = br.read_bits(6)
                mlen = br.read_bits(6)
                if mlen == 0:
                    mlen = 64
                meaningful = br.read_bits(mlen)
                trail = 64 - lead - mlen
                x = int(outb[i - 1]) ^ (meaningful << trail)
            else:  # 0b11
                d = br.read_bits(self.IDX_BITS)
                lead = br.read_bits(6)
                mlen = br.read_bits(6)
                if mlen == 0:
                    mlen = 64
                meaningful = br.read_bits(mlen)
                trail = 64 - lead - mlen
                x = int(outb[i - 1 - d]) ^ (meaningful << trail)
            outb[i] = np.uint64(x)
        return out


# ---------------------------------------------------------------------------
# BASELINE C: Elf+ (simplified) -- per-block predictor + residual-length coding
# ---------------------------------------------------------------------------
class ElfPlusCodec:
    """Simplified Elf+: split into blocks, pick the predictor (P0/P1/P2) that
    minimises total encoded residual length, then code each residual with
    leading/trailing-zero elimination.

    Block layout: predictor id (2b), then per residual:
        0                                  -> residual == 0
        1 | lead:6 | mlen:6 | meaningful   -> non-zero residual
    """

    def __init__(self, block_size: int = 128):
        self.N = block_size

    @staticmethod
    def _block_cost(res: np.ndarray) -> int:
        m = meaningful_counts(res)
        nz = m > 0
        n_nz = int(np.count_nonzero(nz))
        n_z = res.shape[0] - n_nz
        return n_z * 1 + n_nz * (1 + 12) + int(m[nz].sum())

    def encode(self, values: np.ndarray,
               predbits: tuple[np.ndarray, np.ndarray, np.ndarray] | None = None) -> bytes:
        v = values.astype(np.float64, copy=False)
        vb = v.view(np.uint64)
        n = vb.shape[0]
        if predbits is None:
            predbits = build_prediction_bits(v)
        p_all = predbits

        bw = BitWriter()
        bw.write_bits(n, 32)
        bw.write_bits(self.N, 16)

        N = self.N
        for s in range(0, n, N):
            e = min(s + N, n)
            best = None  # (cost, pid, res)
            for pid in range(3):
                res = vb[s:e] ^ p_all[pid][s:e]
                cost = self._block_cost(res)
                if best is None or cost < best[0]:
                    best = (cost, pid, res)
            _, pid, res = best
            bw.write_bits(pid, 2)
            for r in res.tolist():
                r = int(r)
                if r == 0:
                    bw.write_bit(0)
                else:
                    lead = clz64(r)
                    trail = ctz64(r)
                    mlen = 64 - lead - trail
                    bw.write_bit(1)
                    bw.write_bits(lead, 6)
                    bw.write_bits(mlen & 0x3F, 6)
                    bw.write_bits((r >> trail) & ((1 << mlen) - 1), mlen)
        return bw.getbytes()

    def decode(self, data: bytes) -> np.ndarray:
        br = BitReader(data)
        n = br.read_bits(32)
        N = br.read_bits(16)
        out = np.zeros(n, dtype=np.float64)
        outb = out.view(np.uint64)
        i = 0
        for s in range(0, n, N):
            e = min(s + N, n)
            blen = e - s
            pid = br.read_bits(2)
            for _ in range(blen):
                if br.read_bit() == 0:
                    r = 0
                else:
                    lead = br.read_bits(6)
                    mlen = br.read_bits(6)
                    if mlen == 0:
                        mlen = 64
                    meaningful = br.read_bits(mlen)
                    trail = 64 - lead - mlen
                    r = meaningful << trail
                pbits = _pred_bits_scalar(pid, out, i)
                outb[i] = np.uint64(r ^ pbits)
                i += 1
        return out


# ---------------------------------------------------------------------------
# BASELINE D: DEFLATE / zlib
# ---------------------------------------------------------------------------
class ZlibCodec:
    def encode(self, values: np.ndarray) -> bytes:
        raw = values.astype(np.float64, copy=False).tobytes()
        return zlib.compress(raw, level=9)

    def decode(self, data: bytes) -> np.ndarray:
        return np.frombuffer(zlib.decompress(data), dtype=np.float64).copy()


# ---------------------------------------------------------------------------
# Test data
# ---------------------------------------------------------------------------
def generate_datasets(n: int = 100_000) -> dict[str, np.ndarray]:
    rng = np.random.default_rng(SEED)
    np.random.seed(SEED)

    constant = np.full(n, 3.14159, dtype=np.float64)
    ramp = np.linspace(0.0, 100.0, n, dtype=np.float64)
    walk = np.cumsum(rng.normal(0.0, 0.1, n)).astype(np.float64)
    sine = np.sin(np.linspace(0.0, 50.0 * np.pi, n)).astype(np.float64)

    # Industrial sensor: sinusoid + random spikes + flat plateaus.
    mixed = sine.copy()
    spike_idx = rng.integers(0, n, size=max(1, n // 500))
    mixed[spike_idx] += rng.normal(0.0, 5.0, spike_idx.shape[0])
    for _ in range(max(1, n // 5000)):
        start = int(rng.integers(0, n - 50))
        length = int(rng.integers(20, 200))
        end = min(n, start + length)
        mixed[start:end] = mixed[start]

    return {
        "Constant": constant,
        "LinearRamp": ramp,
        "RandomWalk": walk,
        "Sinusoidal": sine,
        "MixedStep": mixed,
    }


def edge_case_dataset() -> np.ndarray:
    """Adversarial array exercising NaN, +/-inf and -0.0 alongside normals."""
    base = [0.0, -0.0, 1.0, -1.0, np.inf, -np.inf, np.nan,
            3.14159, 2.71828, 1e-300, 1e300, -0.0, np.nan, 42.0, 0.0]
    # Include a NaN with a non-canonical payload to stress bit-exactness.
    weird_nan = struct.unpack("<d", struct.pack("<Q", 0x7FF8_0000_DEAD_BEEF))[0]
    arr = np.array(base + [weird_nan] * 5 + base, dtype=np.float64)
    return arr


# ---------------------------------------------------------------------------
# Round-trip verification (bit-exact, handles NaN/inf/-0.0)
# ---------------------------------------------------------------------------
def assert_lossless(original: np.ndarray, decoded: np.ndarray, label: str) -> None:
    assert decoded.shape == original.shape, (
        f"{label}: shape mismatch {decoded.shape} != {original.shape}")
    ob = original.astype(np.float64, copy=False).view(np.uint64)
    db = decoded.astype(np.float64, copy=False).view(np.uint64)
    if not np.array_equal(ob, db):
        bad = int(np.argmax(ob != db))
        raise AssertionError(
            f"{label}: LOSSLESS CHECK FAILED at index {bad}: "
            f"0x{int(ob[bad]):016x} != 0x{int(db[bad]):016x}")


# ---------------------------------------------------------------------------
# Benchmark driver
# ---------------------------------------------------------------------------
def time_call(fn, *args):
    t0 = time.perf_counter()
    result = fn(*args)
    return result, time.perf_counter() - t0


def bench_codec(name, encode_fn, decode_fn, values):
    uncompressed = values.size * 8
    comp, enc_t = time_call(encode_fn, values)
    decoded, dec_t = time_call(decode_fn, comp)
    assert_lossless(values, decoded, name)

    size = len(comp)
    bpv = (size * 8) / values.size
    ratio = uncompressed / size if size else float("inf")
    enc_mbps = (uncompressed / 1e6) / enc_t if enc_t > 0 else float("inf")
    dec_mbps = (uncompressed / 1e6) / dec_t if dec_t > 0 else float("inf")
    return {
        "codec": name,
        "compressed_bytes": size,
        "bpv": bpv,
        "ratio": ratio,
        "encode_mbps": enc_mbps,
        "decode_mbps": dec_mbps,
        "encode_s": enc_t,
        "decode_s": dec_t,
    }


def run_invention(values, predbits):
    """Evaluate the Invention at N in {64,128,256}, pick the smallest output,
    then round-trip only the chosen block size (fair + fast)."""
    best = None
    for N in (64, 128, 256):
        codec = InventionCodec(N)
        comp, enc_t = time_call(codec.encode, values, predbits)
        if best is None or len(comp) < best["compressed_bytes"]:
            best = {"N": N, "comp": comp, "enc_t": enc_t,
                    "compressed_bytes": len(comp), "codec": codec}
    codec = best["codec"]
    decoded, dec_t = time_call(codec.decode, best["comp"])
    assert_lossless(values, decoded, f"Invention(N={best['N']})")

    uncompressed = values.size * 8
    size = best["compressed_bytes"]
    return {
        "codec": "Invention",
        "block_size": best["N"],
        "compressed_bytes": size,
        "bpv": (size * 8) / values.size,
        "ratio": uncompressed / size if size else float("inf"),
        "encode_mbps": (uncompressed / 1e6) / best["enc_t"] if best["enc_t"] > 0 else float("inf"),
        "decode_mbps": (uncompressed / 1e6) / dec_t if dec_t > 0 else float("inf"),
        "encode_s": best["enc_t"],
        "decode_s": dec_t,
    }


def benchmark_dataset(name, values):
    predbits = build_prediction_bits(values.astype(np.float64, copy=False))
    results = []
    results.append(run_invention(values, predbits))

    gor = GorillaCodec()
    results.append(bench_codec("Gorilla", gor.encode, gor.decode, values))

    chi = Chimp128Codec()
    results.append(bench_codec("Chimp128", chi.encode, chi.decode, values))

    elf = ElfPlusCodec(128)
    results.append(bench_codec(
        "Elf+", lambda v: elf.encode(v, predbits), elf.decode, values))

    zl = ZlibCodec()
    results.append(bench_codec("Zlib", zl.encode, zl.decode, values))
    return results


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------
def fmt(x, nd=3):
    if x == float("inf"):
        return "inf"
    return f"{x:.{nd}f}"


def print_markdown(all_results):
    print("\n# [MEASURE] Compression Benchmark Results\n")
    for name, results in all_results.items():
        print(f"## Dataset: {name}\n")
        print("| Codec | Size (B) | BPV | Ratio | Enc MB/s | Dec MB/s |")
        print("|-------|---------:|----:|------:|---------:|---------:|")
        for r in results:
            label = r["codec"]
            if r["codec"] == "Invention":
                label = f"Invention (N={r['block_size']})"
            print(f"| {label} | {r['compressed_bytes']} | {fmt(r['bpv'])} | "
                  f"{fmt(r['ratio'])} | {fmt(r['encode_mbps'],1)} | {fmt(r['decode_mbps'],1)} |")
        print()


def print_verdict(all_results):
    print("\n# Final Verdict: Invention vs Elf+\n")
    header = ("| Dataset | Invention BPV | Elf+ BPV | Improvement % | "
              "Invention Dec (MB/s) | Elf+ Dec (MB/s) | Speedup |")
    print(header)
    print("|---------|--------------:|---------:|--------------:|"
          "---------------------:|----------------:|--------:|")

    improvements = []
    speedups = []
    for name, results in all_results.items():
        inv = next(r for r in results if r["codec"] == "Invention")
        elf = next(r for r in results if r["codec"] == "Elf+")
        improvement = ((elf["bpv"] - inv["bpv"]) / elf["bpv"] * 100.0) if elf["bpv"] else 0.0
        speedup = (inv["decode_mbps"] / elf["decode_mbps"]) if elf["decode_mbps"] else float("inf")
        improvements.append(improvement)
        speedups.append(speedup)
        print(f"| {name} | {fmt(inv['bpv'])} | {fmt(elf['bpv'])} | "
              f"{improvement:+.1f}% | {fmt(inv['decode_mbps'],1)} | "
              f"{fmt(elf['decode_mbps'],1)} | {fmt(speedup,2)}x |")

    mean_impr = float(np.mean(improvements))
    mean_speed = float(np.mean(speedups))
    print(f"\n**Mean BPV improvement vs Elf+:** {mean_impr:+.2f}%")
    print(f"**Mean decode speedup vs Elf+:** {mean_speed:.2f}x")
    return mean_impr, mean_speed


def save_outputs(all_results, mean_impr, mean_speed, outdir):
    json_path = os.path.join(outdir, "benchmark_results.json")
    csv_path = os.path.join(outdir, "benchmark_results.csv")

    payload = {
        "seed": SEED,
        "summary": {
            "mean_bpv_improvement_pct_vs_elf": mean_impr,
            "mean_decode_speedup_vs_elf": mean_speed,
        },
        "datasets": all_results,
    }
    with open(json_path, "w") as fh:
        json.dump(payload, fh, indent=2)

    with open(csv_path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["dataset", "codec", "block_size", "compressed_bytes",
                    "bpv", "ratio", "encode_mbps", "decode_mbps",
                    "encode_s", "decode_s"])
        for name, results in all_results.items():
            for r in results:
                w.writerow([name, r["codec"], r.get("block_size", ""),
                            r["compressed_bytes"], f"{r['bpv']:.6f}",
                            f"{r['ratio']:.6f}", f"{r['encode_mbps']:.4f}",
                            f"{r['decode_mbps']:.4f}", f"{r['encode_s']:.6f}",
                            f"{r['decode_s']:.6f}"])
    return json_path, csv_path


# ---------------------------------------------------------------------------
# Edge-case gate (losslessness on NaN / inf / -0.0)
# ---------------------------------------------------------------------------
def run_edge_case_gate():
    edge = edge_case_dataset()
    predbits = build_prediction_bits(edge)
    codecs = [
        ("Invention(N=64)", lambda v: InventionCodec(64).encode(v, predbits),
         lambda d: InventionCodec(64).decode(d)),
        ("Invention(N=128)", lambda v: InventionCodec(128).encode(v, predbits),
         lambda d: InventionCodec(128).decode(d)),
        ("Gorilla", GorillaCodec().encode, GorillaCodec().decode),
        ("Chimp128", Chimp128Codec().encode, Chimp128Codec().decode),
        ("Elf+", lambda v: ElfPlusCodec(128).encode(v, predbits),
         ElfPlusCodec(128).decode),
        ("Zlib", ZlibCodec().encode, ZlibCodec().decode),
    ]
    print("Edge-case round-trip (NaN / +/-inf / -0.0 / non-canonical NaN):")
    for name, enc, dec in codecs:
        decoded = dec(enc(edge))
        assert_lossless(edge, decoded, f"[edge] {name}")
        print(f"  [OK] {name}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=str, default=None,
                        help="Raw binary file of little-endian float64 values "
                             "to benchmark (e.g. an FCBench dump).")
    parser.add_argument("--samples", type=int, default=100_000,
                        help="Samples per synthetic dataset (default 100000).")
    parser.add_argument("--outdir", type=str, default=".",
                        help="Directory for JSON/CSV outputs.")
    args = parser.parse_args(argv)

    np.random.seed(SEED)
    t_start = time.perf_counter()

    print("=" * 72)
    print("Lossless Floating-Point Compression Benchmark Harness")
    print("=" * 72)
    print()

    run_edge_case_gate()

    if args.file:
        raw = np.fromfile(args.file, dtype=np.float64)
        if raw.size == 0:
            print(f"ERROR: {args.file} contained no float64 values.", file=sys.stderr)
            return 2
        datasets = {f"file:{os.path.basename(args.file)}": raw}
        print(f"Loaded {raw.size} float64 values from {args.file}\n")
    else:
        datasets = generate_datasets(args.samples)
        print(f"Generated {len(datasets)} synthetic datasets "
              f"({args.samples} samples each)\n")

    all_results = {}
    for name, values in datasets.items():
        print(f"  running codecs on {name} ...", flush=True)
        all_results[name] = benchmark_dataset(name, values)

    print_markdown(all_results)
    mean_impr, mean_speed = print_verdict(all_results)

    json_path, csv_path = save_outputs(all_results, mean_impr, mean_speed, args.outdir)
    print(f"\nRaw results written to:\n  {json_path}\n  {csv_path}")

    # Section 7.8.1 viability threshold.
    print("\n" + "=" * 72)
    viable = (mean_impr > 5.0) or (mean_speed > 3.0)
    if viable:
        print("[STATUS: VIABLE - PROCEED WITH PATENT FILING]")
    else:
        print("[STATUS: NOT VIABLE - REFINE ALGORITHM OR DO NOT FILE]")
    print(f"  (threshold: BPV improvement > 5%  OR  decode speedup > 3x)")
    print(f"  observed: mean improvement {mean_impr:+.2f}%, "
          f"mean speedup {mean_speed:.2f}x")
    print("=" * 72)

    print(f"\nTotal wall-clock: {time.perf_counter() - t_start:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
