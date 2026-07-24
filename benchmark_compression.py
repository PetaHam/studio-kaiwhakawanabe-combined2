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
  5. Emits the [MEASURE] table (Markdown + CSV + JSON) and a median-based
     verdict against the patent viability threshold.
  6. Runs a stage-attribution ablation that toggles each pipeline stage
     (predictor selection, bit-plane transpose, occupancy mask) in isolation,
     quantifying how many BPV each stage actually contributes -- evidence for
     which parts of the pipeline carry the novelty (--no-ablation to skip).

Baselines fall into two tiers:
  * Cited prior art (self-contained, numpy+stdlib): Gorilla, Chimp128, Elf+,
    and DEFLATE/zlib.
  * Real-world state of the art (optional, imported only if installed):
    Zstandard (level 22), LZ4-hc, and Blosc2 with the BITSHUFFLE filter. These
    are the codecs the Invention must actually beat to be defensible. Blosc2's
    bitshuffle is the closest prior art to the Invention's bit-plane transpose,
    so it is the honest bar for the core claim.

Reporting uses the MEDIAN (not the mean) so a single trivially-compressible
corpus cannot inflate the headline, and counts the corpora the Invention
actually wins. The viability threshold (Section 7.8.1) is a median BPV
improvement over the BEST prior-art baseline plus a majority of corpora won.
The decode-speedup claim has been REMOVED from the criterion: the pure-Python
decoders are slower than the compiled C baselines, so throughput is reported
for information only and must not be quoted as a performance claim.

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

# Optional real-world state-of-the-art lossless baselines. The core harness is
# self-contained (numpy + stdlib); these extend the comparison to the codecs a
# float-compression patent must actually out-perform to be defensible. They are
# imported opportunistically and skipped cleanly when not installed.
try:
    import zstandard as _zstd
    _HAVE_ZSTD = True
except ImportError:
    _HAVE_ZSTD = False
try:
    import lz4.frame as _lz4frame
    _HAVE_LZ4 = True
except ImportError:
    _HAVE_LZ4 = False
try:
    import blosc2 as _blosc2
    _HAVE_BLOSC2 = True
except ImportError:
    _HAVE_BLOSC2 = False

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

    def __init__(self, block_size: int = 128, fixed_pid: int | None = None,
                 use_mask: bool = True):
        assert block_size in (64, 128, 256)
        self.N = block_size
        # Ablation toggles:
        #   fixed_pid : force a single predictor (0/1/2) instead of best-of-3,
        #               to isolate the value of per-block predictor SELECTION.
        #   use_mask  : when False, every one of the 64 bit-planes is emitted
        #               (no occupancy mask, no plane skipping), to isolate the
        #               value of the OCCUPANCY MASK -- the bit-plane transpose
        #               on its own is a pure permutation and cannot compress.
        self.fixed_pid = fixed_pid
        self.use_mask = use_mask

    def _select(self, vb, p_all, s, e, blen):
        if self.fixed_pid is not None:
            pid = self.fixed_pid
            res = vb[s:e] ^ p_all[pid][s:e]
            mask = int(np.bitwise_or.reduce(res)) if blen else 0
            return pid, res, mask
        best = None  # (cost, pid, residuals, mask)
        for pid in range(3):
            res = vb[s:e] ^ p_all[pid][s:e]
            mask = int(np.bitwise_or.reduce(res)) if blen else 0
            cost = bin(mask).count("1")
            if best is None or cost < best[0]:
                best = (cost, pid, res, mask)
        return best[1], best[2], best[3]

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
            pid, res, mask = self._select(vb, p_all, s, e, blen)

            bw.write_bits(pid, 8)
            if self.use_mask:
                bw.write_bits(mask, 64)
                emit_mask = mask
            else:
                # No mask stored; every plane is emitted regardless of content.
                emit_mask = (1 << 64) - 1

            # Emit planes, each exactly `blen` bits, MSB = res[0].
            npad = (blen + 7) // 8
            shift = npad * 8 - blen
            for k in range(64):
                if (emit_mask >> k) & 1:
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
            if self.use_mask:
                mask = br.read_bits(64)
            else:
                mask = (1 << 64) - 1

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

    def __init__(self, block_size: int = 128, fixed_pid: int | None = None):
        self.N = block_size
        # fixed_pid forces one predictor (ablation): isolates predictor SELECTION.
        self.fixed_pid = fixed_pid

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
            if self.fixed_pid is not None:
                pid = self.fixed_pid
                res = vb[s:e] ^ p_all[pid][s:e]
            else:
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
# EXTENDED BASELINES: real-world state of the art (optional)
# ---------------------------------------------------------------------------
class ZstdCodec:
    """Zstandard at maximum level -- the general-purpose lossless benchmark."""

    LEVEL = 22

    def encode(self, values: np.ndarray) -> bytes:
        raw = values.astype(np.float64, copy=False).tobytes()
        return _zstd.ZstdCompressor(level=self.LEVEL).compress(raw)

    def decode(self, data: bytes) -> np.ndarray:
        raw = _zstd.ZstdDecompressor().decompress(data)
        return np.frombuffer(raw, dtype=np.float64).copy()


