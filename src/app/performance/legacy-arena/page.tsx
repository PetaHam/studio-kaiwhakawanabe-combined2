"use client"

import React, { Suspense,  useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  History, Swords, Users, ShieldCheck, Zap, 
  Trophy, MessageSquare, Send, ChevronLeft, Plus, 
  Gavel, ChevronDown, ChevronUp, X, Lock, UserPlus, 
  Crown, CheckCircle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter 
} from '@/components/ui/dialog'
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { 
  doc, serverTimestamp, collection, 
  query, where, orderBy, limit
} from 'firebase/firestore'
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { DelegateJudgeModal } from '@/components/DelegateJudgeModal'
import { toast } from '@/hooks/use-toast'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'

const ADJUDICATION_ITEMS = [
  { id: 'whakaeke', name: 'Whakaeke' },
  { id: 'moteatea', name: 'Mōteatea' },
  { id: 'poi', name: 'Poi' },
  { id: 'waiata_a_ringa', name: 'Waiata-ā-ringa' },
  { id: 'haka', name: 'Haka' },
  { id: 'whakawatea', name: 'Whakawātea' }
];

const getRandomColor = (seed: string) => {
  const colors = ['#FF4500', '#1877F2', '#22C55E', '#A855F7', '#F59E0B', '#06B6D4', '#EC4899', '#10B981'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

function LegacyArenaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const { user } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user])
  const { data: profile } = useDoc(userRef)

  const [partyId, setPartyId] = useState<string | null>(null)
  const [newPartyName, setNewPartyName] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(() => searchParams?.get('action') === 'create')
  const [comment, setComment] = useState('')
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({
    whakaeke: 50, moteatea: 50, poi: 50, waiata_a_ringa: 50, haka: 50, whakawatea: 50
  })
  const [itemToConfirm, setItemToConfirm] = useState<string | null>(null)
  const [submittedItems, setSubmittedItems] = useState<Record<string, boolean>>({})

  const partiesQuery = useMemoFirebase(() => 
    user ? query(collection(db, 'parties'), where('performanceId', '==', 'legacy_arena'), limit(10)) : null, 
    [db, user]
  )
  const { data: activeParties } = useCollection(partiesQuery)

  const partyMessagesQuery = useMemoFirebase(() => 
    partyId ? query(collection(db, 'parties', partyId, 'messages'), orderBy('timestamp', 'asc'), limit(50)) : null,
    [db, partyId]
  )
  const { data: partyMessages } = useCollection(partyMessagesQuery)

  const currentMemberRef = useMemoFirebase(() => (partyId && user) ? doc(db, 'parties', partyId, 'members', user.uid) : null, [db, partyId, user])
  const { data: currentMember } = useDoc(currentMemberRef)

  const activePartyRef = useMemoFirebase(() => partyId ? doc(db, 'parties', partyId) : null, [db, partyId])
  const { data: activeParty } = useDoc(activePartyRef)

  const partyMembersQuery = useMemoFirebase(() => 
    partyId ? query(collection(db, 'parties', partyId, 'members'), orderBy('joinedAt', 'desc'), limit(20)) : null,
    [db, partyId]
  )
  const { data: partyMembers } = useCollection(partyMembersQuery)


  useEffect(() => { if (profile?.activePartyId && !partyId) setPartyId(profile.activePartyId) }, [profile, partyId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }) }, [partyMessages])

  const handleJoinParty = (id: string, isCreator: boolean = false) => {
    if (!user) { router.push('/login'); return; }
    const memberRef = doc(db, 'parties', id, 'members', user.uid)
    setDocumentNonBlocking(memberRef, { 
      userId: user.uid, 
      userName: user.displayName || 'Judge', 
      userColor: getRandomColor(user.uid), 
      isTyping: false, 
      joinedAt: serverTimestamp(),
      status: isCreator ? 'approved' : 'pending',
      assignedItems: isCreator ? ADJUDICATION_ITEMS.map(c => c.id) : []
    }, { merge: true })
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: id, updatedAt: serverTimestamp() })
    setPartyId(id)
  }

  const handleCreateParty = () => {
    if (!user || user.isAnonymous) { toast({ title: "Registration Required" }); router.push('/login'); return; }
    if (!newPartyName) return
    const newId = `chat_${Date.now()}`
    setDocumentNonBlocking(doc(db, 'parties', newId), { id: newId, name: newPartyName, leaderId: user.uid, performanceId: 'legacy_arena', status: 'live', createdAt: serverTimestamp() }, { merge: false })
    handleJoinParty(newId)
  }

  const handleSendMessage = (text: string) => {
    if (!user || !text || !partyId) return
    addDocumentNonBlocking(collection(db, 'parties', partyId, 'messages'), { userId: user.uid, userName: user.displayName || 'Judge', userColor: getRandomColor(user.uid), text: text.trim(), timestamp: serverTimestamp() })
    setComment('')
  }

  const finalizeScore = (itemId: string) => {
    setSubmittedItems(prev => ({ ...prev, [itemId]: true }));
    if (user && partyId) {
      const item = ADJUDICATION_ITEMS.find(c => c.id === itemId)?.name || itemId;
      handleSendMessage(`[LOCKED] ${item} score: ${scores[itemId].toFixed(1)}%`);
    }
    setItemToConfirm(null);
    toast({ title: "Score Locked!" });
  }

  const handleDisconnect = () => {
    if (!user || !partyId) return;
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { activePartyId: null, updatedAt: serverTimestamp() });
    deleteDocumentNonBlocking(doc(db, 'parties', partyId, 'members', user.uid));
    setPartyId(null);
  }

  const handleApproveMember = (memberUid: string) => {
    if (!partyId) return;
    const memberRef = doc(db, 'parties', partyId, 'members', memberUid)
    updateDocumentNonBlocking(memberRef, { status: 'approved', assignedItems: ADJUDICATION_ITEMS.map(c => c.id) })
    toast({ title: "Judge Approved!", description: "They can now contribute to scoring." })
  }

  const handleRejectMember = (memberUid: string) => {
    if (!partyId) return;
    deleteDocumentNonBlocking(doc(db, 'parties', partyId, 'members', memberUid))
    toast({ title: "Request Declined" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b pt-8 pb-4 flex items-center justify-between px-4 rounded-b-[2.5rem]">
        <DelegateJudgeModal partyId={partyId} isLeader={activeParty?.leaderId === user?.uid} />
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft /></Button>
        <div className="flex-1 px-2"><h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-950">GROUP ARENA</h1></div>
        {partyId && <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-7 w-7 rounded-full bg-red-50 text-red-500 absolute -top-4 -right-2"><X className="w-3.5 h-3.5" /></Button>}
      </header>

      {partyId && currentMember?.status === 'pending' && activeParty?.leaderId !== user?.uid ? (
        <div className="px-4 py-8 space-y-6 flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <Lock className="w-16 h-16 text-primary mb-6 animate-pulse" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 mb-2">Waiting Room</h2>
          <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
            Matataki is assigning your judge delegation items...
          </p>
          <Button variant="outline" onClick={handleDisconnect} className="mt-8 rounded-full h-12 px-6 font-black uppercase text-[10px] tracking-widest text-slate-500 ghost-border">Leave Lobby</Button>
        </div>
      ) : !partyId ? (
        <div className="px-4 py-8 space-y-6 flex-1">
          <Card className="bg-primary/5 border-dashed p-8 text-center space-y-6 rounded-[3rem] shadow-xl">
            <Users className="w-12 h-12 text-primary mx-auto" />
            <div className="space-y-2"><h2 className="text-xl font-black uppercase italic text-slate-950 display-text">Sync Panel Lobby</h2><p className="text-xs text-muted-foreground">Gather the panel to discuss archival performance technicalities.</p></div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogTrigger asChild><Button className="w-full h-12 font-black uppercase italic text-slate-950 signature-gradient">CREATE HOST LOBBY</Button></DialogTrigger><DialogContent className="max-w-[350px] rounded-[3rem] glass-card"><DialogHeader><DialogTitle className="uppercase italic font-black text-xl display-text">Create Room</DialogTitle></DialogHeader><div className="py-4"><Input placeholder="Enter Lobby Name" value={newPartyName} onChange={e => setNewPartyName(e.target.value)} className="bg-surface-low h-12 rounded-xl" /></div><DialogFooter><Button className="w-full font-black uppercase italic h-12 signature-gradient" onClick={handleCreateParty}>Open Lobby</Button></DialogFooter></DialogContent></Dialog>
            {(activeParties?.length ?? 0) > 0 && (
              <div className="space-y-3 pt-4 border-t text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center mb-4">ACTIVE LOBBIES</p>
                {(activeParties || []).map(p => (
                  <Button key={p.id} variant="outline" className="justify-between h-14 w-full rounded-[2rem] surface-low border ghost-border" onClick={() => handleJoinParty(p.id)}>{p.name}<Badge variant="outline" className="text-[8px] font-black">JOIN</Badge></Button>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in">
          {activeParty?.leaderId === user?.uid && partyMembers && partyMembers.length > 1 && user && (
            <div className="px-4 py-3 bg-surface-low border-b ghost-border animate-in slide-in-from-top-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Panel Members ({partyMembers.length})</p>
              </div>
              <ScrollArea className="max-h-24">
                <div className="flex flex-col gap-2">
                  {partyMembers.filter(m => m.userId !== user.uid).map(member => (
                    <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg bg-white border shadow-sm ambient-shadow">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                          style={{ backgroundColor: member.userColor || '#6B7280' }}
                        >
                          {member.userName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold">{member.userName}</span>
                          <div className="flex items-center gap-1">
                            {member.status === 'pending' ? (
                              <><Clock className="w-2.5 h-2.5 text-amber-500" /><span className="text-[7px] text-amber-600 font-black uppercase">Pending</span></>
                            ) : (
                              <><CheckCircle className="w-2.5 h-2.5 text-green-500" /><span className="text-[7px] text-green-600 font-black uppercase">Approved</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      {member.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 rounded-full bg-green-50 hover:bg-green-100"
                            onClick={() => handleApproveMember(member.userId)}
                          >
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 rounded-full bg-red-50 hover:bg-red-100"
                            onClick={() => handleRejectMember(member.userId)}
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          {showScoreboard && (
            <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-4 bg-surface-low border-b ghost-border">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {ADJUDICATION_ITEMS.map(item => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[9px] font-black uppercase italic">{item.name}</label><span className="text-[10px] font-black text-primary">{scores[item.id].toFixed(1)}%</span></div>
                    {!submittedItems[item.id] && itemToConfirm === item.id && (
                      <div className="relative z-10">
                        <Button onClick={() => finalizeScore(item.id)} className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-primary text-slate-950 rounded-lg mb-1 shadow-lg animate-in slide-in-from-top-2">CONFIRM SCORE</Button>
                      </div>
                    )}
                    <Slider value={[scores[item.id]]} max={100} step={0.1} onValueChange={v => { setScores(p => ({ ...p, [item.id]: v[0] })); setItemToConfirm(item.id); }} disabled={submittedItems[item.id] || (activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(item.id))} className={cn(activeParty?.leaderId !== user?.uid && !currentMember?.assignedItems?.includes(item.id) && "opacity-40 grayscale")} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <ScrollArea className="flex-1 px-4 pt-6">
            <div className="flex flex-col gap-4 pb-10">
              {partyMessages?.map(m => (
                <div key={m.id} className={cn("flex flex-col", m.userId === user?.uid ? "items-end" : "items-start")}>
                  <div className="p-3 rounded-2xl text-[11px] shadow-sm surface-low border max-w-[85%]">{m.text}</div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          <div className="p-4 bg-white border-t rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex justify-center mb-4 mt-[-2.5rem] relative z-20">
              <Button variant="outline" size="sm" onClick={() => setShowScoreboard(!showScoreboard)} className="h-10 px-6 rounded-full font-black text-[10px] uppercase italic gap-2 shadow-xl bg-white border-slate-200 text-primary hover:bg-white/90">
                <Gavel className="w-4 h-4" /> {showScoreboard ? 'CLOSE PANEL' : 'JUDGE PANEL'}
              </Button>
            </div>
            <div className="relative"><Input placeholder="Type technical hot-take..." value={comment} onChange={e => setComment(e.target.value)} className="rounded-2xl h-14 bg-slate-50 pr-14" /><Button className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 p-0 rounded-xl bg-primary text-slate-950" onClick={() => handleSendMessage(comment)} disabled={!comment.trim()}><Send className="w-4 h-4" /></Button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LegacyArenaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center animate-pulse"><div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <LegacyArenaContent />
    </Suspense>
  )
}