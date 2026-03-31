
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, Trophy, Zap, BarChart3, Users, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore'

// ─── Crowd Picks for an event ─────────────────────────────────────────────────

interface CrowdPicksProps {
  eventId: string;
  eventName: string;
}

function CrowdPicksSection({ eventId, eventName }: CrowdPicksProps) {
  const db = useFirestore()
  const [topPicks, setTopPicks] = useState<{ name: string; count: number }[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Hardcoded roopu name map for known events
  // (In a production app this would come from Firestore)
  const ROOPU_NAMES: Record<string, string> = {
    'apanui': 'Te Kapa Haka o Te Whānau-a-Apanui',
    'ohinemataroa': 'Ōhinemataroa ki Ruatāhuna',
    'atawhai': 'Te Atawhai Puumananawa',
    'raranga': 'Te Raranga Whānui',
    'hau-tawhiti': 'Te Kapa Haka o Te Hau Tawhiti',
  }

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, 'selectionLeaderboard', eventId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          const rawPicks: Record<string, number> = data.topPicks ?? {}
          const sorted = Object.entries(rawPicks)
            .map(([id, count]) => ({ name: ROOPU_NAMES[id] ?? id, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
          setTopPicks(sorted)
          setParticipantCount(data.participantCount ?? 0)
        }
      } catch (_) {}
      setIsLoading(false)
    }
    load()
  }, [db, eventId])

  if (isLoading) return (
    <div className="h-16 flex items-center justify-center">
      <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-[progress_2s_infinite]" />
      </div>
    </div>
  )

  if (topPicks.length === 0) return (
    <p className="text-[9px] font-black uppercase text-slate-300 text-center py-4">
      No selections submitted yet
    </p>
  )

  const maxCount = topPicks[0]?.count ?? 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{eventName}</p>
        <Badge className="bg-primary/10 text-primary font-black text-[8px] border-none">
          <Users className="w-2.5 h-2.5 mr-1" />
          {participantCount} selectors
        </Badge>
      </div>
      {topPicks.map((pick, i) => {
        const pct = Math.round((pick.count / maxCount) * 100)
        return (
          <div key={pick.name} className="flex items-center gap-3">
            <div className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center font-black text-[9px] shrink-0',
              i === 0 ? 'bg-yellow-400 text-yellow-900' :
                i === 1 ? 'bg-slate-300 text-slate-700' :
                  i === 2 ? 'bg-amber-600 text-amber-50' : 'bg-slate-100 text-slate-500'
            )}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase italic text-slate-900 truncate">{pick.name}</p>
                <span className="text-[9px] font-black text-primary ml-2 shrink-0">{pick.count}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── User accuracy leaderboard ────────────────────────────────────────────────

function AccuracyLeaderboard() {
  const db = useFirestore()
  const { user } = useUser()

  // Query users with the most criticPoints (which includes selection shards)
  const topUsersQuery = useMemoFirebase(() =>
    query(collection(db, 'users'), orderBy('criticPoints', 'desc'), limit(10)),
    [db]
  )
  const { data: topUsers } = useCollection(topUsersQuery)

  if (!topUsers || topUsers.length === 0) return (
    <p className="text-[9px] font-black uppercase text-slate-400 text-center py-6">
      No judges ranked yet
    </p>
  )

  return (
    <div className="space-y-2">
      {topUsers.map((judge, i) => {
        const isMe = judge.id === user?.uid
        const pts = judge.criticPoints ?? 0
        return (
          <div
            key={judge.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border transition-all',
              isMe ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100',
              i < 3 && 'shadow-sm'
            )}
          >
            {/* Rank */}
            <div className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shrink-0',
              i === 0 ? 'bg-yellow-400 text-yellow-900' :
                i === 1 ? 'bg-slate-300 text-slate-700' :
                  i === 2 ? 'bg-amber-600 text-amber-50' : 'bg-slate-100 text-slate-500'
            )}>
              {i + 1}
            </div>
            {/* Avatar */}
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
              <AvatarImage src={judge.profileImageUrl ?? `https://picsum.photos/seed/${judge.id}/80/80`} className="object-cover" />
              <AvatarFallback className="font-black text-sm">{judge.displayName?.[0]}</AvatarFallback>
            </Avatar>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[11px] font-black uppercase italic leading-none truncate',
                isMe ? 'text-primary' : 'text-slate-900'
              )}>
                {judge.displayName ?? 'Anonymous'} {isMe && <span className="text-[8px] font-bold normal-case tracking-normal text-primary/70">(you)</span>}
              </p>
              <p className="text-[8px] font-black uppercase text-slate-400 mt-1 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 text-primary" />
                {pts.toLocaleString()} total shards
              </p>
            </div>
            {/* Shards badge */}
            <div className="flex items-center gap-1 shrink-0">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-black italic text-primary tabular-nums">
                {pts >= 1000 ? `${(pts / 1000).toFixed(1)}k` : pts}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LEADERBOARD_EVENTS = [
  { id: 'mataatua-2026', name: 'Mātaatua Senior Regional' },
  { id: 'te-whenua-moemoea-2026', name: 'Te Whenua Moemoeā Senior Regional' },
]

export default function LeaderboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'crowd' | 'accuracy'>('crowd')

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Sticky header */}
      <header className="sticky top-4 z-40 bg-white/80 backdrop-blur-lg border rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-10 w-10 rounded-full">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Leaderboard</h1>
          <p className="text-[8px] font-black uppercase text-primary tracking-widest">
            My Selection Rankings
          </p>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="px-4">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('crowd')}
            className={cn(
              'flex-1 text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1.5',
              activeTab === 'crowd' ? 'bg-white shadow text-slate-950' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Crowd Picks
          </button>
          <button
            onClick={() => setActiveTab('accuracy')}
            className={cn(
              'flex-1 text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1.5',
              activeTab === 'accuracy' ? 'bg-white shadow text-slate-950' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Trophy className="w-3.5 h-3.5" /> Top Selectors
          </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {activeTab === 'crowd' ? (
          <>
            <div className="text-center">
              <h2 className="text-sm font-black uppercase italic tracking-tight text-slate-950 flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Community Consensus
              </h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                Most-selected qualifiers per event
              </p>
            </div>

            {LEADERBOARD_EVENTS.map(ev => (
              <Card key={ev.id} className="border border-slate-200 bg-white shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-5">
                  <CrowdPicksSection eventId={ev.id} eventName={ev.name} />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-sm font-black uppercase italic tracking-tight text-slate-950 flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Top Selectors
              </h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
                Ranked by total Mana Shards earned
              </p>
            </div>

            <Card className="border border-slate-200 bg-white shadow-sm rounded-[2rem] overflow-hidden">
              <CardContent className="p-4">
                <AccuracyLeaderboard />
              </CardContent>
            </Card>

            {/* Shard tier guide */}
            <Card className="border border-slate-200 bg-slate-900 shadow-sm rounded-[2rem] overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                  Shard Tier Guide
                </p>
                <p className="text-[8px] font-bold text-slate-400 leading-relaxed">
                  Scores are based on <strong className="text-slate-200">position accuracy</strong>. Picking the right rōpū at the exact rank earns +2pts. Right rōpū, wrong rank earns +1pt.
                </p>
                {[
                  { label: 'Perfect (all exact positions)', shards: '10,000', color: 'text-yellow-400' },
                  { label: '≥75% score', shards: '5,000', color: 'text-primary' },
                  { label: '≥50% score', shards: '2,500', color: 'text-primary' },
                  { label: 'Any correct pick', shards: '1,000', color: 'text-slate-400' },
                ].map(tier => (
                  <div key={tier.label} className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400 uppercase">{tier.label}</p>
                    <span className={cn('text-[11px] font-black italic', tier.color)}>+{tier.shards}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
