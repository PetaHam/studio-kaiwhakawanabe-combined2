"use client"

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  BarChart3, Heart, ChevronRight, Gavel, 
  Vote, History as HistoryIcon, Check, Flame, Zap, LayoutDashboard, X, ShoppingCart, MessageSquare, Layers, ShieldCheck, Swords, Users, Calendar, GraduationCap, Settings as SettingsIcon, UserCircle, Copy, User, Lock
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from '@/firebase'
import { doc, collection, query, orderBy, limit, serverTimestamp, increment, arrayUnion, where } from 'firebase/firestore'
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { legacyPerformances, type LegacyPerformance } from '@/lib/legacy-data'
import { UnlockReveal } from '@/components/UnlockReveal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UnifiedStoreModal } from '@/components/UnifiedStoreModal'
import { FollowGroupsModal } from '@/components/FollowGroupsModal'
import { JudgesHonourCard, JudgesHonourModal } from '@/components/JudgesModal'

const IS_SEASON_ACTIVE = true;

const JUDGE_QUOTES = [
  "May ye judge fairly and true… or y'know, just go full Reddit mod and ban whoever hurt your feelings that day.",
  "May your judgments be fair and true… failing that, at least make them entertainingly unhinged.",
  "May ye judge fairly and with an open heart… lol jk, bring your pitchforks and confirmation bias, it's quicker.",
  "May ye judge fairly and true… or wildly misread the situation and then die on that hill like a legend.",
  "May your rulings be just and true… or at minimum, spelled correctly when you send them out.",
  "May ye judge fairly and with an open heart… lol jk, bring pitchforks and confirmation bias, it's quicker.",
  "May ye judge fairly and true… or just pick whoever has the cutest profile picture, we're not solving world peace here.",
  "May your judgment be fair, true, and merciful… said no one who's ever been in a group chat.",
  "May ye judge fairly and true… or at least pretend you read the whole post before you start typing in all caps.",
  "May ye judge with fairness and truth… or just blame the Virgo in the room and call it a day.",
  "May your verdicts be equitable and accurate… or hilariously wrong in ways historians will study for centuries.",
  "May ye judge fairly and true… unless they said \"unalive\" unironically, then all bets are off.",
  "May ye judge with integrity and truth… or just stan whoever owns the most cats, it's basically the same thing."
];



const scoringPulse = [
  { item: "Whakaeke", team: "Te Kapa Haka o Ngāti Whakaue", avg: 88, color: "bg-primary" },
  { item: "Mōteatea", team: "Te Iti Kahurangi", avg: 92, color: "bg-primary" },
  { item: "Waiata-ā-ringa", team: "Whāngāra Mai Tawhiti", avg: 85, color: "bg-primary" },
  { item: "Poi", team: "Angitū", avg: 94, color: "bg-primary" },
  { item: "Haka", team: "Te Mātārae I Orehu", avg: 97, color: "bg-primary" },
  { id: 'whakawatea', item: "Whakawātea", team: "Opotiki Mai Tawhiti", avg: 89, color: "bg-primary" },
]

function PollCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const nextRollover = new Date(now);
      if (now.getHours() < 12) {
        nextRollover.setHours(12, 0, 0, 0);
      } else {
        nextRollover.setDate(nextRollover.getDate() + 1);
        nextRollover.setHours(0, 0, 0, 0);
      }
      
      const distance = nextRollover.getTime() - now.getTime();
      setTimeLeft({
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="text-[10px] font-black uppercase tracking-widest text-primary mt-1 bg-primary/10 px-3 py-1 rounded-full animate-in fade-in transition-all">
      ROLLS OVER IN {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const [confirmingOption, setConfirmingOption] = useState<string | null>(null);
  const [isConfirmingVote, setIsConfirmingVote] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isFollowGroupsOpen, setIsFollowGroupsOpen] = useState(false);
  const [isJudgesModalOpen, setIsJudgesModalOpen] = useState(false);
  const [isJudgeModeOpen, setIsJudgeModeOpen] = useState(false);
  const [recentlyWonRoopu, setRecentlyWonRoopu] = useState<LegacyPerformance | null>(null);
  const [dailyPollId, setDailyPollId] = useState<string>('');
  const [dailyPollOptions, setDailyPollOptions] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * JUDGE_QUOTES.length));
  }, []);

  useEffect(() => {
    const now = new Date();
    const isAm = now.getHours() < 12;
    const pollId = `poll_12h_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${isAm ? 'AM' : 'PM'}`;
    setDailyPollId(pollId);

    const ALLOWED_CATEGORIES = ['Waiata Tira', 'Whakaeke', 'Mōteatea', 'Waiata-ā-ringa', 'Poi', 'Haka'];

    const pool: any[] = [];
    legacyPerformances.forEach(p => {
      p.notableItems.forEach(item => {
        if (item.includes('(1st)') || item.includes('(1st=)')) {
          const cleanItem = item.replace(/\s*\(1st=*\)/, '').trim();
          const finalItem = cleanItem === 'Choral' || cleanItem.toLowerCase() === 'waiata tita' ? 'Waiata Tira' : cleanItem;
          
          if (!ALLOWED_CATEGORIES.includes(finalItem)) return;

          pool.push({
            id: `${p.id}-${finalItem.toLowerCase().replace(/\s+/g, '-')}`,
            team: p.name,
            item: finalItem,
            year: p.year,
            image: p.image
          });
        }
      });
    });

    const periodMultiplier = isAm ? 1 : 2;
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 1000 + now.getDate() * 10 + periodMultiplier;
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const selected: any[] = [];
    const tempPool = [...pool];
    let currentSeed = seed;
    
    for (let i = 0; i < 3 && tempPool.length > 0; i++) {
      const index = Math.floor(seededRandom(currentSeed) * tempPool.length);
      selected.push(tempPool.splice(index, 1)[0]);
      currentSeed += 1;
    }
    setDailyPollOptions(selected);
  }, []);

  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    if (user && profile && !profile.shortId) {
      const shortId = user.uid.slice(0, 6).toUpperCase();
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        shortId: shortId,
        updatedAt: serverTimestamp()
      });
    }
  }, [user, profile, db]);

  const pollVotesRef = useMemoFirebase(() => {
    if (isUserLoading || !dailyPollId) return null;
    return collection(db, 'polls', dailyPollId, 'votes');
  }, [db, dailyPollId, isUserLoading]);
  const { data: pollVotes } = useCollection(pollVotesRef);

  const userVoteRef = useMemoFirebase(() => {
    if (isUserLoading || !user || !dailyPollId) return null;
    return doc(db, 'polls', dailyPollId, 'votes', user.uid);
  }, [db, user, dailyPollId, isUserLoading]);
  const { data: userVote } = useDoc(userVoteRef);

  const pollResults = useMemo(() => {
    if (!pollVotes || !dailyPollOptions.length) return {};
    const tallies: Record<string, number> = {};
    dailyPollOptions.forEach(opt => tallies[opt.id] = 0);
    pollVotes.forEach(v => {
      if (tallies[v.optionId] !== undefined) tallies[v.optionId]++;
    });
    return tallies;
  }, [pollVotes, dailyPollOptions]);

  const totalPollVotes = useMemo(() => Object.values(pollResults).reduce((a, b) => a + b, 0), [pollResults]);

  const topJudgesQuery = useMemoFirebase(() => {
    if (isUserLoading) return null;
    return query(collection(db, 'users'), orderBy('receivedHearts', 'desc'), limit(5));
  }, [db, isUserLoading]);
  const { data: topJudges } = useCollection(topJudgesQuery);

  useEffect(() => {
    if (!user || !profile) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLoginAt = profile.lastLoginAt ? new Date(profile.lastLoginAt) : null;
    if (lastLoginAt) lastLoginAt.setHours(0, 0, 0, 0);

    if (!lastLoginAt || today.getTime() !== lastLoginAt.getTime()) {
      const uRef = doc(db, 'users', user.uid);
      const newStreak = (profile.streakCount || 0) + 1;
      const baseReward = newStreak % 7 === 0 ? 10050 : 50;
      const shardsReward = IS_SEASON_ACTIVE ? baseReward * 2 : baseReward;

      updateDocumentNonBlocking(uRef, {
        lastLoginAt: new Date().toISOString(),
        streakCount: newStreak,
        dailyTasksCompleted: arrayUnion('daily_haka'), 
        criticPoints: increment(shardsReward), 
        updatedAt: serverTimestamp()
      });
    }
  }, [user, profile, db]);

  const handleVote = (optionId: string) => {
    if (!user || !dailyPollId) return;
    const voteRef = doc(db, 'polls', dailyPollId, 'votes', user.uid);
    setDocumentNonBlocking(voteRef, { userId: user.uid, optionId, timestamp: serverTimestamp() }, { merge: true });
    
    if (!user.isAnonymous) {
      if (!profile?.dailyTasksCompleted?.includes('voter_status')) {
        updateDocumentNonBlocking(userRef!, { dailyTasksCompleted: arrayUnion('voter_status'), criticPoints: increment(100), updatedAt: serverTimestamp() });
      }
      toast({ title: "Vote Cast!", description: "Voice recorded. +100 Shards awarded!" });
    } else {
      toast({ title: "Vote Cast!", description: "Your voice contributes to the Global Pulse. Sign in to collect Shards!" });
    }
  };

  const handleBuyMana = (pack: any) => {
    if (!user) return;
    if (user.isAnonymous) {
      toast({ title: "Registration Required", description: "Purchasing shards requires a permanent account.", variant: "destructive" });
      router.push('/login?returnUrl=/');
      return;
    }
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { purchasedMana: increment(pack.mana), updatedAt: serverTimestamp() });
    toast({ title: "Shards Purchased!", description: `${pack.mana} Mana Shards added to your pool.` });
  }

  const totalShards = useMemo(() => {
    const points = profile?.criticPoints || 0
    const hearts = profile?.receivedHearts || 0
    const purchased = profile?.purchasedMana || 0
    return points + (hearts * 100) + purchased
  }, [profile])

  const availableShards = useMemo(() => {
    const spent = profile?.manaSpent || 0
    return totalShards - spent
  }, [totalShards, profile])

  const handleCopyID = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = profile?.shortId || user?.uid.slice(0, 6).toUpperCase();
    if (id) {
      navigator.clipboard.writeText(id);
      toast({ title: "ID Copied!", description: "Ready for PVP matchmaking." });
    }
  };

  const dailyRituals = [
    { id: 'daily_haka', label: 'Daily Haka', sub: 'Login', shards: IS_SEASON_ACTIVE ? 100 : 50, completed: profile?.dailyTasksCompleted?.includes('daily_haka') },
    { id: 'voter_status', label: 'Collective Voice', sub: 'Vote in Poll', shards: 100, completed: !!userVote },
    { id: 'daily_draw', label: 'Te Kete Tuauri', sub: 'Daily Prize Draw', shards: 'LUCK', completed: profile?.dailyTasksCompleted?.includes('daily_draw') },
    { id: 'academy_scholar', label: 'Academy Scholar', sub: 'Study Academy', shards: IS_SEASON_ACTIVE ? 200 : 100, completed: profile?.dailyTasksCompleted?.includes('academy_scholar') }
  ];

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-in fade-in duration-1000">
        <div className="flex flex-col items-center gap-4">
          <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[progress_2s_infinite]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Syncing Station...</p>
        </div>
      </div>
    );
  }

  const judgeID = profile?.shortId || user?.uid.slice(0, 6).toUpperCase();

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-300">
      <UnifiedStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
      <FollowGroupsModal isOpen={isFollowGroupsOpen} onClose={() => setIsFollowGroupsOpen(false)} />
      <JudgesHonourModal isOpen={isJudgesModalOpen} onClose={() => setIsJudgesModalOpen(false)} />
      <UnlockReveal performance={recentlyWonRoopu} onClose={() => setRecentlyWonRoopu(null)} />

      <div className={cn(
        "sticky top-4 z-40 transition-all duration-500 ease-in-out px-1 flex items-center gap-2",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
      )}>
        <div 
          id="tour-dashboard-trigger"
          onClick={() => setIsHubOpen(true)}
          className="flex-1 p-4 bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-2xl active:scale-95 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase text-slate-950 dark:text-white tracking-widest leading-none">ID: {judgeID}</p>
                <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">
                {availableShards} Shards • Streak {profile?.streakCount || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              onClick={handleCopyID}
              className="bg-primary/5 text-primary font-black italic text-[9px] h-6 px-3 border-primary/20 rounded-full flex items-center gap-1.5 hover:bg-primary hover:text-white transition-all"
            >
              COPY ID <Copy className="w-2.5 h-2.5" />
            </Badge>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
        </div>
        <Button 
          onClick={() => setIsStoreOpen(true)}
          className="w-[72px] h-[80px] rounded-[2.5rem] bg-white/80 backdrop-blur-lg border border-slate-200/50 shadow-2xl flex items-center justify-center hover:bg-primary hover:text-white transition-all text-primary shrink-0 group"
        >
          <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      {!isUserLoading && user?.isAnonymous && (
        <section className="px-1 animate-in slide-in-from-top-4 duration-700">
          <Card className="border-2 border-dashed border-primary/40 bg-primary/5 rounded-[2.5rem] overflow-hidden group shadow-xl">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary text-white shadow-lg ring-4 ring-primary/10">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[11px] font-black uppercase italic text-slate-950 dark:text-white leading-none tracking-tight">GUEST ACCESS ACTIVE</h3>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Sign in to sync shards and repertoire across devices.</p>
                </div>
              </div>
              <Link href="/login?returnUrl=/">
                <Button size="sm" className="h-10 px-5 rounded-full font-black text-[10px] uppercase italic bg-primary-container text-on-primary-container hover:scale-[1.02] transition-all shadow-lg active:scale-95">
                  SIGN IN <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      <header id="tour-header" className="flex flex-col items-center text-center gap-8">
        <div className="flex justify-center w-full px-4">
          <div 
            id="tour-judge-card" 
            className="group cursor-pointer"
            onClick={() => setIsJudgeModeOpen(true)}
          >
            <div className="w-64 h-64 rounded-full bg-primary border-4 border-primary/20 shadow-[0_0_60px_rgba(255,69,0,0.3)] flex flex-col items-center justify-center text-center p-8 transition-all hover:scale-105 active:scale-95 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center opacity-10 scale-150">
                <MessageSquare className="w-full h-full text-white rotate-12" />
              </div>
              <MessageSquare className="w-20 h-20 text-white mb-4 relative z-10 animate-in zoom-in-50 duration-500" />
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight relative z-10">START<br/>JUDGING</h2>
              <div className="absolute bottom-6 w-full flex justify-center">
                <div className="h-1 w-8 bg-white/30 rounded-full group-hover:w-12 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {user && !user.isAnonymous && (!profile?.favoriteTeamIds || profile.favoriteTeamIds.length === 0) && (
          <div className="w-full px-4 mt-6 animate-in slide-in-from-bottom-8 duration-700">
            <Card className="border-2 border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden group shadow-sm cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setIsFollowGroupsOpen(true)}>
              <CardContent className="p-6 flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <div className="p-3 rounded-2xl bg-primary text-white shadow-md ring-4 ring-primary/10">
                     <Heart className="w-5 h-5" />
                   </div>
                   <div className="space-y-1 text-left">
                     <h3 className="text-[11px] font-black uppercase italic text-slate-950 dark:text-white leading-none tracking-tight">REGIONAL ALLIANCES</h3>
                     <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Sync your favorite roopu</p>
                   </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="w-full max-sm px-1 space-y-4 mt-8">
          <div className="min-h-[3rem] flex items-center justify-center px-8 mb-4">
            <p key={quoteIndex} className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed text-center animate-in fade-in duration-1000">
              {JUDGE_QUOTES[quoteIndex]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="cursor-pointer" onClick={() => {
              if (user?.isAnonymous) {
                toast({ title: "Registration Required", description: "Live Lobbies are reserved for registered judges. Please link an email in Settings." });
              } else {
                router.push('/performance/legacy-arena');
              }
            }}>
              <Card id="tour-party-card" className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-primary/5 transition-colors">
                      <MessageSquare className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black text-slate-950 dark:text-white italic uppercase tracking-[0.2em] leading-none">CHAT PARTY</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight tracking-wider px-2">Gather the panel. Discuss hot-takes in real-time.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Link href="/matchups">
              <Card id="tour-draft-card" className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-primary/5 transition-colors">
                      <Layers className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black text-slate-950 dark:text-white italic uppercase tracking-[0.2em] leading-none">DRAFT</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight tracking-wider px-2">Build your ultimate performance here and crush the competition in PVP battles.</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/events">
              <Card className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-primary/5 transition-colors">
                      <Calendar className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black text-slate-950 dark:text-white italic uppercase tracking-[0.2em] leading-none">CIRCUIT MAP</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight tracking-wider px-2">Track regional finals and the road to Te Matatini 2027.</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/profile">
              <Card id="tour-settings-card" className="bg-white border border-slate-200 shadow-sm hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-primary/5 transition-colors">
                      <SettingsIcon className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black text-slate-950 dark:text-white italic uppercase tracking-[0.2em] leading-none">SETTINGS</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight tracking-wider px-2">Manage your persona, theme, and tactical preferences.</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </header>

      {/* Adjudication Mode Dialog */}
      <Dialog open={isJudgeModeOpen} onOpenChange={setIsJudgeModeOpen}>
        <DialogContent className="rounded-[3rem] bg-white border border-slate-200 p-0 overflow-hidden shadow-2xl max-w-[360px]">
          <div className="h-2 w-full bg-primary" />
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="uppercase italic font-black text-2xl text-center text-slate-950">Select Adjudication Mode</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center">How would you like to judge today?</DialogDescription>
          </DialogHeader>
          <div className="p-8 pt-4 space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-24 rounded-3xl border-2 hover:border-primary flex items-center justify-start gap-5 px-6 group transition-all"
              onClick={() => router.push('/vote')}
            >
              <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                <User className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase italic text-slate-950">Solo Judging</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-tight label-text">Standard live circuit voting</p>
              </div>
              {user?.isAnonymous && (
                <div className="absolute top-2 right-4">
                  <Badge className="heritage-badge text-[7px] font-black uppercase">Registered Only</Badge>
                </div>
              )}
            </Button>

            <Button 
              variant="outline" 
              className={cn(
                "w-full h-24 rounded-3xl border-2 hover:border-primary flex items-center justify-start gap-5 px-6 group transition-all relative overflow-hidden",
                user?.isAnonymous && "opacity-80 grayscale"
              )}
              onClick={() => {
                if (user?.isAnonymous) {
                  toast({ title: "Registration Required", description: "Group Judging is reserved for registered judges. Please link an email in Settings." });
                } else {
                  router.push('/performance/legacy-arena');
                }
              }}
            >
              <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                {user?.isAnonymous ? <Lock className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase italic text-slate-950">Group Judging</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-tight label-text">
                  {user?.isAnonymous ? "Sign in to sync panel" : "Sync panel marks in real-time"}
                </p>
              </div>
              {user?.isAnonymous && (
                <div className="absolute top-2 right-4">
                  <Badge className="heritage-badge text-[7px] font-black uppercase">Registered Only</Badge>
                </div>
              )}
            </Button>
          </div>
          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <Button variant="ghost" className="w-full font-black uppercase italic rounded-xl text-slate-400 text-xs" onClick={() => setIsJudgeModeOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section id="tour-poll" className="space-y-4 px-1">
        <div className="flex flex-col items-center text-center gap-1">
          <h2 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-950 dark:text-white">
            <HistoryIcon className="w-4 h-4 text-primary" /> DAILY ITEM POLL
          </h2>
          <PollCountdown />
        </div>

        <div className="space-y-2 px-1">
          {dailyPollOptions.map((opt) => {
            const isVoted = userVote?.optionId === opt.id;
            const voteCount = pollResults[opt.id] || 0;
            const percentage = totalPollVotes > 0 ? Math.round((voteCount / totalPollVotes) * 100) : 0;
            return (
              <div 
                key={opt.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-3xl border transition-all shadow-sm",
                  isVoted ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 bg-white"
                )}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-[9px] font-black text-slate-950 dark:text-white uppercase italic truncate leading-tight mb-1">
                    {opt.team}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">{opt.year}</span>
                    <Badge className="bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full px-2 py-0.5 border-none shadow-none h-auto shrink-0">
                      {opt.item}
                    </Badge>
                  </div>
                </div>

                <div className="shrink-0">
                  {userVote || totalPollVotes > 0 ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black italic text-primary tabular-nums">{percentage}%</span>
                        {isVoted && <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <Progress value={percentage} className="h-1 w-16 bg-slate-100" indicatorClassName="bg-primary" />
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => setConfirmingOption(opt.id)}
                      className="h-9 px-5 rounded-full font-black text-[10px] uppercase italic bg-primary-container text-on-primary-container hover:scale-[1.02] transition-all shadow-lg active:scale-95"
                    >
                      VOTE
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-1 space-y-4">
        <div className="text-center space-y-0.5">
          <h2 className="text-sm font-black uppercase italic tracking-tight text-slate-950 dark:text-white flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> GLOBAL PULSE
          </h2>
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em]">TEAM ITEM LEADERS</p>
        </div>
        <Card className="border border-slate-200 bg-white shadow-sm p-5 rounded-[2rem]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {scoringPulse.map((s) => (
              <div key={s.item} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.1em] leading-none truncate">{s.item}</p>
                    <p className="text-[9px] font-black text-slate-950 dark:text-white uppercase italic truncate">{s.team}</p>
                  </div>
                  <span className="text-[11px] font-black text-primary italic leading-none tabular-nums ml-1">{s.avg}%</span>
                </div>
                <Progress value={s.avg} className="h-0.5 bg-slate-100" indicatorClassName="bg-primary" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="px-1 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black uppercase italic text-center text-slate-950 dark:text-white flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-primary" /> HALL OF FAME
          </h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">ELITE ADJUDICATORS</p>
        </div>
        <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-[3rem]">
          {topJudges?.map((hero, i) => (
            <Link key={hero.id} href={`/profile/${hero.id}`} className="block border-b last:border-0 border-slate-100 hover:bg-slate-50 transition-all group">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-4 border-white shadow-md group-hover:scale-105 transition-transform ring-2 ring-primary/20">
                      <AvatarImage src={hero.profileImageUrl || `https://picsum.photos/seed/${hero.id}/100/100`} className="object-cover" />
                      <AvatarFallback className="font-black text-lg">{hero.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -left-1 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-black uppercase italic text-slate-950 dark:text-white leading-none">{hero.displayName}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-primary" /> RANKED JUDGE
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5 text-xl font-black text-primary italic tabular-nums leading-none">
                    <Heart className="w-5 h-5 fill-primary" /> {hero.receivedHearts || 0}
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">TOTAL LUV</p>
                </div>
              </div>
            </Link>
          ))}
        </Card>
      </section>


        <div className="w-full px-4 mt-2 animate-in slide-in-from-bottom-9 duration-700">
          <JudgesHonourCard onOpen={() => setIsJudgesModalOpen(true)} />
        </div>

      <Dialog open={isHubOpen} onOpenChange={setIsHubOpen}>
        <DialogContent className="rounded-[3rem] bg-white border border-slate-200 p-0 overflow-hidden shadow-2xl max-w-[380px] h-[85vh] flex flex-col">
          <div className="h-2 w-full bg-primary" />
          <div className="p-8 flex items-center justify-between border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-950 leading-none">Judge Hub</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactical Dashboard</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-slate-50" onClick={() => setIsHubOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-8 space-y-8">
            <div className="space-y-8 pb-10">
              <div className="p-6 bg-slate-900 rounded-[2.5rem] border border-slate-800 flex flex-col items-center gap-2 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-all" />
                <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-1">Station Status</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-black italic text-white uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    ID: {judgeID}
                  </p>
                  <Button variant="ghost" size="icon" onClick={handleCopyID} className="h-8 w-8 text-primary hover:bg-white/10 rounded-full">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Global Pulse Connectivity: 100%</p>
                </div>
              </div>

              {user && (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Mana Shards</p>
                        <p className="text-3xl font-black italic text-slate-950 tabular-nums">{availableShards}</p>
                      </div>
                    </div>
                    {!user.isAnonymous && (
                      <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => {}}>
                        <ShoppingCart className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {user && (
                <div id="tour-rituals" className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-1">
                    <HistoryIcon className="w-4 h-4" /> Daily Rituals
                  </h3>
                  <div className="space-y-3">
                    {dailyRituals.map((ritual) => (
                      <div 
                        key={ritual.id} 
                        className={cn(
                          "flex items-center justify-between p-5 rounded-[2rem] border transition-all",
                          ritual.completed ? "bg-green-50 border-green-100" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border",
                            ritual.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-200 text-slate-300"
                          )}>
                            {ritual.completed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-20" />}
                          </div>
                          <div>
                            <p className={cn("text-[11px] font-black uppercase italic leading-none tracking-tight", ritual.completed ? "text-slate-950" : "text-slate-400")}>{ritual.label}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{ritual.sub}</p>
                          </div>
                        </div>
                        <Badge variant={ritual.completed ? "default" : "outline"} className={cn("text-[9px] font-black uppercase italic border-none h-7 px-3 rounded-full", ritual.completed ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500")}>
                          {typeof ritual.shards === 'number' ? `+${ritual.shards}` : ritual.shards}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {IS_SEASON_ACTIVE && (
                <div className="p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 animate-mana-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-primary/20">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-primary uppercase tracking-widest">Qualifying Season Live</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">2X Shards Surplus active stadium-wide.</p>
                    </div>
                  </div>
                  <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black italic uppercase text-[10px] shadow-lg border-none" onClick={() => { setIsHubOpen(false); router.push('/events'); }}>View Circuit Map</Button>
                </div>
              )}


            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <Button className="w-full h-14 font-black uppercase italic rounded-2xl shadow-xl text-slate-950" onClick={() => setIsHubOpen(false)}>
              Back to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmingOption} onOpenChange={(open) => !open && setConfirmingOption(null)}>
        <AlertDialogContent className="rounded-[2.5rem] bg-white border border-slate-200 p-10 max-w-[360px] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase italic font-black text-2xl text-center text-primary leading-tight">CONFIRM VOTE?</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] font-bold text-center text-slate-500 leading-relaxed uppercase tracking-widest pt-4">
              Commit your daily voice to this performance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-10">
            <AlertDialogAction className="w-full font-black uppercase italic h-16 text-lg bg-primary-container text-on-primary-container rounded-[2rem] shadow-xl active:scale-95 transition-all hover:scale-[1.02]" onClick={() => { handleVote(confirmingOption!); setConfirmingOption(null); }}>CONFIRM VOTE</AlertDialogAction>
            <AlertDialogCancel className="w-full font-black uppercase italic border-none text-muted-foreground h-12 text-[10px] tracking-widest hover:text-slate-600 transition-colors">MAYBE LATER</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}