class Lz4Codec:
    """LZ4 (high-compression frame mode) -- the speed-oriented benchmark."""

    def encode(self, values: np.ndarray) -> bytes:
        raw = values.astype(np.float64, copy=False).tobytes()
        return _lz4frame.compress(raw, compression_level=16)

    def decode(self, data: bytes) -> np.ndarray:
        return np.frombuffer(_lz4frame.decompress(data), dtype=np.float64).copy()


class Blosc2Codec:
    """Blosc2 with the BITSHUFFLE filter + Zstd. This is the closest prior art
    to the Invention's bit-plane transposition: bitshuffle rearranges data by
    bit position across the array (a bit-plane transpose) before entropy coding.
    Beating this is the real bar for the Invention's core claim."""

    def encode(self, values: np.ndarray) -> bytes:
        arr = np.ascontiguousarray(values, dtype=np.float64)
        cparams = _blosc2.CParams(
            clevel=9,
            codec=_blosc2.Codec.ZSTD,
            filters=[_blosc2.Filter.BITSHUFFLE],
        )
        return _blosc2.pack_array2(arr, cparams=cparams)

    def decode(self, data: bytes) -> np.ndarray:
        return np.asarray(_blosc2.unpack_array2(data), dtype=np.float64)


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

    if _HAVE_ZSTD:
        zs = ZstdCodec()
        results.append(bench_codec("Zstd-22", zs.encode, zs.decode, values))
    if _HAVE_LZ4:
        l4 = Lz4Codec()
        results.append(bench_codec("LZ4-hc", l4.encode, l4.decode, values))
    if _HAVE_BLOSC2:
        bl = Blosc2Codec()
        results.append(bench_codec("Blosc2-bitshuffle", bl.encode, bl.decode, values))
    return results


# ---------------------------------------------------------------------------
# Stage-attribution ablation
# ---------------------------------------------------------------------------
# Block size held fixed for a controlled comparison of the transpose configs.
ABLATION_N = 64
# The ablation round-trips five codec variants per corpus; BPV is essentially
# scale-invariant for these signals, so it runs on a bounded prefix to stay
# fast while remaining representative (and every variant is still verified
# bit-exact on that prefix).
ABLATION_SAMPLES = 25_000

# key, human label, codec factory. Each codec exposes encode(values, predbits)
# and decode(bytes). The configs toggle exactly one pipeline stage at a time.
ABLATION_CONFIGS = [
    ("pred_p0_pv",   "P0 - per-value",
     lambda: ElfPlusCodec(128, fixed_pid=0)),
    ("pred_best_pv", "best-pred - per-value (=Elf+)",
     lambda: ElfPlusCodec(128, fixed_pid=None)),
    ("tp_nomask",    "best-pred - transpose, NO mask",
     lambda: InventionCodec(ABLATION_N, fixed_pid=None, use_mask=False)),
    ("tpmask_p0",    "P0 - transpose+mask",
     lambda: InventionCodec(ABLATION_N, fixed_pid=0, use_mask=True)),
    ("tpmask_best",  "best-pred - transpose+mask (Invention)",
     lambda: InventionCodec(ABLATION_N, fixed_pid=None, use_mask=True)),
]


