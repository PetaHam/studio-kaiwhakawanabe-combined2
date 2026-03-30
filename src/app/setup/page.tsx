"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Heart, Palette, User, ArrowRight, UserCircle, ShieldCheck, Sparkles, History, MessageSquare, Users } from 'lucide-react'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { doc, serverTimestamp } from 'firebase/firestore'
import { toast } from '@/hooks/use-toast'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import { FollowGroupsList } from '@/components/FollowGroupsList'
import { calculateMajorityRegionColor } from '@/lib/team-regions'

export default function SetupPage() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()

  const [step, setStep] = useState(1)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    )
  }

  useEffect(() => {
    if (isCompleting && user) {
      const userRef = doc(db, 'users', user.uid)
      const shortId = user.uid.slice(0, 6).toUpperCase();
      
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        shortId: shortId,
        displayName: displayName || user.displayName || `Judge_${user.uid.slice(0, 4)}`,
        email: user.email || '',
        ageVerified: true,
        criticPoints: 0,
        likedPoints: 0,
        dislikedPoints: 0,
        vibePoints: 0,
        receivedHearts: 0,
        lastHeartGivenAt: null,
        voteCount: 0,
        commentCount: 0,
        favoriteTeamIds: selectedTeams,
        themePreference: 'light',
        profileColor: calculateMajorityRegionColor(selectedTeams),
        manaBackgroundEnabled: true,
        hasCompletedTutorial: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true })

      router.push('/')
      setIsCompleting(false)
    }
  }, [user, isCompleting, db, router, selectedTeams, displayName])

  const handleComplete = () => {
    setIsCompleting(true)
    if (!user) initiateAnonymousSignIn(auth);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 space-y-6 max-w-md mx-auto px-4 overflow-hidden">
      <div className="flex justify-center gap-2 w-full max-w-[160px]">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary shadow-[0_0_10px_rgba(255,69,0,0.5)]' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card className="w-full border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-500 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="py-8 px-8 text-center space-y-3">
            <CardTitle className="flex items-center justify-center gap-2 uppercase italic text-2xl font-black text-slate-950">
              <Heart className="w-6 h-6 text-primary" /> Pick Favorites
            </CardTitle>
            <CardDescription className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground leading-relaxed text-center px-4">
              Select your favorite roopu. They will be prioritized in your profile and event feeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-10 space-y-6">
            <FollowGroupsList selectedTeams={selectedTeams} onToggleTeam={toggleTeam} height="300px" />
            <Button className="w-full h-16 font-black italic uppercase text-base shadow-xl shadow-primary/20 rounded-2xl gap-3 group transition-all active:scale-95" onClick={() => setStep(2)}>
              PROCEED <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="w-full border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-500 rounded-[2.5rem] overflow-hidden text-center">
          <div className="h-1.5 bg-primary w-full" />
          <div className="p-10 space-y-8">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-8 rounded-full animate-mana-pulse ring-8 ring-primary/5">
                <UserCircle className="w-16 h-16 text-primary" />
              </div>
            </div>
            <div className="space-y-6 text-left">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950">Judge Persona</h2>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest text-center">Identify yourself in the stadium</p>
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="judge-name" className="text-[11px] font-black uppercase tracking-widest text-primary px-1">Display Name</Label>
                <Input 
                  id="judge-name"
                  placeholder="e.g. HakaCritic_2026" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-16 text-xl font-black uppercase italic rounded-2xl border-none focus-visible:ring-primary bg-slate-50 text-slate-950 placeholder:text-slate-300"
                />
              </div>
            </div>
            <div className="space-y-4 pt-2">
               <Button 
                  className="w-full h-16 text-lg font-black italic uppercase shadow-2xl shadow-primary/20 rounded-2xl transition-all active:scale-95" 
                  onClick={handleComplete} 
                  disabled={isCompleting || !displayName.trim()}
                >
                 {isCompleting ? 'INITIALIZING...' : 'START ADJUDICATING'}
               </Button>
               <button 
                  className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors py-2" 
                  onClick={() => router.push('/')}
                >
                 Skip setup for now
               </button>
            </div>
          </div>
        </Card>
      )}
      {step === 3 && (
        <Card className="w-full border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right-8 duration-500 rounded-[2.5rem] overflow-hidden flex flex-col mb-24">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="py-6 px-8 text-center space-y-2">
            <CardTitle className="uppercase italic text-2xl font-black text-slate-950 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Training Camp
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest leading-relaxed">
              Your 3-step technical briefing as a new judge.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><History className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">1. The Vault</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Access absolute archives of performances dating back to 2002.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MessageSquare className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">2. Live Lobbies</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Join synced party chats to distribute scores against real-time streams.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Users className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-[11px] font-black uppercase italic text-slate-950 leading-tight">3. Regional Alliances</h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mt-1">Color your interface. Represent your Rohe. Top the leaderboards.</p>
                </div>
              </div>
            </div>
            <Button className="w-full h-14 mt-4 bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(255,69,0,0.3)] group border-2 border-white font-black uppercase italic tracking-widest rounded-[1.5rem] text-[12px]" onClick={handleComplete} disabled={isCompleting}>
              <UserCircle className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> START JUDGING
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
