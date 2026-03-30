
"use client"

import React, { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, Award, Star, Heart, TrendingUp, MessageSquare, 
  ThumbsUp, ThumbsDown, Gavel, Scale, Zap, Info, Target, 
  PartyPopper, Flame, ChevronLeft, Lock, ShoppingCart, Palette
} from 'lucide-react'
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, serverTimestamp, increment } from 'firebase/firestore'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { StoreModal } from '@/components/StoreModal'
import { FollowGroupsModal } from '@/components/FollowGroupsModal'

export default function PublicProfilePage() {
  const { id: profileId } = useParams()
  const router = useRouter()
  const { user: currentUser } = useUser()
  const db = useFirestore()
  
  const targetUserRef = useMemoFirebase(() => profileId ? doc(db, 'users', profileId as string) : null, [db, profileId])
  const { data: profile, isLoading: isProfileLoading } = useDoc(targetUserRef)
  const [isStoreOpen, setIsStoreOpen] = useState(false)
  const [isFollowGroupsOpen, setIsFollowGroupsOpen] = useState(false)

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(db, 'users', currentUser.uid) : null, [db, currentUser])
  const { data: currentUserProfile } = useDoc(currentUserRef)

  const hearts = profile?.receivedHearts || 0
  
  const headJudgeStatus = useMemo(() => {
    if (hearts >= 50) return { title: "Grand Chancellor", color: "text-purple-600", bg: "bg-purple-600/10" }
    if (hearts >= 20) return { title: "Supreme Adjudicator", color: "text-orange-500", bg: "bg-orange-500/10" }
    if (hearts >= 5) return { title: "Head Judge", color: "text-primary", bg: "bg-primary/10" }
    return { title: "Candidate Judge", color: "text-muted-foreground", bg: "bg-muted" }
  }, [hearts])

  const judgeStature = useMemo(() => {
    const favour = profile?.likedPoints || 0
    const impact = profile?.dislikedPoints || 0
    const vibe = profile?.vibePoints || 0
    const total = favour + impact
    
    if (vibe > 500) return {
      title: "The Vibe Master",
      desc: "High-energy, humorous, and full of mana. Brings the life to the feed!",
      color: "text-orange-500",
      badge: "bg-orange-500"
    }
    if (total < 50) return { title: "Emerging Critic", desc: "Finding their voice.", color: "text-muted-foreground", badge: "bg-muted" }
    const ratio = favour / (impact || 1)
    if (ratio > 2.5) return { title: "Benevolent Sage", desc: "Sees the beauty in every performance.", color: "text-green-500", badge: "bg-green-500" }
    if (ratio < 0.4) return { title: "Ruthless Adjudicator", desc: "Demands absolute perfection.", color: "text-red-600", badge: "bg-red-600" }
    return { title: "Balanced Gavel", desc: "Objective and fair precision.", color: "text-primary", badge: "bg-primary" }
  }, [profile])

  const handleGiveHeart = () => {
    if (!currentUser || !profileId || !currentUserProfile) return
    
    if (currentUser.isAnonymous) {
      toast({ title: "Registration Required", description: "Sharing daily Luv requires a registered judge account.", variant: "destructive" });
      router.push('/login');
      return;
    }

    const lastHeart = currentUserProfile.lastHeartGivenAt ? new Date(currentUserProfile.lastHeartGivenAt).getTime() : 0
    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000

    if (now - lastHeart < oneDay) {
      toast({ title: "Heart Limit Reached", description: "You can only share 1 heart per day! Come back tomorrow.", variant: "destructive" })
      return
    }

    updateDocumentNonBlocking(doc(db, 'users', profileId as string), {
      receivedHearts: increment(1)
    })

    updateDocumentNonBlocking(doc(db, 'users', currentUser.uid), {
      lastHeartGivenAt: new Date().toISOString()
    })

    toast({ title: "Luv Shared!", description: `You gave a heart to ${profile?.displayName}.` })
  }

  if (isProfileLoading) return <div className="p-12 text-center animate-pulse font-black italic text-primary tracking-widest">FETCHING PERSONA...</div>
  if (!profile) return <div className="p-12 text-center font-black italic text-muted-foreground">CRITIC NOT FOUND</div>

  const themeColor = profile?.profileColor || '#FF4500'

  return (
    <div className="min-h-screen pb-24 transition-all duration-700 relative">
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      <FollowGroupsModal isOpen={isFollowGroupsOpen} onClose={() => setIsFollowGroupsOpen(false)} />
      <div className="p-4 space-y-10 relative z-10">
        <header className="relative flex flex-col items-center gap-6 py-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute top-2 left-0 bg-background/40 backdrop-blur-sm rounded-full hover:bg-background/60">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsStoreOpen(true)} className="absolute top-2 right-0 bg-primary/10 backdrop-blur-sm rounded-full hover:bg-primary/20 text-primary shadow-sm">
            <ShoppingCart className="w-5 h-5" />
          </Button>
          
          <div className="relative group">
            <div 
              className="absolute -inset-12 rounded-full opacity-30 blur-3xl animate-pulse transition-all duration-700"
              style={{ backgroundColor: themeColor }}
            />
            <Avatar className="w-56 h-56 border-4 shadow-2xl relative transition-all duration-700" style={{ borderColor: `${themeColor}33` }}>
              <AvatarImage src={profile?.profileImageUrl || `https://picsum.photos/seed/${profileId}/200/200`} className="object-cover" />
              <AvatarFallback className="text-6xl font-black">{profile?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div 
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-6 py-2.5 rounded-full border-4 border-background whitespace-nowrap uppercase tracking-widest shadow-xl transition-all duration-700"
              style={{ backgroundColor: themeColor }}
            >
              {headJudgeStatus.title}
            </div>
          </div>
          
          <div className="text-center space-y-3 mt-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter drop-shadow-md">{profile?.displayName}</h1>
            <div className="flex flex-col items-center gap-4">
              <Badge className={cn("text-[10px] font-black uppercase italic tracking-widest text-white px-5 py-1.5", judgeStature.badge)}>
                {judgeStature.title}
              </Badge>
              
              {profileId === currentUser?.uid ? (
                <Button 
                  onClick={() => setIsFollowGroupsOpen(true)}
                  className="mt-4 h-14 w-full px-12 rounded-full font-black uppercase italic gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95 text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  <Palette className="w-5 h-5 mr-1" />
                  EDIT REGIONAL ALLIANCES
                </Button>
              ) : (
                <Button 
                  onClick={handleGiveHeart}
                  className="mt-4 h-14 w-full px-12 rounded-full font-black uppercase italic gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95 text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  {currentUser?.isAnonymous ? <Lock className="w-5 h-5 mr-1" /> : <Heart className="w-5 h-5 fill-white mr-1" />}
                  {currentUser?.isAnonymous ? "SIGN IN TO GIVE LUV" : "GIVE DAILY LUV"}
                </Button>
              )}
            </div>
          </div>
        </header>

        <Card className="bg-card/85 backdrop-blur-md border-none shadow-xl overflow-hidden transition-all duration-700 mx-1" style={{ boxShadow: `0 0 0 2px ${themeColor}20` }}>
          <CardContent className="p-8 flex gap-6 items-center">
            <div className={cn("p-5 rounded-2xl bg-muted/50 shadow-inner shrink-0", judgeStature.color)}>
              <PartyPopper className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Judge Reputation</p>
              <p className="text-sm font-bold leading-snug">{judgeStature.desc}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4 px-1">
          {[
            { icon: ThumbsUp, color: 'text-green-500', value: profile?.likedPoints || 0, label: 'Favour' },
            { icon: ThumbsDown, color: 'text-red-500', value: profile?.dislikedPoints || 0, label: 'Impact' },
            { icon: Flame, color: 'text-orange-500', value: profile?.vibePoints || 0, label: 'Vibe' },
            { icon: Heart, color: 'text-primary', value: hearts, label: 'Luv', fill: true }
          ].map((stat, i) => (
            <Card key={i} className="bg-card/90 border-none shadow-lg transition-all duration-500 hover:-translate-y-1">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <stat.icon className={cn("w-6 h-6", stat.color, stat.fill && "fill-current")} />
                <span className={cn("text-xl font-black", stat.color)}>{stat.value}</span>
                <span className="text-[7px] font-black text-muted-foreground uppercase text-center tracking-widest">{stat.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6 px-1">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground px-2">Professional Statistics</h2>
          <div className="bg-card/90 rounded-[2.5rem] overflow-hidden border-2 shadow-2xl transition-all duration-700" style={{ borderColor: `${themeColor}10` }}>
            <div className="flex items-center justify-between p-8 border-b transition-all duration-700" style={{ borderBottomColor: `${themeColor}10` }}>
              <div className="flex items-center gap-5">
                 <div className="p-3 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
                    <MessageSquare className="w-6 h-6" style={{ color: themeColor }} />
                 </div>
                 <span className="text-sm font-bold uppercase tracking-tight">Adjudication Notes</span>
              </div>
              <Badge variant="secondary" className="text-sm font-black px-4 py-1.5 shadow-sm rounded-full" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                {profile?.commentCount || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-8">
              <div className="flex items-center gap-5">
                 <div className="p-3 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
                    <TrendingUp className="w-6 h-6" style={{ color: themeColor }} />
                 </div>
                 <span className="text-sm font-bold uppercase tracking-tight">Total Votes Cast</span>
              </div>
              <Badge variant="secondary" className="text-sm font-black px-4 py-1.5 shadow-sm rounded-full" style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                {profile?.voteCount || 0}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
