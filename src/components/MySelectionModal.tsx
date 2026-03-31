'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  CheckCircle2,
  Circle,
  Sparkles,
  Share2,
  Zap,
  BarChart3,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useMySelection, scoreSelection } from '@/hooks/use-my-selection';
import { useUser, useFirestore } from '@/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Roopu {
  id: string;
  name: string;
  time?: string;
}

interface MySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  roopu: Roopu[];
  qualifierCount?: number;
  isClosed?: boolean;
  /** Called when user wants to share their selection to party chat */
  onShareToParty?: (message: string) => void;
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────

const RANK_COLORS = [
  'bg-yellow-400 text-yellow-900',   // 1st
  'bg-slate-300 text-slate-700',     // 2nd
  'bg-amber-600 text-amber-50',      // 3rd
  'bg-primary/20 text-primary',      // 4th
  'bg-primary/15 text-primary',      // 5th
  'bg-primary/10 text-primary',      // 6th
];

function RankBadge({ rank }: { rank: number }) {
  return (
    <div className={cn(
      'h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-sm',
      RANK_COLORS[rank - 1] ?? 'bg-slate-100 text-slate-500'
    )}>
      {rank}
    </div>
  );
}

// ─── Shard Tier Badge ─────────────────────────────────────────────────────────

function ShardTierBadge({ shards }: { shards: number }) {
  if (shards >= 10000) return <Badge className="bg-yellow-400 text-yellow-900 font-black text-[10px] uppercase animate-pulse">🏆 Perfect +10,000</Badge>;
  if (shards >= 5000) return <Badge className="bg-primary/10 text-primary font-black text-[10px] uppercase">⚡ +5,000</Badge>;
  if (shards >= 2500) return <Badge className="bg-primary/10 text-primary font-black text-[10px] uppercase">+2,500</Badge>;
  if (shards >= 1000) return <Badge className="bg-slate-100 text-slate-600 font-black text-[10px] uppercase">+1,000</Badge>;
  return <Badge className="bg-slate-100 text-slate-400 font-black text-[10px] uppercase">+0</Badge>;
}

// ─── Results Comparison View ──────────────────────────────────────────────────

