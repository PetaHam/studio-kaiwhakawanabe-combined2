'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  Firestore,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserSelection {
  userId: string;
  eventId: string;
  picks: string[]; // ordered array of roopu IDs, index 0 = rank 1
  submittedAt: Date | null;
  scored: boolean;
  shardsEarned: number;
  accuracy: number; // 0-100
  sharedToParty: boolean;
  sharedToGlobal: boolean;
}

export interface EventResult {
  officialQualifiers: string[]; // ordered array of roopu IDs, index 0 = 1st place
  qualifierCount: number;
  resultsPublishedAt?: Date;
}

export interface SelectionScore {
  shards: number;
  accuracy: number; // 0-100
  exactMatches: number;
  correctPicks: number;
  maxScore: number;
  rawScore: number;
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

/**
 * Scores a set of ordered picks against official qualifiers.
 *
 * Scoring:
 *   +2 pts: correct rōpū at exact rank position
 *   +1 pt:  correct rōpū at wrong rank position
 *   +0 pts: incorrect pick
 *
 * Shards tiers based on rawScore / maxScore:
 *   100%  → 10,000 🏆
 *   ≥75%  → 5,000
 *   ≥50%  → 2,500
 *   >0    → 1,000
 *   0     → 0
 */
export function scoreSelection(
  picks: string[],
  officialQualifiers: string[],
  qualifierCount: number
): SelectionScore {
  const maxScore = qualifierCount * 2;
  let rawScore = 0;
  let exactMatches = 0;
  let correctPicks = 0;

  picks.slice(0, qualifierCount).forEach((pick, index) => {
    const officialIndex = officialQualifiers.indexOf(pick);
    if (officialIndex === index) {
      rawScore += 2;
      exactMatches += 1;
      correctPicks += 1;
    } else if (officialIndex !== -1) {
      rawScore += 1;
      correctPicks += 1;
    }
  });

  const ratio = maxScore > 0 ? rawScore / maxScore : 0;
  const accuracy = Math.round(ratio * 100);

  let shards = 0;
  if (ratio >= 1) shards = 10000;
  else if (ratio >= 0.75) shards = 5000;
  else if (ratio >= 0.5) shards = 2500;
  else if (rawScore > 0) shards = 1000;

  return { shards, accuracy, exactMatches, correctPicks, maxScore, rawScore };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseMySelectionOptions {
  db: Firestore;
  user: User | null;
  eventId: string;
  qualifierCount?: number;
}

export function useMySelection({
  db,
  user,
  eventId,
  qualifierCount = 6,
}: UseMySelectionOptions) {
  const [selection, setSelection] = useState<UserSelection | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectionId = user ? `${eventId}_${user.uid}` : null;

  // ── Load existing selection + event results ──────────────────────────────
  useEffect(() => {
    if (!user || !eventId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        // Load user's selection
        const selRef = doc(db, 'userSelections', `${eventId}_${user.uid}`);
        const selSnap = await getDoc(selRef);

        // Load event results (admin-published)
        const resRef = doc(db, 'eventResults', eventId);
        const resSnap = await getDoc(resRef);

        if (!active) return;

        if (selSnap.exists()) {
          const d = selSnap.data();
          setSelection({
            userId: d.userId,
            eventId: d.eventId,
            picks: d.picks ?? [],
            submittedAt: d.submittedAt?.toDate() ?? null,
            scored: d.scored ?? false,
            shardsEarned: d.shardsEarned ?? 0,
            accuracy: d.accuracy ?? 0,
            sharedToParty: d.sharedToParty ?? false,
            sharedToGlobal: d.sharedToGlobal ?? false,
          });
        }

        if (resSnap.exists()) {
          const r = resSnap.data();
          setEventResult({
            officialQualifiers: r.officialQualifiers ?? [],
            qualifierCount: r.qualifierCount ?? qualifierCount,
            resultsPublishedAt: r.resultsPublishedAt?.toDate(),
          });
        }
      } catch (err) {
        console.error('useMySelection: load error', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [db, user, eventId, qualifierCount]);

  // ── Save picks (upsert) ──────────────────────────────────────────────────
  const savePicks = useCallback(
    async (picks: string[]) => {
      if (!user || !selectionId) {
        toast({ title: 'Sign in required', description: 'Please sign in to save your selection.', variant: 'destructive' });
        return;
      }
      if (selection?.scored) {
        toast({ title: 'Already scored', description: 'Your selection has already been scored and cannot be changed.', variant: 'destructive' });
        return;
      }

      setIsSaving(true);
      try {
        const ref = doc(db, 'userSelections', selectionId);
        const payload = {
          userId: user.uid,
          eventId,
          picks,
          submittedAt: serverTimestamp(),
          scored: false,
          shardsEarned: 0,
          accuracy: 0,
          sharedToParty: false,
          sharedToGlobal: false,
        };
        await setDoc(ref, payload, { merge: true });

        setSelection(prev => ({
          userId: user.uid,
          eventId,
          picks,
          submittedAt: new Date(),
          scored: false,
          shardsEarned: prev?.shardsEarned ?? 0,
          accuracy: prev?.accuracy ?? 0,
          sharedToParty: prev?.sharedToParty ?? false,
          sharedToGlobal: prev?.sharedToGlobal ?? false,
        }));

        // Update crowd leaderboard picks count
        await _updateCrowdLeaderboard(db, eventId, picks);

        toast({ title: '✅ Selection saved!', description: `${picks.length} rōpū ranked.` });
      } catch (err) {
        console.error('useMySelection: savePicks error', err);
        toast({ title: 'Error saving', description: 'Could not save your selection. Try again.', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    },
    [db, user, selectionId, eventId, selection?.scored]
  );

  // ── Score selection (runs once when eventResult is available) ────────────
  const scoreAndAward = useCallback(
    async () => {
      if (!user || !selectionId || !selection || !eventResult) return;
      if (selection.scored) return;
      if (!selection.picks.length) return;

      const qCount = eventResult.qualifierCount ?? qualifierCount;
      const result = scoreSelection(selection.picks, eventResult.officialQualifiers, qCount);

      try {
        // Mark selection as scored
        const selRef = doc(db, 'userSelections', selectionId);
        await updateDoc(selRef, {
          scored: true,
          shardsEarned: result.shards,
          accuracy: result.accuracy,
        });

        // Credit shards to user profile
        if (result.shards > 0) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            criticPoints: increment(result.shards),
          });
        }

        setSelection(prev => prev ? {
          ...prev,
          scored: true,
          shardsEarned: result.shards,
          accuracy: result.accuracy,
        } : prev);

        if (result.shards > 0) {
          toast({
            title: `🏆 +${result.shards.toLocaleString()} Mana Shards!`,
            description: `${result.accuracy}% accuracy · ${result.exactMatches} exact rank matches`,
          });
        } else {
          toast({
            title: 'Selection scored',
            description: `No correct picks this time. Better luck next event!`,
          });
        }

        return result;
      } catch (err) {
        console.error('useMySelection: scoreAndAward error', err);
        toast({ title: 'Scoring error', description: 'Could not award shards. Please try again.', variant: 'destructive' });
      }
    },
    [db, user, selectionId, selection, eventResult, qualifierCount]
  );

  // ── Mark as shared to party ──────────────────────────────────────────────
  const markSharedToParty = useCallback(async () => {
    if (!selectionId || !selection || selection.sharedToParty) return;
    try {
      const ref = doc(db, 'userSelections', selectionId);
      await updateDoc(ref, { sharedToParty: true });
      setSelection(prev => prev ? { ...prev, sharedToParty: true } : prev);
    } catch (_) {}
  }, [db, selectionId, selection]);

  // ── Mark as shared to global ─────────────────────────────────────────────
  const markSharedToGlobal = useCallback(async () => {
    if (!selectionId || !selection || selection.sharedToGlobal) return;
    try {
      const ref = doc(db, 'userSelections', selectionId);
      await updateDoc(ref, { sharedToGlobal: true });
      setSelection(prev => prev ? { ...prev, sharedToGlobal: true } : prev);
    } catch (_) {}
  }, [db, selectionId, selection]);

  return {
    selection,
    eventResult,
    isLoading,
    isSaving,
    savePicks,
    scoreAndAward,
    markSharedToParty,
    markSharedToGlobal,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Update crowd leaderboard with user's picks (increment pick count per roopu).
 * Uses merge so partial updates don't overwrite other data.
 */
async function _updateCrowdLeaderboard(
  db: Firestore,
  eventId: string,
  picks: string[]
) {
  try {
    const ref = doc(db, 'selectionLeaderboard', eventId);
    const existingSnap = await getDoc(ref);
    const existing = existingSnap.exists() ? existingSnap.data() : {};
    const topPicks: Record<string, number> = existing.topPicks ?? {};

    picks.forEach(id => {
      topPicks[id] = (topPicks[id] ?? 0) + 1;
    });

    await setDoc(ref, {
      topPicks,
      participantCount: increment(1) as any,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Non-critical — don't surface to user
    console.warn('Could not update crowd leaderboard:', err);
  }
}
