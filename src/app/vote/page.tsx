"use client"

import React, { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, MapPin, 
  Clock, ChevronRight, ChevronLeft,
  Scale, MessageSquare, Radio, Trophy, Timer, Lock, History, Zap
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const regionalData = [
  {
    id: 'mataatua-2026',
    name: 'Mātaatua Senior Regional',
    location: 'Whakatāne',
    startDate: new Date('2026-02-27T00:00:00'),
    endDate: new Date('2026-02-28T23:59:59'),
    image: PlaceHolderImages[2].imageUrl,
    groups: [
      { id: 'apanui', name: 'Te Kapa Haka o Te Whānau-a-Apanui', time: '9:00 AM', sortKey: 1 },
      { id: 'ohinemataroa', name: 'Ōhinemataroa ki Ruatāhuna', time: '10:00 AM', sortKey: 2 },
      { id: 'tauira', name: 'Tauira-mai-Tawhiti', time: '11:00 AM', sortKey: 3 },
      { id: 'taumata', name: 'Te Taumata O Apanui', time: '1:00 PM', sortKey: 4 },
      { id: 'opotiki', name: 'Te Kapa Haka o Ōpōtiki Mai Tawhiti', time: '2:00 PM', sortKey: 5 },
      { id: 'ruatoki', name: 'Te Kapa Haka o Ruātoki', time: '3:00 PM', sortKey: 6 }
    ]
  },
  {
    id: 'kahui-maunga-2026',
    name: 'Te Kāhui Maunga Senior Regional',
    location: 'Waitara',
    startDate: new Date('2026-03-07T00:00:00'),
    endDate: new Date('2026-03-07T23:59:59'),
    image: PlaceHolderImages[0].imageUrl,
    groups: [
      { id: 'ratana', name: 'Te Reanga Mōrehu o Rātana', time: '10:00 AM', sortKey: 1 },
      { id: 'purapura', name: 'Ngā Purapura o Te Taihauāuru', time: '11:30 AM', sortKey: 2 },
      { id: 'kura-nui', name: 'Te Kura Nui o Paerangi', time: '1:30 PM', sortKey: 3 },
      { id: 'waihotanga', name: 'Ngā Waihotanga', time: '3:00 PM', sortKey: 4 }
    ]
  },
  {
    id: 'te-arawa-2026',
    name: 'Te Arawa Regional Finals',
    location: 'Rotorua',
    startDate: new Date('2026-03-13T00:00:00'),
    endDate: new Date('2026-03-14T23:59:59'),
    image: PlaceHolderImages[3].imageUrl,
    groups: [
      { id: 'whakaue', name: 'Te Kapa Haka o Ngāti Whakaue', time: '10:00 AM', sortKey: 1 },
      { id: 'tuhourangi', name: 'Tūhourangi Ngāti Wahiao', time: '11:30 AM', sortKey: 2 },
      { id: 'rongomai', name: 'Te Pikikōtuku o Ngāti Rongomai', time: '1:00 PM', sortKey: 3 },
      { id: 'hekenga', name: 'Te Hekenga ā Rangi', time: '2:30 PM', sortKey: 4 },
      { id: 'rangiwewehi', name: 'Ngāti Rangiwewehi', time: '4:00 PM', sortKey: 5 }
    ]
  },
  {
    id: 'te-whenua-moemoea-2026',
    name: 'Te Whenua Moemoeā Senior Regional',
    location: 'Gold Coast',
    startDate: new Date('2026-03-28T09:00:00'),
    endDate: new Date('2026-03-28T23:59:59'),
    image: PlaceHolderImages[0].imageUrl,
    groups: [
      { id: 'atawhai', name: 'Te Atawhai Puumananawa', time: '9:00 AM', sortKey: 1 },
      { id: 'raranga', name: 'Te Raranga Whānui', time: '9:40 AM', sortKey: 2 },
      { id: 'hau-tawhiti', name: 'Te Kapa Haka o Te Hau Tawhiti', time: '10:20 AM', sortKey: 3 },
      { id: 'manawa-mai', name: 'Manawa Mai Tawhiti WA', time: '11:05 AM', sortKey: 4 },
      { id: 'manu-putohe', name: 'Ngā Manu Pūtohe', time: '11:45 AM', sortKey: 5 },
      { id: 'uri-rehua', name: 'Ngā URI ki Tai-o-Rehua', time: '1:15 PM', sortKey: 6 },
      { id: 'kahu-ariki', name: 'Te Kahu Ariki', time: '1:55 PM', sortKey: 7 },
      { id: 'hono-matai', name: 'Te Hono i ngā Mātai Pūrua', time: '2:40 PM', sortKey: 8 },
      { id: 'narama', name: 'Te Whare Haka o Nārama', time: '3:15 PM', sortKey: 9 }
    ]
  }
]

function EventCountdown({ startDate }: { startDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const distance = startDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 animate-in fade-in duration-500">
      <Timer className="w-3 h-3 text-primary" />
      <span>
        LIVE IN: {timeLeft.d}D {timeLeft.h}H {timeLeft.m}M
      </span>
    </div>
  );
}

export default function VotePage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [newPartyName, setNewPartyName] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [targetGroupForChat, setTargetGroupForChat] = useState<{id: string, name: string} | null>(null)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [selectedCircuit, setSelectedCircuit] = useState('senior-regionals')

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  const sortedRegions = useMemo(() => {
    const favorites = profile?.favoriteTeamIds || [];
    const now = new Date();
    
    return [...regionalData].map(region => {
      const isLive = now >= region.startDate && now <= region.endDate;
      const isClosed = now > region.endDate;
      const isUpcoming = now < region.startDate;

      let status: 'LIVE ARENA' | 'Upcoming Qualifiers' | 'Closed Arena' = 'Upcoming Qualifiers';
      if (isLive) status = 'LIVE ARENA';
      else if (isClosed) status = 'Closed Arena';

      const sortedGroups = [...region.groups].sort((a, b) => a.sortKey - b.sortKey);
      
      let favoriteBonus = 0;
      if (isPersonalized) {
        const hasFav = region.groups.some(g => favorites.includes(g.name));
        if (hasFav) favoriteBonus = -100;
      }

      return { 
        ...region, 
        groups: sortedGroups, 
        displayStatus: status,
        isLive,
        isClosed,
        isUpcoming,
        favoriteBonus 
      };
    }).sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.favoriteBonus !== b.favoriteBonus) return a.favoriteBonus - b.favoriteBonus;
      if (!a.isClosed && !b.isClosed) return a.startDate.getTime() - b.startDate.getTime();
      if (a.isClosed && !b.isClosed) return 1;
      if (!a.isClosed && b.isClosed) return -1;
      return b.startDate.getTime() - a.startDate.getTime();
    });
  }, [profile, isPersonalized]);

  const handleCreateParty = () => {
    if (!user || user.isAnonymous) {
      toast({ title: "Registration Required", description: "Lobbies are restricted to registered accounts.", variant: "destructive" });
      router.push('/login');
      return;
    }
    if (!newPartyName.trim()) {
      toast({ title: "Name Required", description: "Please enter a lobby name.", variant: "destructive" })
      return
    }

    const partyId = `node_${Date.now()}`
    const pRef = doc(db, 'parties', partyId)
    
    setDocumentNonBlocking(pRef, {
      id: partyId,
      name: newPartyName,
      leaderId: user.uid,
      performanceId: targetGroupForChat!.id, 
      status: 'live',
      createdAt: serverTimestamp()
    }, { merge: false })

    const memberRef = doc(db, 'parties', partyId, 'members', user.uid)
    const ITEMS = ['whakaeke', 'moteatea', 'poi', 'waiata_a_ringa', 'haka', 'whakawatea'];
    setDocumentNonBlocking(memberRef, { 
      userId: user.uid, 
      userName: user.displayName || 'Judge', 
      joinedAt: serverTimestamp(),
      status: 'approved',
      assignedItems: ITEMS
    }, { merge: true })

    updateDocumentNonBlocking(doc(db, 'users', user.uid), {
      activePartyId: partyId,
      updatedAt: serverTimestamp()
    })

    toast({ title: "Lobby Initialized!", description: `Discussion for "${targetGroupForChat?.name}" is active.` })
    setIsDialogOpen(false)
    router.push(`/performance/${targetGroupForChat?.id}?partyId=${partyId}`)
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <header className={cn(
        "sticky top-4 z-40 transition-all duration-500 ease-in-out px-1",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
      )}>
        <div className="bg-white/80 backdrop-blur-lg glass-card border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 shadow-sm shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-950 dark:white leading-none">CIRCUIT</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary display-text">Live Qualifiers & Regional Hub</p>
          </div>
        </div>
      </header>

      <div id="tour-live-feed" className="space-y-8 px-1 min-h-[40vh]">
        {sortedRegions.map((region) => (
          <Card key={region.id} className="surface-low border ghost-border rounded-[2.5rem] shadow-xl ambient-shadow p-8 text-center space-y-6">
            <div className="relative h-44 w-full">
              <Image 
                src={region.image} 
                alt={region.name} 
                fill 
                className={cn(
                  "object-cover transition-all duration-700",
                  region.isLive ? "opacity-60" : "opacity-40 grayscale"
                )} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <Badge className={cn(
                  "font-black text-[9px] tracking-widest uppercase py-1 px-3 border-none shadow-lg flex items-center gap-1.5",
                  region.isLive ? "bg-primary animate-pulse text-white" : region.isClosed ? "bg-slate-950 text-slate-400" : "bg-white/10 text-white backdrop-blur-md"
                )}>
                  {region.isLive && <Zap className="w-3 h-3 fill-current" />}
                  {region.isClosed && <History className="w-3 h-3" />}
                  {region.isLive ? 'LIVE ARENA' : region.isClosed ? 'CLOSED ARENA' : <EventCountdown startDate={region.startDate} />}
                </Badge>
              </div>
              <div className="absolute bottom-5 left-6 right-6">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{region.location} Stage</span>
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl leading-none">
                  {region.name}
                </h3>
              </div>
            </div>

            <CardContent className="p-4 space-y-3 bg-white">
              <div className="space-y-2">
                {region.groups.length > 0 ? region.groups.map((group) => (
                  <div 
                    key={group.id} 
                    className={cn(
                      "p-4 rounded-3xl border transition-all flex flex-col gap-3 group",
                      region.isLive 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "bg-slate-50 border-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase italic tracking-tight text-slate-950 dark:text-white">{group.name}</h4>
                          {region.isLive && (
                            <div className="flex gap-0.5 items-end h-2.5">
                              <div className="w-0.5 bg-primary animate-[bounce_0.6s_infinite_0s] h-1.5" />
                              <div className="w-0.5 bg-primary animate-[bounce_0.6s_infinite_0.1s] h-2.5" />
                              <div className="w-0.5 bg-primary animate-[bounce_0.6s_infinite_0.2s] h-2" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                            <Clock className="w-3 h-3 text-primary" /> 
                            {region.isClosed ? 'OFFICIAL MARKS' : `Stage Time: ${group.time}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Link href={region.isClosed ? `/performance/${group.id}?partyId=archive_${group.id}` : `/performance/${group.id}`}>
                          <Button 
                            className={cn(
                              "h-9 px-4 rounded-full font-black text-[10px] uppercase italic gap-2 transition-all",
                              region.isLive 
                                ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" 
                                : region.isClosed ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {region.isClosed ? 'POST REMARKS' : 'SOLO JUDGE'} 
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {region.isLive && (
                      <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (user?.isAnonymous) {
                              toast({ title: "Registration Required", description: "Lobbies require registered accounts." });
                              router.push('/login');
                            } else {
                              setTargetGroupForChat(group); 
                              setIsDialogOpen(true);
                            }
                          }}
                          className="flex-1 h-9 rounded-xl bg-slate-950 text-white font-black text-[9px] uppercase italic gap-2 hover:bg-primary transition-all"
                        >
                          {user?.isAnonymous ? <Lock className="w-3.5 h-3.5 text-primary" /> : <MessageSquare className="w-3.5 h-3.5 text-primary" />}
                          START GROUP CHAT
                        </Button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Stage Order Confirmed Soon</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[350px] rounded-[3rem] border border-slate-200 bg-white p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase italic font-black text-xl text-slate-950 display-text">Discussion Lobby</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-1">
              Initializing Group Session for {targetGroupForChat?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Lobby Name</Label>
              <Input 
                placeholder="e.g. Technical Adjudicators Hub" 
                value={newPartyName} 
                onChange={e => setNewPartyName(e.target.value)}
                className="bg-surface-low rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black uppercase italic h-12 signature-gradient text-slate-950" onClick={handleCreateParty}>
              SYNC LOBBY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}