'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Zap, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserSelection, EventResult } from '@/hooks/use-my-selection';
import { scoreSelection } from '@/hooks/use-my-selection';

interface Roopu {
  id: string;
  name: string;
}

interface MySelectionResultCardProps {
  selection: UserSelection;
  eventResult: EventResult | null;
  roopuMap: Map<string, string>;
  qualifierCount?: number;
  onOpen: () => void;
  className?: string;
}

/**
 * Compact result/status card shown inline on the events page.
 * - If not yet scored: shows pick count + "View Selection" CTA.
 * - If scored: shows shards earned, accuracy, mini pick preview.
 */
export function MySelectionResultCard({
  selection,
  eventResult,
  roopuMap,
  qualifierCount = 6,
  onOpen,
  className,
}: MySelectionResultCardProps) {
  const isScored = selection.scored;
  const hasPicks = selection.picks.length > 0;

  // Re-compute score details for the preview (no server call needed)
  const scoreDetails = isScored && eventResult
    ? scoreSelection(selection.picks, eventResult.officialQualifiers, eventResult.qualifierCount ?? qualifierCount)
    : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border transition-all cursor-pointer group hover:shadow-md active:scale-[0.99]',
        isScored
          ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-primary/30'
          : 'bg-primary/5 border-primary/20',
        className
      )}
      onClick={onOpen}
    >
      {/* Scored accent glow */}
      {isScored && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}

      <div className="p-4 flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'p-2.5 rounded-2xl shrink-0',
          isScored ? 'bg-primary/20' : 'bg-primary/10'
        )}>
          {isScored
            ? <Trophy className="w-5 h-5 text-primary" />
            : <CheckCircle2 className="w-5 h-5 text-primary" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isScored ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase italic text-white leading-none">
                  My Selection Scored
                </p>
                {selection.shardsEarned >= 10000 && (
                  <Sparkles className="w-3 h-3 text-yellow-400 animate-spin-slow" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn(
                  'font-black text-[9px] border-none h-5 px-2',
                  selection.shardsEarned >= 10000
                    ? 'bg-yellow-400 text-yellow-900'
                    : selection.shardsEarned >= 5000
                      ? 'bg-primary text-white'
                      : selection.shardsEarned >= 2500
                        ? 'bg-primary/20 text-primary'
                        : 'bg-slate-700 text-slate-300'
                )}>
                  <Zap className="w-2.5 h-2.5 mr-0.5 inline" />
                  +{selection.shardsEarned.toLocaleString()}
                </Badge>
                <span className="text-[8px] font-black uppercase text-slate-400">
                  {selection.accuracy}% acc
                </span>
                {scoreDetails && (
                  <span className="text-[8px] font-black uppercase text-slate-500">
                    · {scoreDetails.exactMatches} exact, {scoreDetails.correctPicks} correct
                  </span>
                )}
              </div>
              {/* Mini pick preview */}
              <div className="flex gap-1 mt-1 flex-wrap">
                {selection.picks.slice(0, 3).map((id, i) => {
                  const isCorrect = eventResult?.officialQualifiers.includes(id);
                  const isExact = eventResult?.officialQualifiers[i] === id;
                  return (
                    <span key={id} className={cn(
                      'text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border',
                      isExact ? 'bg-green-900/50 border-green-600 text-green-300' :
                        isCorrect ? 'bg-amber-900/50 border-amber-600 text-amber-300' :
                          'bg-slate-700 border-slate-600 text-slate-400'
                    )}>
                      {i + 1}. {roopuMap.get(id)?.split(' ').slice(-1)[0] ?? id.slice(0, 8)}
                    </span>
                  );
                })}
                {selection.picks.length > 3 && (
                  <span className="text-[7px] font-black uppercase text-slate-500 px-1.5 py-0.5">
                    +{selection.picks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase italic text-slate-900 leading-none">
                My Selection Saved
              </p>
              <p className="text-[8px] font-black uppercase text-slate-500">
                {hasPicks
                  ? `${selection.picks.length} rōpū ranked · Scoring after results`
                  : 'Tap to add your picks'}
              </p>
            </div>
          )}
        </div>

        {/* CTA arrow */}
        <div className={cn(
          'flex items-center gap-1 shrink-0 text-[9px] font-black uppercase transition-all group-hover:translate-x-0.5',
          isScored ? 'text-primary' : 'text-slate-400'
        )}>
          <span className="hidden sm:inline">{isScored ? 'Full Results' : 'View'}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