def run_ablation(datasets):
    """For each corpus, encode+decode under each single-stage-toggled config and
    record BPV (bit-exact round-trip asserted for every config). Runs on a
    bounded prefix of each corpus (see ABLATION_SAMPLES)."""
    table = {}
    sample_size = 0
    for name, values in datasets.items():
        sub = values[:ABLATION_SAMPLES]
        sample_size = max(sample_size, sub.size)
        predbits = build_prediction_bits(sub.astype(np.float64, copy=False))
        row = {}
        for key, _label, factory in ABLATION_CONFIGS:
            codec = factory()
            comp = codec.encode(sub, predbits)
            decoded = codec.decode(comp)
            assert_lossless(sub, decoded, f"[ablation:{key}] {name}")
            row[key] = (len(comp) * 8) / sub.size
        table[name] = row
    return sample_size, table


def print_ablation(sample_size, table):
    labels = {k: lbl for k, lbl, _ in ABLATION_CONFIGS}
    keys = [k for k, _, _ in ABLATION_CONFIGS]

    print(f"\n# Stage-Attribution Ablation (BPV; block size N={ABLATION_N}, "
          f"{sample_size}-sample prefix, controlled)\n")
    print("Each column toggles ONE stage of the Invention pipeline, so the "
          "contribution of predictor selection, the bit-plane transpose and "
          "the occupancy mask can be read off directly. Reference: raw float64 "
          "= 64.00 BPV.\n")
    print("| Dataset | " + " | ".join(labels[k] for k in keys) + " |")
    print("|" + "---|" * (len(keys) + 1))
    for name, row in table.items():
        print("| " + name + " | " + " | ".join(fmt(row[k]) for k in keys) + " |")

    def med(fn):
        return float(np.median([fn(r) for r in table.values()]))

    # Positive BPV delta => that stage REDUCES size (helps).
    pred_sel_pv = med(lambda r: r["pred_p0_pv"] - r["pred_best_pv"])
    pred_sel_tp = med(lambda r: r["tpmask_p0"] - r["tpmask_best"])
    mask_gain = med(lambda r: r["tp_nomask"] - r["tpmask_best"])
    tp_vs_pv = med(lambda r: r["pred_best_pv"] - r["tpmask_best"])

    print("\n**Per-stage contribution (median BPV reduction across corpora; "
          "positive = the stage helps):**\n")
    print(f"- Predictor SELECTION, per-value coder     : {pred_sel_pv:+.2f} BPV")
    print(f"- Predictor SELECTION, transpose coder     : {pred_sel_tp:+.2f} BPV")
    print(f"- OCCUPANCY MASK vs emitting all 64 planes : {mask_gain:+.2f} BPV")
    print(f"- Transpose+mask vs per-value coding (same predictor): "
          f"{tp_vs_pv:+.2f} BPV")
    print("\nReading: the bit-plane transpose on its own is a permutation and "
          "compresses nothing (the 'NO mask' column sits at ~64 BPV); its entire "
          "benefit is realised through the occupancy mask. The transpose+mask "
          "vs per-value delta is the Invention's genuinely novel contribution "
          "over Elf+-style coding -- positive only where it is positive above.")
    return {
        "block_size": ABLATION_N,
        "sample_size": sample_size,
        "per_dataset_bpv": table,
        "median_stage_contribution_bpv": {
            "predictor_selection_per_value": pred_sel_pv,
            "predictor_selection_transpose": pred_sel_tp,
            "occupancy_mask": mask_gain,
            "transpose_mask_vs_per_value": tp_vs_pv,
        },
    }


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


def _dist(values):
    """min / median / mean / max of a list, robust to emptiness."""
    if not values:
        return {"min": 0.0, "median": 0.0, "mean": 0.0, "max": 0.0}
    a = np.asarray(values, dtype=np.float64)
    return {"min": float(a.min()), "median": float(np.median(a)),
            "mean": float(a.mean()), "max": float(a.max())}


