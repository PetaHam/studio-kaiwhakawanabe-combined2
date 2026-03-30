'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Zap, Shield, Trophy, Crown } from 'lucide-react'
import type { LegacyPerformance } from '@/lib/legacy-data'

interface TeamCardProps {
  team: LegacyPerformance
  power: number
  isActive?: boolean
  showStats?: boolean
  className?: string
  tier?: string
}

const TIER_COLORS: Record<string, string> = {
  'S-Tier': 'from-purple-500 via-pink-500 to-red-500',
  'Legendary': 'from-yellow-500 via-orange-500 to-red-500',
  'Ultimate': 'from-blue-500 via-purple-500 to-pink-500',
  'Elite': 'from-green-500 via-teal-500 to-blue-500',
  'Epic': 'from-indigo-500 via-blue-500 to-cyan-500',
  'Contender': 'from-gray-500 via-slate-500 to-zinc-500'
}

const TIER_ICONS: Record<string, any> = {
  'S-Tier': Crown,
  'Legendary': Trophy,
  'Ultimate': Zap,
  'Elite': Shield,
  'Epic': Zap,
  'Contender': Shield
}

export function TeamCard({ team, power, isActive, showStats, className, tier = 'Epic' }: TeamCardProps) {
  const isLegendary = tier === 'S-Tier' || tier === 'Legendary'
  const TierIcon = TIER_ICONS[tier] || Shield
  const tierGradient = TIER_COLORS[tier] || TIER_COLORS['Epic']

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-500',
        'backdrop-blur-xl bg-white/10 border-2 border-white/20',
        'shadow-2xl hover:shadow-primary/20',
        isActive && 'ring-4 ring-primary ring-offset-2 ring-offset-slate-950',
        isLegendary && 'animate-pulse-glow',
        className
      )}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      
      {/* Animated gradient border for legendary */}
      {isLegendary && (
        <div className={cn(
          'absolute inset-0 opacity-50 animate-shimmer',
          `bg-gradient-to-r ${tierGradient}`
        )} />
      )}

      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={cn(
              'font-black uppercase italic text-white',
              isLegendary ? 'text-2xl' : 'text-xl'
            )}>
              {team.name}
            </h3>
            <p className="text-sm font-medium text-white/70 mt-1">
              {team.location} • {team.year}
            </p>
          </div>
          
          {/* Tier Badge */}
          <Badge className={cn(
            'px-3 py-1 font-black text-xs uppercase',
            `bg-gradient-to-r ${tierGradient} text-white border-0`
          )}>
            <TierIcon className="w-3 h-3 mr-1" />
            {tier}
          </Badge>
        </div>

        {/* Generated Team Visual */}
        <div className={cn(
          'relative h-32 rounded-2xl overflow-hidden',
          'bg-gradient-to-br',
          tierGradient
        )}>
          {/* SVG Pattern Overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
            {/* Koru-inspired pattern */}
            <path 
              d="M50,10 Q60,20 50,30 Q40,20 50,10 M30,50 Q40,60 30,70 Q20,60 30,50 M70,50 Q80,60 70,70 Q60,60 70,50" 
              fill="none" 
              stroke="white" 
              strokeWidth="2"
              className="animate-pulse"
            />
            <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
          
          {/* Team Initial */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-black text-white/30">
              {team.name.charAt(0)}
            </span>
          </div>
        </div>

        {/* Power Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/70 uppercase tracking-widest">
              Power
            </span>
            <span className={cn(
              'text-2xl font-black tabular-nums',
              isLegendary ? 'text-yellow-400' : 'text-primary'
            )}>
              {power}
            </span>
          </div>
          
          {/* Power Bar */}
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                `bg-gradient-to-r ${tierGradient}`
              )}
              style={{ width: `${Math.min(100, (power / 1000) * 100)}%` }}
            />
          </div>
        </div>

        {/* Stats (if shown) */}
        {showStats && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <StatItem label="Wins" value="24" />
            <StatItem label="Rate" value="78%" />
            <StatItem label="Rank" value="#12" />
          </div>
        )}
      </div>
    </Card>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-bold text-white/50 uppercase">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  )
}