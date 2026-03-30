"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { 
  ChevronLeft, Send, ShieldCheck, Target, 
  Sparkles, Gavel, Zap, MapPin, Clock, Info,
  Mic2, Activity, Languages, Users, Eye,
  Music, Palette, User, MessageSquare, Terminal, X,
  ShieldAlert, BarChart3, Radio, History, ChevronRight,
  Lock as LockIcon, CheckCircle2, ChevronDown, ChevronUp, LogOut,
  ThumbsUp, ThumbsDown, Timer
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase'
import { doc, serverTimestamp, increment, collection, query, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore'
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { DelegateJudgeModal } from '@/components/DelegateJudgeModal'


interface PerformanceMeta {
  name: string;
  status: 'live' | 'upcoming' | 'closed';
  region: string;
  startTime: Date;
}

const PERFORMANCE_DATA: Record<string, PerformanceMeta> = {
  // Mātaatua (Feb 27-28, 2026)
  'apanui': { name: 'Te Kapa Haka o Te Whānau-a-Apanui', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T09:00:00') },
  'ohinemataroa': { name: 'Ōhinemataroa ki Ruatāhuna', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T10:00:00') },
  'tauira': { name: 'Tauira-mai-Tawhiti', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T11:00:00') },
  'taumata': { name: 'Te Taumata O Apanui', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T13:00:00') },
  'opotiki': { name: 'Te Kapa Haka o Ōpōtiki Mai Tawhiti', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T14:00:00') },
  'ruatoki': { name: 'Te Kapa Haka o Ruātoki', status: 'closed', region: 'Mātaatua', startTime: new Date('2026-02-27T15:00:00') },
  
  // Te Kāhui Maunga (March 7, 2026)
  'ratana': { name: 'Te Reanga Mōrehu o Rātana', status: 'closed', region: 'Te Kāhui Maunga', startTime: new Date('2026-03-07T10:00:00') },
  'purapura': { name: 'Ngā Purapura o Te Taihauāuru', status: 'closed', region: 'Te Kāhui Maunga', startTime: new Date('2026-03-07T11:30:00') },
  'kura-nui': { name: 'Te Kura Nui o Paerangi', status: 'closed', region: 'Te Kāhui Maunga', startTime: new Date('2026-03-07T13:30:00') },
  'waihotanga': { name: 'Ngā Waihotanga', status: 'closed', region: 'Te Kāhui Maunga', startTime: new Date('2026-03-07T15:00:00') },
  
  // Te Arawa (March 13-14, 2026)
  'whakaue': { name: 'Te Kapa Haka o Ngāti Whakaue', status: 'closed', region: 'Te Arawa', startTime: new Date('2026-03-13T10:00:00') },
  'tuhourangi': { name: 'Tūhourangi Ngāti Wahiao', status: 'closed', region: 'Te Arawa', startTime: new Date('2026-03-13T11:30:00') },
  'rongomai': { name: 'Te Pikikōtuku o Ngāti Rongomai', status: 'closed', region: 'Te Arawa', startTime: new Date('2026-03-13T13:00:00') },
  'hekenga': { name: 'Te Hekenga ā Rangi', status: 'closed', region: 'Te Arawa', startTime: new Date('2026-03-13T14:30:00') },
  'rangiwewehi': { name: 'Ngāti Rangiwewehi', status: 'closed', region: 'Te Arawa', startTime: new Date('2026-03-13T16:00:00') },
  
  // Te Whenua Moemoeā (March 28, 2026)
  'atawhai': { name: 'Te Atawhai Puumananawa', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T09:00:00') },
  'raranga': { name: 'Te Raranga Whānui', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T09:40:00') },
  'hau-tawhiti': { name: 'Te Kapa Haka o Te Hau Tawhiti', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T10:20:00') },
  'manawa-mai': { name: 'Manawa Mai Tawhiti WA', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T11:05:00') },
  'manu-putohe': { name: 'Ngā Manu Pūtohe', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T11:45:00') },
  'uri-rehua': { name: 'Ngā URI ki Tai-o-Rehua', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T13:15:00') },
  'kahu-ariki': { name: 'Te Kahu Ariki', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T13:55:00') },
  'hono-matai': { name: 'Te Hono i ngā Mātai Pūrua', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T14:40:00') },
  'narama': { name: 'Te Whare Haka o Nārama', status: 'upcoming', region: 'Te Whenua Moemoeā', startTime: new Date('2026-03-28T15:15:00') }
}

const AGGR_CATEGORIES = [
  { id: 'whakaeke', name: 'Whakaeke', description: 'Impactful Entrance' },
  { id: 'moteatea', name: 'Mōteatea', description: 'Traditional Depth' },
  { id: 'poi', name: 'Poi', description: 'Mechanical Precision' },
  { id: 'waiata_a_ringa', name: 'Waiata-ā-ringa', description: 'Synchronized Storytelling' },
  { id: 'haka', name: 'Haka', description: 'Explosive Energy' },
  { id: 'whakawatea', name: 'Whakawātea', description: 'Final Authority' }
]

function ScoreDisplay({ score, label, className }: { score: number, label?: string, className?: string }) {
  return (
    <div className={cn("flex flex-col items-end", className)}>
      <div className="font-black italic text-3xl text-slate-950">{score.toFixed(1)}</div>
      {label && <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>}
    </div>
  )
}

function PrePerformanceHype({ team, region, startTime, onBack, onEnterArena }: { team: string, region: string, startTime: Date, onBack: () => void, onEnterArena: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const distance = startTime.getTime() - now;
      if (distance < 0) { setTimeLeft(null); setIsLive(true); return; }
      setIsLive(false);
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
  }, [startTime]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center animate-in fade-in duration-700">
      <header className="w-full flex items-center justify-between p-6 z-10 sticky top-0 bg-white/95 backdrop-blur-md border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="bg-secondary rounded-full h-12 w-12"><ChevronLeft /></Button>
        <Badge className="bg-primary text-white font-black text-[10px] uppercase px-5 py-1">Stage Hub</Badge>
        <div className="w-12" />
      </header>
      <main className="flex-1 w-full max-md px-6 flex flex-col items-center justify-center space-y-12 py-10">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary leading-none">{team}</h1>
          <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase text-muted-foreground"><MapPin className="w-4 h-4 text-primary" /> {region}</div>
        </div>
        <div className="text-center space-y-6 w-full">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">{isLive ? 'ARENA IS LIVE' : 'SYNCED COUNTDOWN'}</p>
          {timeLeft ? (
            <div className="flex items-center justify-center gap-4">
              {['d', 'h', 'm', 's'].map(u => (
                <div key={u} className="flex flex-col items-center">
                  <span className="text-6xl font-black italic text-slate-950 tabular-nums">{timeLeft[u as keyof typeof timeLeft]?.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase">{u === 'd' ? 'Days' : u === 'h' ? 'Hrs' : u === 'm' ? 'Min' : 'Sec'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-primary/10 p-10 rounded-[3rem] border-4 border-dashed border-primary/20 animate-pulse"><Zap className="w-16 h-16 text-primary mx-auto mb-4" /><h2 className="text-3xl font-black italic uppercase text-primary">STAGE READY</h2></div>
          )}
        </div>
        {isLive && <Button onClick={onEnterArena} className="w-full h-20 font-black uppercase italic text-2xl bg-primary text-slate-950 shadow-2xl rounded-3xl">JUDGE LIVE NOW <Zap className="w-7 h-7 ml-2 fill-current" /></Button>}
      </main>
    </div>
  );
}

const getRandomColor = (seed: string) => {
  const colors = ['#FF4500', '#1877F2', '#22C55E', '#A855F7', '#F59E0B', '#06B6D4', '#EC4899', '#10B981'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function PerformanceDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: performanceId } = useParams()
  const db = useFirestore()
  const { user } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const partyId = searchParams.get('partyId')
  const perfInfo = PERFORMANCE_DATA[performanceId as string] || { name: 'Stage Entry', status: 'upcoming', region: 'Unknown', startTime: new Date() };

  const [forceLive, setForceLive] = useState(false)
  const [comment, setComment] = useState('')
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    AGGR_CATEGORIES.forEach(cat => initial[cat.id] = 50.0)
    return initial
  })
  const [submittedItems, setSubmittedItems] = useState<Record<string, boolean>>({})
  const [itemToConfirm, setItemToConfirm] = useState<string | null>(null)

  const partyMessagesQuery = useMemoFirebase(() => partyId ? query(collection(db, 'parties', partyId, 'messages'), orderBy('timestamp', 'asc'), limit(50)) : null, [db, partyId])
  const { data: partyMessages } = useCollection(partyMessagesQuery)

  const currentMemberRef = useMemoFirebase(() => (partyId && user) ? doc(db, 'parties', partyId, 'members', user.uid) : null, [db, partyId, user])
  const { data: currentMember } = useDoc(currentMemberRef)

  const activePartyRef = useMemoFirebase(() => partyId ? doc(db, 'parties', partyId) : null, [db, partyId])
  const { data: activeParty } = useDoc(activePartyRef)

  // Auto-join logic if URL has partyId but user is not in members
  useEffect(() => {
    if (user && partyId && currentMember === null) {
      const memberRef = doc(db, 'parties', partyId, 'members', user.uid)
      setDocumentNonBlocking(memberRef, { 
        userId: user.uid, 
        userName: user.displayName || 'Judge', 
        userColor: getRandomColor(user.uid), 
        isTyping: false, 
        joinedAt: serverTimestamp(),
        status: 'pending',
        assignedItems: []
      }, { merge: true })
      updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: partyId, updatedAt: serverTimestamp() })
    }
  }, [user, partyId, currentMember, db])


  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, [partyMessages])

  const overallFanScore = useMemo(() => {
    const aggrScores = AGGR_CATEGORIES.map(cat => scores[cat.id]);
    return parseFloat((aggrScores.reduce((a, b) => a + b, 0) / aggrScores.length).toFixed(1));
  }, [scores]);

  const finalizeScore = (itemId: string) => {
    setSubmittedItems(prev => ({ ...prev, [itemId]: true }));
    if (user && partyId) {
      const item = AGGR_CATEGORIES.find(c => c.id === itemId)?.name || itemId;
      handleSendMessage(`[LOCKED] ${item} score: ${scores[itemId].toFixed(1)}% :target:`);
    }
    setItemToConfirm(null);
    toast({ title: "Score Locked!" });
  }

  const handleSendMessage = (text: string) => {
    if (!user || !text || !partyId) return
    const msgRef = collection(db, 'parties', partyId, 'messages')
    addDocumentNonBlocking(msgRef, { userId: user.uid, userName: user.displayName || 'Judge', userColor: getRandomColor(user.uid), text: text.trim(), agreedBy: [], disagreedBy: [], timestamp: serverTimestamp() })
    setComment('')
  }

  const handleDisconnect = () => {
    if (!user || !partyId) return;
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: null, updatedAt: serverTimestamp() });
    deleteDocumentNonBlocking(doc(db, 'parties', partyId, 'members', user.uid));
    router.push('/vote');
  }

  if (perfInfo.status === 'upcoming' && !forceLive) {
    return <PrePerformanceHype team={perfInfo.name} region={perfInfo.region} startTime={perfInfo.startTime} onBack={() => router.back()} onEnterArena={() => setForceLive(true)} />
  }

  if (partyId && currentMember?.status === 'pending' && activeParty?.leaderId !== user?.uid) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center bg-background px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <LockIcon className="w-16 h-16 text-primary mb-6 animate-pulse" />
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-2 display-text">Waiting Room</h2>
        <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed label-text">
          Matataki is assigning your judge delegation items...
        </p>
        <Button variant="outline" onClick={handleDisconnect} className="mt-12 rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest text-slate-500">Leave Lobby</Button>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-2 border-b rounded-b-[2.5rem] flex flex-col">
        <DelegateJudgeModal partyId={partyId} isLeader={activeParty?.leaderId === user?.uid} />
        <div className="flex items-center gap-4 px-4 pb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="bg-secondary rounded-full h-10 w-10"><ChevronLeft /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black uppercase italic tracking-tight line-clamp-1">{perfInfo.name}</h1>
            <Badge className={cn("text-[8px] font-black uppercase px-2 h-5", partyId ? "bg-green-600 text-white" : "bg-primary text-white")}>
              {partyId ? 'SYNCED ARENA' : 'SOLO MODE'}
            </Badge>
          </div>
          <ScoreDisplay score={overallFanScore} label="Marks" />
          {partyId && <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-7 w-7 rounded-full bg-red-50 text-red-500 absolute -top-1 -right-2"><X className="w-3.5 h-3.5" /></Button>}
        </div>
        {partyId && showScoreboard && (
          <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-4">
            <div className="p-6 bg-slate-50 rounded-[2rem] border shadow-inner grid grid-cols-2 gap-x-8 gap-y-6">
              {AGGR_CATEGORIES.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase italic">{cat.name}</label><span className="text-[10px] font-black text-primary">{scores[cat.id].toFixed(1)}%</span></div>
                  <Slider value={[scores[cat.id]]} max={100} step={0.1} onValueChange={v => setScores(p => ({ ...p, [cat.id]: v[0] }))} disabled={submittedItems[cat.id] || (activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(cat.id))} className={cn((activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(cat.id)) && "opacity-40 grayscale")} />
                  {!submittedItems[cat.id] && <button onClick={() => setItemToConfirm(cat.id)} className="text-[7px] font-black text-primary uppercase tracking-widest mt-1 label-text">LOCK MARKS</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <ScrollArea className="flex-1 px-4 pt-6">
        {partyId ? (
          <div className="flex flex-col gap-4 pb-10">
            {partyMessages?.map(m => (
              <div key={m.id} className={cn("flex flex-col", m.userId === user?.uid ? "items-end" : "items-start")}>
                <div className="p-3 rounded-2xl text-[11px] shadow-sm surface-low border max-w-[85%]">{m.text}</div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="space-y-4">
            {AGGR_CATEGORIES.map(cat => (
              <Card key={cat.id} className="p-6 bg-white border rounded-[2.5rem] shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div><h3 className="text-sm font-black uppercase italic">{cat.name}</h3><p className="text-[9px] text-muted-foreground uppercase">{cat.description}</p></div>
                  <span className="text-lg font-black text-primary">{scores[cat.id].toFixed(1)}%</span>
                </div>
                <Slider value={[scores[cat.id]]} max={100} step={0.1} onValueChange={v => setScores(p => ({ ...p, [cat.id]: v[0] }))} />
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {partyId && (
        <div className="p-4 bg-white border-t rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-center mb-4 mt-[-2.5rem] relative z-20">
            <Button variant={showScoreboard ? "glass" : "outline"} size="sm" onClick={() => setShowScoreboard(!showScoreboard)} className="h-10 px-6 rounded-full font-black text-[10px] uppercase italic gap-2 shadow-xl bg-white border-slate-200 text-primary hover:bg-white/90">
              <Gavel className="w-4 h-4" /> {showScoreboard ? 'CLOSE PANEL' : 'JUDGE PANEL'}
            </Button>
          </div>
          <div className="relative"><Input placeholder="Type technical hot-take..." value={comment} onChange={e => setComment(e.target.value)} className="rounded-2xl h-12 bg-slate-50 pr-12" /><Button className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl signature-gradient text-slate-950 hover:scale-[1.02] transition-transform" onClick={() => handleSendMessage(comment)} disabled={!comment.trim()}><Send className="w-4 h-4" /></Button></div>
        </div>
      )}

      <AlertDialog open={!!itemToConfirm} onOpenChange={o => !o && setItemToConfirm(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-10 max-w-[350px] shadow-2xl glass-card">
          <AlertDialogHeader><AlertDialogTitle className="uppercase italic font-black text-2xl text-center display-text text-primary">Confirm Marks?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-8"><AlertDialogAction className="w-full font-black uppercase italic h-16 text-lg signature-gradient text-slate-950 rounded-2xl hover:scale-[1.02] transition-transform shadow-xl" onClick={() => finalizeScore(itemToConfirm!)}>Lock Score</AlertDialogAction><AlertDialogCancel className="w-full font-black uppercase italic border-none text-muted-foreground h-10 text-[10px] tracking-widest hover:text-slate-600 transition-colors">Cancel</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}