def compute_verdict_stats(all_results):
    """Per-dataset comparison of the Invention against (i) Elf+ (the patent's
    cited closest prior art) and (ii) the single best-performing prior-art
    lossless baseline present in the run (which may be Blosc2/Zstd). Returns a
    stats dict driven by the MEDIAN, not the mean, so a single easy corpus
    (e.g. Constant) cannot dominate the headline number."""
    per_dataset = []
    impr_vs_elf = []
    impr_vs_best = []
    wins_vs_elf = 0
    wins_vs_best = 0

    for name, results in all_results.items():
        inv = next(r for r in results if r["codec"] == "Invention")
        elf = next(r for r in results if r["codec"] == "Elf+")
        priors = [r for r in results if r["codec"] != "Invention"]
        best = min(priors, key=lambda r: r["bpv"])

        e = ((elf["bpv"] - inv["bpv"]) / elf["bpv"] * 100.0) if elf["bpv"] else 0.0
        b = ((best["bpv"] - inv["bpv"]) / best["bpv"] * 100.0) if best["bpv"] else 0.0
        impr_vs_elf.append(e)
        impr_vs_best.append(b)
        wins_vs_elf += int(inv["bpv"] < elf["bpv"])
        wins_vs_best += int(inv["bpv"] < best["bpv"])
        per_dataset.append({
            "dataset": name,
            "invention_bpv": inv["bpv"],
            "elf_bpv": elf["bpv"],
            "improvement_vs_elf_pct": e,
            "best_baseline": best["codec"],
            "best_baseline_bpv": best["bpv"],
            "improvement_vs_best_pct": b,
        })

    n = len(per_dataset)
    return {
        "n_datasets": n,
        "per_dataset": per_dataset,
        "improvement_vs_elf": _dist(impr_vs_elf),
        "improvement_vs_best_baseline": _dist(impr_vs_best),
        "wins_vs_elf": wins_vs_elf,
        "wins_vs_best_baseline": wins_vs_best,
    }


def print_verdict(all_results, stats):
    print("\n# Final Verdict: Invention vs Prior Art\n")
    print("Improvement % is BPV reduction (positive = Invention smaller). "
          "'Best baseline' is the single strongest prior-art lossless codec "
          "for that corpus.\n")
    print("| Dataset | Invention BPV | Elf+ BPV | vs Elf+ | Best baseline | "
          "Best BPV | vs Best |")
    print("|---------|--------------:|---------:|--------:|---------------|"
          "---------:|--------:|")
    for d in stats["per_dataset"]:
        print(f"| {d['dataset']} | {fmt(d['invention_bpv'])} | "
              f"{fmt(d['elf_bpv'])} | {d['improvement_vs_elf_pct']:+.1f}% | "
              f"{d['best_baseline']} | {fmt(d['best_baseline_bpv'])} | "
              f"{d['improvement_vs_best_pct']:+.1f}% |")

    n = stats["n_datasets"]
    e = stats["improvement_vs_elf"]
    b = stats["improvement_vs_best_baseline"]
    print(f"\n**BPV improvement vs Elf+ (cited prior art):** "
          f"median {e['median']:+.2f}%  (mean {e['mean']:+.2f}%, "
          f"range {e['min']:+.1f}%..{e['max']:+.1f}%); "
          f"Invention wins {stats['wins_vs_elf']}/{n} corpora.")
    print(f"**BPV improvement vs best prior-art baseline:** "
          f"median {b['median']:+.2f}%  (mean {b['mean']:+.2f}%, "
          f"range {b['min']:+.1f}%..{b['max']:+.1f}%); "
          f"Invention wins {stats['wins_vs_best_baseline']}/{n} corpora.")


