'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Trophy, TrendingUp, Target, Flame, 
  Star, Award, BarChart3, Activity,
  Zap, Heart, MessageSquare, Gavel
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  profile: any
  className?: string
}

export function AnalyticsDashboard({ profile, className }: AnalyticsDashboardProps) {
  const stats = {
    totalVotes: profile?.voteCount || 0,
    totalComments: profile?.commentCount || 0,
    manaShards: (profile?.purchasedMana || 0) + (profile?.earnedMana || 0),
    criticPoints: profile?.criticPoints || 0,
    likedPoints: profile?.likedPoints || 0,
    receivedHearts: profile?.receivedHearts || 0,
    rank: calculateRank(profile),
    weeklyActivity: calculateWeeklyActivity(profile),
    topItems: getTopJudgedItems(profile)
  }

  const achievements = [
    {
      id: 'first-vote',
      name: 'First Judge',
      description: 'Cast your first vote',
      icon: Gavel,
      unlocked: stats.totalVotes > 0,
      color: 'text-blue-500'
    },
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Post 10 comments',
      unlocked: stats.totalComments >= 10,
      icon: MessageSquare,
      color: 'text-green-500'
    },
    {
      id: 'mana-collector',
      name: 'Mana Collector',
      description: 'Earn 10,000 Mana Shards',
      unlocked: stats.manaShards >= 10000,
      icon: Flame,
      color: 'text-orange-500'
    },
    {
      id: 'dedicated-judge',
      name: 'Dedicated Judge',
      description: 'Vote 50 times',
      unlocked: stats.totalVotes >= 50,
      icon: Trophy,
      color: 'text-yellow-500'
    }
  ]

  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 shadow-xl rounded-[3rem] overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-orange-500 to-red-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black uppercase italic">
              Judge Analytics
            </CardTitle>
            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">
              <Activity className="w-3 h-3 mr-1" />
              {stats.rank}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Gavel}
              label="Total Votes"
              value={stats.totalVotes}
              color="bg-blue-500"
            />
            <MetricCard
              icon={MessageSquare}
              label="Comments"
              value={stats.totalComments}
              color="bg-green-500"
            />
            <MetricCard
              icon={Flame}
              label="Mana Shards"
              value={stats.manaShards.toLocaleString()}
              color="bg-orange-500"
            />
            <MetricCard
              icon={Heart}
              label="Hearts"
              value={stats.receivedHearts}
              color="bg-pink-500"
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Weekly Activity
              </p>
              <Badge variant="outline" className="text-[8px] font-black">
                {stats.weeklyActivity}%
              </Badge>
            </div>
            <Progress value={stats.weeklyActivity} className="h-2" />
          </div>

          {stats.topItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Most Judged Items
              </p>
              <div className="space-y-2">
                {stats.topItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <Badge variant="secondary" className="text-[9px] font-black">
                      {item.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-2 border-slate-200 shadow-xl rounded-[3rem] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black uppercase italic">
              Achievements
            </CardTitle>
            <Badge className="bg-primary text-slate-950 text-[9px] font-black">
              {unlockedCount}/{achievements.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all",
                achievement.unlocked
                  ? "bg-white border-slate-200 shadow-sm"
                  : "bg-slate-50 border-slate-100 opacity-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-3 rounded-xl shrink-0",
                  achievement.unlocked ? "bg-primary/10" : "bg-slate-200"
                )}>
                  <achievement.icon className={cn(
                    "w-5 h-5",
                    achievement.unlocked ? achievement.color : "text-slate-400"
                  )} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-950">
                      {achievement.name}
                    </h4>
                    {achievement.unlocked && (
                      <Award className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any
  label: string
  value: string | number
  color: string 
}) {
  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-black tabular-nums text-slate-950">
          {value}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      </div>
    </div>
  )
}

function calculateRank(profile: any): string {
  const totalActivity = (profile?.voteCount || 0) + (profile?.commentCount || 0)
  if (totalActivity >= 100) return 'Elite Judge'
  if (totalActivity >= 50) return 'Expert Judge'
  if (totalActivity >= 20) return 'Active Judge'
  if (totalActivity >= 5) return 'Rising Judge'
  return 'Rookie Judge'
}

function calculateWeeklyActivity(profile: any): number {
  const totalActivity = (profile?.voteCount || 0) + (profile?.commentCount || 0)
  return Math.min(100, totalActivity * 2)
}

function getTopJudgedItems(profile: any): { name: string; count: number }[] {
  return [
    { name: 'Haka', count: 15 },
    { name: 'Poi', count: 12 },
    { name: 'Waiata-ā-ringa', count: 10 }
  ]
}
