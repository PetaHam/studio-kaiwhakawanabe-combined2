'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TeamCard } from './TeamCard'
import { VictoryEffect } from './VictoryEffect'
import { useBattleSettings } from '@/contexts/BattleSettingsContext'
import { cn } from '@/lib/utils'
import { Swords, Trophy, Zap } from 'lucide-react'
import type { LegacyPerformance } from '@/lib/legacy-data'
import { triggerHapticFeedback } from '@/lib/animations'

type BattlePhase = 'pre-battle' | 'battling' | 'result'

interface BattleScreenProps {
  isOpen: boolean
  onClose: () => void
  playerTeam: {
    performance: LegacyPerformance
    power: number
    tier: string
    lineup: Record<string, number>
  }
  opponentTeam: {
    performance: LegacyPerformance
    power: number
    tier: string
    lineup: Record<string, number>
  }
  onComplete?: (winner: 'player' | 'opponent', rewards: { mana: number }) => void
}

export function BattleScreen({ 
  isOpen, 
  onClose, 
  playerTeam, 
  opponentTeam,
  onComplete 
}: BattleScreenProps) {
  const { settings, getAnimationDuration } = useBattleSettings()
  const [phase, setPhase] = useState<BattlePhase>('pre-battle')
  const [countdown, setCountdown] = useState(3)
  const [playerScore, setPlayerScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [currentItem, setCurrentItem] = useState(0)
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null)

  const items = ['Whakaeke', 'Mōteatea', 'Poi', 'Waiata-ā-ringa', 'Haka', 'Whakawātea']
  const isLegendary = playerTeam.tier === 'Legendary' || playerTeam.tier === 'S-Tier' ||
                      opponentTeam.tier === 'Legendary' || opponentTeam.tier === 'S-Tier'

  // Pre-battle countdown
  useEffect(() => {
    if (phase === 'pre-battle' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1)
        triggerHapticFeedback('medium')
      }, 1000)
      return () => clearTimeout(timer)
    } else if (phase === 'pre-battle' && countdown === 0) {
      setTimeout(() => setPhase('battling'), 500)
    }
  }, [phase, countdown])

  // Battle animation
  useEffect(() => {
    if (phase === 'battling' && currentItem < items.length) {
      const itemDelay = getAnimationDuration(isLegendary ? 'Legendary' : 'Epic') / items.length
      
      const timer = setTimeout(() => {
        const item = items[currentItem]
        const playerItemScore = playerTeam.lineup[item] || 0
        const opponentItemScore = opponentTeam.lineup[item] || 0
        
        setPlayerScore(prev => prev + playerItemScore)
        setOpponentScore(prev => prev + opponentItemScore)
        setCurrentItem(c => c + 1)
        
        if (settings.soundEnabled) {
          triggerHapticFeedback('light')
        }
      }, itemDelay)
      
      return () => clearTimeout(timer)
    } else if (phase === 'battling' && currentItem >= items.length) {
      setTimeout(() => {
        const finalWinner = playerScore > opponentScore ? 'player' : 'opponent'
        setWinner(finalWinner)
        setPhase('result')
        triggerHapticFeedback('heavy')
      }, 500)
    }
  }, [phase, currentItem, items.length, playerScore, opponentScore])

  const handleClose = () => {
    if (winner && onComplete) {
      const manaReward = winner === 'player' ? 250 : 50
      onComplete(winner, { mana: manaReward })
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-0 bg-transparent p-0 overflow-hidden">
        <div className="relative min-h-[600px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-[3rem] overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br",
              isLegendary 
                ? "from-purple-500 via-pink-500 to-orange-500 animate-shimmer"
                : "from-primary via-orange-500 to-red-500"
            )} />
          </div>

          {/* Content */}
          <div className="relative z-10 p-8 space-y-8">
            {/* Pre-Battle Phase */}
            {phase === 'pre-battle' && (
              <div className="flex flex-col items-center justify-center min-h-[500px] space-y-12 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                  <Swords className="w-20 h-20 mx-auto text-primary animate-pulse" />
                  <h2 className="text-4xl font-black uppercase italic text-white">
                    Battle Arena
                  </h2>
                  <p className="text-sm font-bold uppercase tracking-widest text-white/70">
                    Prepare yourself, judge!
                  </p>
                </div>

                {/* Countdown */}
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                  <div className={cn(
                    "relative text-9xl font-black text-white",
                    "transition-all duration-300",
                    countdown <= 1 && "text-primary scale-125"
                  )}>
                    {countdown}
                  </div>
                </div>

                {/* Team Preview */}
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase text-white/50 mb-2">Your Team</p>
                    <p className="text-lg font-black text-white">{playerTeam.performance.name}</p>
                  </div>
                  
                  <div className="text-4xl font-black text-white/30">VS</div>
                  
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase text-white/50 mb-2">Opponent</p>
                    <p className="text-lg font-black text-white">{opponentTeam.performance.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Battle Phase */}
            {phase === 'battling' && (
              <div className="space-y-8 animate-in slide-in-from-top duration-500">
                {/* Score Display */}
                <div className="flex items-center justify-between px-8">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Your Score</p>
                    <p className={cn(
                      "text-5xl font-black tabular-nums transition-all duration-300",
                      playerScore > opponentScore ? "text-green-400 scale-110" : "text-white"
                    )}>
                      {playerScore}
                    </p>
                  </div>

                  <Zap className="w-12 h-12 text-primary animate-pulse" />

                  <div className="text-center space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Opponent</p>
                    <p className={cn(
                      "text-5xl font-black tabular-nums transition-all duration-300",
                      opponentScore > playerScore ? "text-red-400 scale-110" : "text-white"
                    )}>
                      {opponentScore}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
                    style={{ width: `${(currentItem / items.length) * 100}%` }}
                  />
                </div>

                {/* Item Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  {items.map((item, index) => {
                    const revealed = index < currentItem
                    const playerItemScore = playerTeam.lineup[item] || 0
                    const opponentItemScore = opponentTeam.lineup[item] || 0
                    
                    return (
                      <div 
                        key={item}
                        className={cn(
                          "p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10",
                          "transition-all duration-500",
                          revealed ? "opacity-100 scale-100" : "opacity-30 scale-95"
                        )}
                      >
                        <p className="text-xs font-bold uppercase text-white/70 mb-2">{item}</p>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-lg font-black",
                            revealed && playerItemScore > opponentItemScore ? "text-green-400" : "text-white"
                          )}>
                            {revealed ? playerItemScore : '---'}
                          </span>
                          <span className="text-white/30">vs</span>
                          <span className={cn(
                            "text-lg font-black",
                            revealed && opponentItemScore > playerItemScore ? "text-red-400" : "text-white"
                          )}>
                            {revealed ? opponentItemScore : '---'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Result Phase */}
            {phase === 'result' && winner && (
              <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 animate-in zoom-in duration-700">
                <VictoryEffect 
                  isWinner={winner === 'player'} 
                  intensity={settings.effectsIntensity}
                  enabled={settings.particlesEnabled}
                />

                <Trophy className={cn(
                  "w-24 h-24 animate-bounce-in",
                  winner === 'player' ? "text-yellow-400" : "text-white/50"
                )} />

                <div className="text-center space-y-4">
                  <h2 className={cn(
                    "text-5xl font-black uppercase italic",
                    winner === 'player' ? "text-yellow-400" : "text-white"
                  )}>
                    {winner === 'player' ? 'VICTORY!' : 'DEFEATED'}
                  </h2>
                  
                  <p className="text-lg font-medium text-white/70">
                    Final Score: <span className="font-black text-white">{playerScore}</span> vs{' '}
                    <span className="font-black text-white">{opponentScore}</span>
                  </p>

                  {winner === 'player' && (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/20 border-2 border-primary">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="text-xl font-black text-primary">+250 Mana Shards</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleClose}
                    className="h-14 px-8 rounded-2xl font-black uppercase italic bg-primary text-slate-950"
                  >
                    Continue
                  </Button>
                  <Button
                    onClick={() => {
                      setPhase('pre-battle')
                      setCountdown(3)
                      setPlayerScore(0)
                      setOpponentScore(0)
                      setCurrentItem(0)
                      setWinner(null)
                    }}
                    variant="outline"
                    className="h-14 px-8 rounded-2xl font-black uppercase italic text-white border-white/20"
                  >
                    Rematch
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}