function ResultsView({
  picks,
  officialQualifiers,
  qualifierCount,
  roopuMap,
  shardsEarned,
  accuracy,
}: {
  picks: string[];
  officialQualifiers: string[];
  qualifierCount: number;
  roopuMap: Map<string, string>;
  shardsEarned: number;
  accuracy: number;
}) {
  const result = scoreSelection(picks, officialQualifiers, qualifierCount);

  return (
    <div className="space-y-6">
      {/* Score summary */}
      <div className="p-6 bg-slate-900 rounded-[2rem] text-center space-y-3">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Your Result</p>
        <div className="flex items-center justify-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <span className="text-4xl font-black text-white italic">{shardsEarned.toLocaleString()}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase">Shards</span>
        </div>
        <ShardTierBadge shards={shardsEarned} />
        <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase text-slate-400 mt-2">
          <span>{result.exactMatches} exact rank{result.exactMatches !== 1 ? 's' : ''}</span>
          <span className="text-slate-600">·</span>
          <span>{result.correctPicks} correct pick{result.correctPicks !== 1 ? 's' : ''}</span>
          <span className="text-slate-600">·</span>
          <span>{accuracy}% accuracy</span>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">Your Picks</p>
          <div className="space-y-2">
            {Array.from({ length: qualifierCount }).map((_, i) => {
              const pick = picks[i];
              const officialIdx = pick ? officialQualifiers.indexOf(pick) : -1;
              const isExact = officialIdx === i;
              const isCorrect = officialIdx !== -1;
              return (
                <div key={i} className={cn(
                  'p-3 rounded-2xl border text-center flex items-center gap-2',
                  !pick ? 'border-dashed border-slate-200 bg-slate-50' :
                    isExact ? 'border-green-300 bg-green-50' :
                      isCorrect ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'
                )}>
                  <RankBadge rank={i + 1} />
                  <p className="text-[9px] font-black uppercase text-left leading-tight flex-1 min-w-0 truncate">
                    {pick ? roopuMap.get(pick) ?? pick : '—'}
                  </p>
                  {pick && (
                    isExact ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> :
                      isCorrect ? <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0" /> :
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center mb-2">Official Results</p>
          <div className="space-y-2">
            {Array.from({ length: qualifierCount }).map((_, i) => {
              const official = officialQualifiers[i];
              const userPickedIt = official ? picks.includes(official) : false;
              return (
                <div key={i} className={cn(
                  'p-3 rounded-2xl border text-center flex items-center gap-2',
                  !official ? 'border-dashed border-slate-200 bg-slate-50' :
                    userPickedIt ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
                )}>
                  <RankBadge rank={i + 1} />
                  <p className="text-[9px] font-black uppercase text-left leading-tight flex-1 min-w-0 truncate">
                    {official ? roopuMap.get(official) ?? official : '—'}
                  </p>
                  {official && userPickedIt && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-[8px] font-black uppercase text-slate-400">
        <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Exact rank</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border-2 border-amber-400" /> Correct, wrong rank</div>
        <div className="flex items-center gap-1"><X className="w-3 h-3 text-red-400" /> Missed</div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function MySelectionModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  roopu,
  qualifierCount = 6,
  isClosed = false,
  onShareToParty,
}: MySelectionModalProps) {
  const { user } = useUser();
  const db = useFirestore();

  const { selection, eventResult, isLoading, isSaving, savePicks, scoreAndAward, markSharedToParty } =
    useMySelection({ db, user, eventId, qualifierCount });

  const [localPicks, setLocalPicks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'pick' | 'results'>('pick');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Sync local picks from saved selection
  React.useEffect(() => {
    if (selection && !hasLocalChanges) {
      setLocalPicks(selection.picks);
    }
  }, [selection, hasLocalChanges]);

  // Auto-show results tab when scored
  React.useEffect(() => {
    if (selection?.scored) setActiveTab('results');
  }, [selection?.scored]);

  // Build map for fast name lookup
  const roopuMap = React.useMemo(() => {
    const m = new Map<string, string>();
    roopu.forEach(r => m.set(r.id, r.name));
    return m;
  }, [roopu]);

  const canAddMore = localPicks.length < qualifierCount;
  const isAlreadyPicked = (id: string) => localPicks.includes(id);

  const addPick = useCallback((id: string) => {
    if (!canAddMore || isAlreadyPicked(id)) return;
    setLocalPicks(prev => [...prev, id]);
    setHasLocalChanges(true);
  }, [canAddMore, localPicks]);

  const removePick = useCallback((id: string) => {
    setLocalPicks(prev => prev.filter(p => p !== id));
    setHasLocalChanges(true);
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setLocalPicks(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setHasLocalChanges(true);
  }, []);

  const moveDown = useCallback((index: number) => {
    setLocalPicks(prev => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setHasLocalChanges(true);
  }, []);

  const handleSave = async () => {
    await savePicks(localPicks);
    setHasLocalChanges(false);
  };

  const handleScore = async () => {
    await scoreAndAward();
    setActiveTab('results');
  };

  const buildShareMessage = () => {
    const lines = localPicks.map((id, i) => `${i + 1}. ${roopuMap.get(id) ?? id}`);
    const scored = selection?.scored;
    const tail = scored
      ? `\nAccuracy: ${selection?.accuracy}% | +${selection?.shardsEarned?.toLocaleString()} Shards`
      : '';
    return `🏆 MY SELECTION — ${eventName}\n${lines.join('\n')}${tail}`;
  };

  const handleShareToParty = async () => {
    if (onShareToParty) {
      onShareToParty(buildShareMessage());
      await markSharedToParty();
    } else {
      await navigator.clipboard.writeText(buildShareMessage());
      toast({ title: 'Copied!', description: 'Share your selection in party chat.' });
      await markSharedToParty();
    }
  };

  const canScore = !isLoading && !!eventResult && !selection?.scored && !!selection?.picks.length;

  const hasResults = selection?.scored && eventResult;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="rounded-[2.5rem] bg-white border border-slate-200 p-0 overflow-hidden shadow-2xl max-w-[420px] h-[92vh] flex flex-col">
        {/* Header accent */}
        <div className="h-1.5 w-full bg-primary shrink-0" />

        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tighter text-slate-950 leading-none">
                My Selection
              </DialogTitle>
              <DialogDescription className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 leading-none">
                {eventName}
              </DialogDescription>
            </div>
            <Badge className="bg-primary/10 text-primary font-black text-[9px] uppercase border-none">
              Top {qualifierCount}
            </Badge>
          </div>

          {/* Tab switcher */}
          {hasResults && (
            <div className="flex gap-1 mt-3 bg-slate-100 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab('pick')}
                className={cn(
                  'flex-1 text-[10px] font-black uppercase py-2 rounded-xl transition-all',
                  activeTab === 'pick' ? 'bg-white shadow text-slate-950' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                My Picks
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={cn(
                  'flex-1 text-[10px] font-black uppercase py-2 rounded-xl transition-all flex items-center justify-center gap-1',
                  activeTab === 'results' ? 'bg-white shadow text-slate-950' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <Trophy className="w-3 h-3" /> Results
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-[progress_2s_infinite]" />
              </div>
            </div>
          ) : activeTab === 'results' && hasResults ? (
            <div className="px-6 pb-6">
              <ResultsView
                picks={selection!.picks}
                officialQualifiers={eventResult!.officialQualifiers}
                qualifierCount={eventResult!.qualifierCount ?? qualifierCount}
                roopuMap={roopuMap}
                shardsEarned={selection!.shardsEarned}
                accuracy={selection!.accuracy}
              />
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-4">
              {/* Scoring info banner */}
              {!isClosed && !hasResults && (
                <div className="mx-2 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] font-bold text-slate-600 leading-relaxed">
                    Results are scored once official qualifiers are published after the event.
                    Rank your picks in order — exact position matches earn more shards!
                  </p>
                </div>
              )}

              {/* Shard tier guide */}
              <div className="mx-2 grid grid-cols-2 gap-2">
                {[
                  { label: 'Perfect order', shards: '10,000', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
                  { label: '≥75% score', shards: '5,000', color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
                  { label: '≥50% score', shards: '2,500', color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
                  { label: 'Any correct', shards: '1,000', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
                ].map(tier => (
                  <div key={tier.label} className={cn('p-3 rounded-2xl border text-center', tier.bg)}>
                    <p className={cn('text-sm font-black italic', tier.color)}>+{tier.shards}</p>
                    <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">{tier.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Your ranked picks ── */}
              <div className="mx-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-primary" />
                  Your Ranked Selection ({localPicks.length}/{qualifierCount})
                </p>

                <div className="space-y-2">
                  {localPicks.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                      <Circle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[9px] font-black uppercase text-slate-300">Add rōpū below to start</p>
                    </div>
                  ) : (
                    localPicks.map((id, index) => (
                      <div
                        key={id}
                        className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl group"
                      >
                        <RankBadge rank={index + 1} />
                        <p className="flex-1 text-[11px] font-black uppercase italic text-slate-900 leading-tight truncate">
                          {roopuMap.get(id) ?? id}
                        </p>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-primary hover:text-white hover:border-transparent disabled:opacity-20 transition-all"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === localPicks.length - 1}
                            className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-primary hover:text-white hover:border-transparent disabled:opacity-20 transition-all"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removePick(id)}
                            className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, qualifierCount - localPicks.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-2 p-3 border border-dashed border-slate-200 rounded-2xl opacity-40">
                      <div className="h-8 w-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-300">
                        {localPicks.length + i + 1}
                      </div>
                      <p className="text-[9px] font-black uppercase text-slate-300">Empty slot</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── All Rōpū roster ── */}
              <div className="mx-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3 text-primary" />
                  All Groups
                </p>
                <div className="space-y-2">
                  {roopu.map(r => {
                    const picked = isAlreadyPicked(r.id);
                    const rank = localPicks.indexOf(r.id) + 1;
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-2xl border transition-all',
                          picked
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-white border-slate-100 hover:border-primary/30'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase italic text-slate-900 leading-tight truncate">
                            {r.name}
                          </p>
                          {r.time && (
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{r.time}</p>
                          )}
                        </div>
                        {picked ? (
                          <Badge className="bg-primary/10 text-primary font-black text-[9px] border-none shrink-0">
                            #{rank}
                          </Badge>
                        ) : (
                          <button
                            onClick={() => addPick(r.id)}
                            disabled={!canAddMore}
                            className={cn(
                              'h-8 px-3 rounded-full text-[9px] font-black uppercase flex items-center gap-1 transition-all',
                              canAddMore
                                ? 'bg-primary text-white hover:scale-105 active:scale-95 shadow-sm'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            )}
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
          {activeTab === 'pick' && !selection?.scored && (
            <Button
              onClick={handleSave}
              disabled={isSaving || localPicks.length === 0 || !hasLocalChanges}
              className="w-full h-13 rounded-[1.5rem] font-black uppercase italic text-[10px] bg-primary text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : `Confirm My Selection (${localPicks.length}/${qualifierCount})`}
            </Button>
          )}

          {canScore && (
            <Button
              onClick={handleScore}
              className="w-full h-12 rounded-[1.5rem] font-black uppercase italic text-[10px] bg-yellow-400 text-yellow-900 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Reveal My Score
            </Button>
          )}

          {selection?.picks && selection.picks.length > 0 && (
            <Button
              variant="outline"
              onClick={handleShareToParty}
              className="w-full h-11 rounded-[1.5rem] font-black uppercase italic text-[10px] border-slate-200 hover:border-primary hover:bg-primary/5 flex items-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4 text-primary" />
              {selection.sharedToParty ? 'Shared ✓' : 'Share to Party Chat'}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-2xl font-black uppercase text-[9px] text-slate-400 hover:text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