def print_throughput_note(all_results):
    """Decode throughput is an informational, PYTHON-RELATIVE micro-benchmark
    only. It is NOT part of the viability criterion and must not be quoted as a
    performance claim: the Invention/Elf+/Gorilla/Chimp decoders are pure-Python
    scalar loops, whereas Zstd/LZ4/Blosc2/Zlib call optimised C. A real speed
    claim requires a compiled implementation."""
    print("\n## Decode throughput (informational; Python-relative, NOT a claim)\n")
    print("| Dataset | " + " | ".join(
        c for c in _codec_order(all_results)) + " |")
    print("|" + "---|" * (1 + len(_codec_order(all_results))))
    for name, results in all_results.items():
        by = {r["codec"]: r for r in results}
        row = [name]
        for c in _codec_order(all_results):
            row.append(fmt(by[c]["decode_mbps"], 1) if c in by else "-")
        print("| " + " | ".join(row) + " |")


def _codec_order(all_results):
    first = next(iter(all_results.values()))
    return [r["codec"] for r in first]


def save_outputs(all_results, stats, verdict, ablation, outdir):
    json_path = os.path.join(outdir, "benchmark_results.json")
    csv_path = os.path.join(outdir, "benchmark_results.csv")

    payload = {
        "seed": SEED,
        "verdict": verdict,
        "summary_statistics": stats,
        "ablation": ablation,
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
    if _HAVE_ZSTD:
        codecs.append(("Zstd-22", ZstdCodec().encode, ZstdCodec().decode))
    if _HAVE_LZ4:
        codecs.append(("LZ4-hc", Lz4Codec().encode, Lz4Codec().decode))
    if _HAVE_BLOSC2:
        codecs.append(("Blosc2-bitshuffle", Blosc2Codec().encode, Blosc2Codec().decode))
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
    parser.add_argument("--no-ablation", action="store_true",
                        help="Skip the stage-attribution ablation study.")
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
    stats = compute_verdict_stats(all_results)
    print_verdict(all_results, stats)
    print_throughput_note(all_results)

    ablation = None
    if not args.no_ablation:
        print("\n  running stage-attribution ablation ...", flush=True)
        abl_size, abl_table = run_ablation(datasets)
        ablation = print_ablation(abl_size, abl_table)

    # Section 7.8.1 viability threshold.
    #
    # The criterion is now a MEDIAN compression-ratio improvement, and the
    # relevant comparison is against the *best* prior-art lossless baseline in
    # the run -- not merely Elf+. A patent examiner will cite the strongest
    # available prior art (which, for the bit-plane idea, includes Blosc2's
    # bitshuffle filter), so beating only a weaker baseline is not sufficient.
    # The decode-speedup claim has been removed: it is not supported (the
    # pure-Python decoders are slower than the C baselines), so it cannot carry
    # the verdict. A speed claim would require a compiled implementation.
    med_vs_best = stats["improvement_vs_best_baseline"]["median"]
    med_vs_elf = stats["improvement_vs_elf"]["median"]
    n = stats["n_datasets"]
    majority_best = stats["wins_vs_best_baseline"] > n / 2
    viable = (med_vs_best > 5.0) and majority_best

    verdict = {
        "criterion": "median BPV improvement vs BEST prior-art baseline > 5% "
                     "AND Invention wins a majority of corpora",
        "median_improvement_vs_best_baseline_pct": med_vs_best,
        "median_improvement_vs_elf_pct": med_vs_elf,
        "wins_vs_best_baseline": stats["wins_vs_best_baseline"],
        "n_datasets": n,
        "viable": bool(viable),
    }

    json_path, csv_path = save_outputs(all_results, stats, verdict, ablation, args.outdir)
    print(f"\nRaw results written to:\n  {json_path}\n  {csv_path}")

    print("\n" + "=" * 72)
    if viable:
        print("[STATUS: VIABLE - PROCEED WITH PATENT FILING]")
    else:
        print("[STATUS: NOT VIABLE - REFINE ALGORITHM OR DO NOT FILE]")
    print("  (threshold 7.8.1: median BPV improvement vs BEST prior-art "
          "baseline > 5%\n   AND Invention wins a majority of corpora)")
    print(f"  observed: median improvement vs best baseline {med_vs_best:+.2f}% "
          f"(wins {stats['wins_vs_best_baseline']}/{n});\n"
          f"            median improvement vs Elf+ {med_vs_elf:+.2f}% "
          f"(cited prior art, for reference)")
    print("=" * 72)

    print(f"\nTotal wall-clock: {time.perf_counter() - t_start:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
