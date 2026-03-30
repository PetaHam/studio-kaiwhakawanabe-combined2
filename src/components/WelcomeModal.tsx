'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gavel, Heart, Sparkles, Trophy, Users, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/firebase'

export function WelcomeModal() {
  const router = useRouter()
  const { user } = useUser()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Show welcome modal for new users who just completed setup
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
    if (!hasSeenWelcome && user) {
      const timer = setTimeout(() => setOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [user])

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true')
    setOpen(false)
  }

  const handleStartTutorial = () => {
    handleClose()
    // Tutorial will auto-start based on hasCompletedTutorial in profile
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2 border-slate-200 bg-white p-0 overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-orange-500 to-red-500" />
        
        <DialogHeader className="px-8 pt-8 pb-4 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Gavel className="w-10 h-10 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-3xl font-black uppercase italic text-slate-950">
            Kia ora, Wānabe!
          </DialogTitle>
          <DialogDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground leading-relaxed px-4">
            Welcome to the ultimate Kapa Haka fan judging platform
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          <div className="grid gap-4">
            <FeatureItem 
              icon={<Gavel className="w-5 h-5 text-primary" />}
              title="Judge Live Performances"
              description="Score performances in real-time during regional events"
            />
            <FeatureItem 
              icon={<Users className="w-5 h-5 text-blue-500" />}
              title="Join Arena Parties"
              description="Debate and discuss with other judges in live chat"
            />
            <FeatureItem 
              icon={<Trophy className="w-5 h-5 text-yellow-500" />}
              title="Build Legacy Teams"
              description="Draft iconic performances and battle in PVP mode"
            />
            <FeatureItem 
              icon={<Sparkles className="w-5 h-5 text-purple-500" />}
              title="Earn Mana Shards"
              description="Complete daily rituals and unlock legendary content"
            />
          </div>

          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              🔥 Live season rewards are doubled! 🔥
            </p>
          </div>
        </div>

        <DialogFooter className="px-8 pb-8 flex flex-col gap-3">
          <Button 
            onClick={handleStartTutorial}
            className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary text-slate-950 shadow-xl text-base"
          >
            Start Tutorial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            onClick={handleClose}
            variant="ghost"
            className="w-full h-10 rounded-2xl font-bold uppercase text-xs text-slate-500"
          >
            Skip for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-xl bg-slate-50 shrink-0">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-black uppercase text-slate-950">{title}</h4>
        <p className="text-[10px] font-medium text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
