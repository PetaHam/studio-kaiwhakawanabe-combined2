"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, Swords, Zap, 
  Users, Play, MousePointer2, Crown, Copy, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  legacyPerformances, 
  type KapaHakaItem, 
  KAPA_HAKA_ITEMS 
} from '@/lib/legacy-data'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc, increment, serverTimestamp, collection, query, where, limit, getDocs } from 'firebase/firestore'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'

const CLASH_DURATION = 20;

function PerformanceVideoPanel({ 
  src, 
  intensity = 0.5, 
  isOpponent = false,
  isManaSurge = false 
}: { 
  src?: string, 
  intensity?: number, 
  isOpponent?: boolean,
  isManaSurge?: boolean
}) {
  const brightness = 0.3 + (intensity * 1.2);
  const saturation = intensity * 1.5;
  const scale = 0.85 + (intensity * 0.35);
  const blur = (1 - intensity) * 4;

  return (
    <div 
      className={cn(
        "relative transition-all duration-300 rounded-[2rem] overflow-hidden border-4 bg-black/60 shadow-2xl flex-1 aspect-[3/4] max-w-[140px]",
        isOpponent ? "border-red-500/40" : "border-primary/40",
        intensity > 0.8 && !isOpponent && "ring-4 ring-primary ring-offset-4 ring-offset-background animate-pulse"
      )} 
      style={{ 
        transform: `scale(${scale})`,
        filter: `brightness(${brightness}) saturate(${saturation}) blur(${blur}px)`
      }}
    >
      {isManaSurge && (
        <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse scale-150 z-0" />
      )}
      {src ? (
        <video src={src} autoPlay muted loop playsInline className={cn("w-full h-full object-cover", isOpponent ? "-scale-x-100" : "")} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Users className="w-12 h-12 text-white/10" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}

export default function BattleArenaPage() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user])
  const { data: profile } = useDoc(userRef)

  const [opponentIdInput, setOpponentIdInput] = useState('')
  const [opponentProfile, setOpponentProfile] = useState<any | null>(null)
  const [isScouting, setIsScouting] = useState(false)

    const [battleState, setBattleState] = useState<'intro' | 'matchmaking' | 'roulette' | 'countdown' | 'clash' | 'finished'>('intro')
  const [rouletteIndex, setRouletteIndex] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedItem, setSelectedItem] = useState<KapaHakaItem | null>(null)
  
  const [playerScore, setPlayerScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [playerRoll, setPlayerRoll] = useState(0)
  const [opponentRoll, setOpponentRoll] = useState(0)
  const [showResults, setShowResults] = useState(false)
  
  const [countdown, setCountdown] = useState(3)
  const [isProcessing, setIsProcessing] = useState(false)

  const playerBracket = useMemo(() => profile?.currentDraft as Record<KapaHakaItem, string>, [profile])
  const playerPerf = useMemo(() => {
    if (!selectedItem || !playerBracket) return null;
    return legacyPerformances.find(p => p.id === playerBracket[selectedItem]);
  }, [selectedItem, playerBracket])

  const playerItemProficiency = useMemo(() => {
    if (!selectedItem || !playerPerf) return 50;
    return playerPerf.itemStats[selectedItem] || 50;
  }, [selectedItem, playerPerf]);

  const opponentBracket = useMemo(() => opponentProfile?.currentDraft as Record<KapaHakaItem, string>, [opponentProfile])
  const opponentPerf = useMemo(() => {
    if (!selectedItem || !opponentBracket) return null;
    return legacyPerformances.find(p => p.id === opponentBracket[selectedItem]) || legacyPerformances[0];
  }, [selectedItem, opponentBracket])

  const opponentItemProficiency = useMemo(() => {
    if (!selectedItem || !opponentPerf) return 50;
    return opponentPerf.itemStats[selectedItem] || 50;
  }, [selectedItem, opponentPerf]);

  const isHeritagePerf = useMemo(() => {
    if (!playerPerf) return false;
    return parseInt(playerPerf.year) < 1994 && playerPerf.tier === 'Legendary';
  }, [playerPerf]);

    const handleScoutOpponent = async () => {
    if (!opponentIdInput.trim() || isScouting) return;
    setIsScouting(true);
    try {
      const q = query(collection(db, 'users'), where('shortId', '==', opponentIdInput.trim().toUpperCase()), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast({ title: "Opponent Not Found", variant: "destructive" });
      } else {
        const data = snapshot.docs[0].data();
        if (data.id === user?.uid) {
          toast({ title: "Self-Clash Error", variant: "destructive" });
        } else if (!data.currentDraft) {
          toast({ title: "Draft Incomplete", variant: "destructive" });
        } else {
          setOpponentProfile(data);
          toast({ title: "Opponent Scouted!" });
        }
      }
    } catch (e) { console.error(e); } finally { setIsScouting(false); }
  }

  const handleRandomOpponent = async () => {
    if (isScouting) return;
    setIsScouting(true);
    try {
      const q = query(collection(db, 'users'), where('roopuName', '!=', ''), limit(15));
      const snapshot = await getDocs(q);
      const validDocs = snapshot.docs.filter(d => d.data().id !== user?.uid && d.data().currentDraft);
      if (validDocs.length === 0) {
        toast({ title: "No Opponents found", description: "Try again later.", variant: "destructive" });
      } else {
        const randomDoc = validDocs[Math.floor(Math.random() * validDocs.length)].data();
        setOpponentProfile(randomDoc);
        setOpponentIdInput(randomDoc.shortId || "RAN-DOM");
        toast({ title: "Random Opponent Found!" });
      }
    } catch(e) { console.error(e); } finally { setIsScouting(false); }
  }

  const startRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let speed = 50; let count = 0;
    const maxCount = 20 + Math.floor(Math.random() * 10);
    const spin = () => {
      setRouletteIndex(prev => (prev + 1) % KAPA_HAKA_ITEMS.length);
      count++;
      if (count < maxCount) { speed *= 1.1; setTimeout(spin, speed); }
      else { setIsSpinning(false); setSelectedItem(KAPA_HAKA_ITEMS[rouletteIndex]); }
    };
    spin();
  };

    useEffect(() => {
    if (battleState === 'clash' && selectedItem) {
      if (isHeritagePerf) {
        toast({ title: "MANA AUTHORITY DETECTED", description: "Automatic Victory.", duration: 3000 });
        setPlayerScore(100);
        setOpponentScore(0);
        setShowResults(true);
        setTimeout(() => setBattleState('finished'), 2500);
        return;
      }

      // Calculate initial variance rolls
      const pRoll = Math.floor(Math.random() * 11) - 5;
      const oRoll = Math.floor(Math.random() * 11) - 5;
      
      setPlayerRoll(pRoll);
      setOpponentRoll(oRoll);

      const pFinal = Math.max(0, Math.min(100, playerItemProficiency + pRoll));
      const oFinal = Math.max(0, Math.min(100, opponentItemProficiency + oRoll));
      
      // Dramatic delay before showing final smash scores
      const resultTimer = setTimeout(() => {
        setPlayerScore(pFinal);
        setOpponentScore(oFinal);
        setShowResults(true);
        
        // Wait on the final screen before advancing to finished state
        setTimeout(() => {
          setBattleState('finished');
        }, 3500);

      }, 2500);

      return () => clearTimeout(resultTimer);
    }
  }, [battleState, selectedItem, isHeritagePerf, playerItemProficiency, opponentItemProficiency]);

  useEffect(() => {
     if (battleState === 'finished' && !isProcessing) {
        setIsProcessing(true);
        // Only award shards once per match
        if (playerScore > opponentScore && user) {
           updateDocumentNonBlocking(doc(db, 'users', user.uid), {
               criticPoints: increment(50)
           });
           toast({ title: "VICTORY!", description: "+50 Mana Shards Acquired" });
        }
     }
  }, [battleState, playerScore, opponentScore, user, db, isProcessing]);

  const myJudgeID = profile?.shortId || user?.uid.slice(0, 6).toUpperCase();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col pb-24 touch-none select-none">
      <header className="p-4 flex items-center justify-between z-30 bg-background/80 backdrop-blur-md border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft /></Button>
        <Badge className="bg-primary text-white uppercase px-3 py-0.5">PVP ARENA</Badge>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-4 py-2 space-y-4 z-10 max-w-md mx-auto w-full flex flex-col">
        {battleState === 'intro' && (
          <Card className="p-8 text-center space-y-8 my-auto rounded-[3rem]">
            <Swords className="w-16 h-16 text-primary mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Ready to Battle?</h2>
              <p className="text-xs text-muted-foreground px-4">Scout a rival judge by their ID to begin the performance clash.</p>
            </div>
            <Button className="w-full h-20 text-xl font-black uppercase italic rounded-[2rem] bg-slate-950 text-white" onClick={() => setBattleState('matchmaking')}>FIND OPPONENT</Button>
            <Button variant="outline" className="w-full h-16 text-lg border-2 font-black uppercase italic rounded-2xl" onClick={async () => { await handleRandomOpponent(); if (!isScouting) setBattleState('matchmaking'); }}>BATTLE RANDOM SQUAD</Button>
          </Card>
        )}

        {battleState === 'matchmaking' && (
          <Card className="p-8 space-y-8 my-auto rounded-[3rem]">
            <div className="space-y-4 text-center">
              <div className="p-4 bg-slate-50 rounded-2xl border flex flex-col items-center gap-2">
                <p className="text-[8px] font-black uppercase text-slate-400">Your Judge ID</p>
                <span className="text-xl font-black italic text-primary uppercase">ID: {myJudgeID}</span>
              </div>
              <Input placeholder="Enter Rival Judge ID" value={opponentIdInput} onChange={(e) => setOpponentIdInput(e.target.value.toUpperCase())} className="h-16 text-2xl font-black text-center uppercase tracking-widest rounded-2xl" />
              {opponentProfile ? (
                <div className="p-6 rounded-3xl bg-green-50 border border-green-100 flex items-center gap-4">
                  <UserCheck className="w-6 h-6 text-green-500" />
                  <div className="text-left"><p className="text-[10px] font-black uppercase text-green-600">Synced</p><p className="text-sm font-black uppercase italic">{opponentProfile.roopuName}</p></div>
                </div>
              ) : (
                <Button disabled={!opponentIdInput || isScouting} onClick={handleScoutOpponent} className="w-full h-14 rounded-2xl">{isScouting ? 'SCANNING...' : 'INITIATE SCOUT'}</Button>
              )}
            </div>
            <Button disabled={!opponentProfile} onClick={() => { setBattleState('roulette'); startRoulette(); }} className="w-full h-20 text-xl font-black uppercase italic rounded-[2rem]">START BATTLE ROLL</Button>
          </Card>
        )}

        {battleState === 'roulette' && (
          <div className="space-y-6 flex-1 flex flex-col justify-center text-center">
            <h2 className="text-2xl font-black italic uppercase">Item Selection</h2>
            <div className="relative h-56 w-full flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                {KAPA_HAKA_ITEMS.map((item, idx) => (
                  <div key={item} className={cn("transition-all duration-300 w-full py-2 uppercase font-black italic", rouletteIndex === idx ? "bg-primary text-white scale-110 shadow-lg text-2xl" : "opacity-10 text-sm")}>{item}</div>
                ))}
              </div>
            </div>
            <Button disabled={isSpinning || !selectedItem} onClick={() => { setBattleState('countdown'); setCountdown(3); }} className="w-full h-20 rounded-[2rem] font-black uppercase italic text-xl">PERFORM {selectedItem?.toUpperCase()}</Button>
          </div>
        )}

                {battleState === 'clash' && (
          <div className="flex-1 flex flex-col space-y-4 relative">
            <h2 className="text-center font-black italic text-primary uppercase text-2xl animate-pulse tracking-widest">{selectedItem} Clash</h2>
            
            <div className="flex justify-between items-center px-2 gap-2 mt-4">
               <div className="flex flex-col items-center gap-2">
                 <PerformanceVideoPanel src={playerPerf?.videoUrl} intensity={0.8} />
                 <p className="text-[10px] font-black uppercase max-w-[120px] text-center">{playerPerf?.name || "Your Squad"}</p>
                 <Badge className="bg-primary">{playerItemProficiency} BASE</Badge>
               </div>
               
               <div className="p-3 rounded-full bg-slate-900 border-2 border-primary/50 shadow-xl z-20">
                 <Swords className="w-6 h-6 text-primary animate-bounce shadow-primary drop-shadow-[0_0_10px_rgba(255,69,0,0.8)]" />
               </div>
               
               <div className="flex flex-col items-center gap-2">
                 <PerformanceVideoPanel src={opponentPerf?.videoUrl} intensity={0.8} isOpponent />
                 <p className="text-[10px] font-black uppercase max-w-[120px] text-center">{opponentPerf?.name || "Rival Squad"}</p>
                 <Badge variant="outline">{opponentItemProficiency} BASE</Badge>
               </div>
            </div>

            <div className="flex justify-between px-6 mt-8">
              <div className="text-center space-y-1 animate-in slide-in-from-bottom-4 duration-700">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">RNG ROLL</p>
                 <p className={cn("text-5xl font-black italic", playerRoll >= 0 ? "text-green-500" : "text-red-500 max-w-[80px]")}>
                    {playerRoll > 0 ? `+${playerRoll}` : playerRoll}
                 </p>
              </div>
              <div className="text-center space-y-1 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">RNG ROLL</p>
                 <p className={cn("text-5xl font-black italic", opponentRoll >= 0 ? "text-green-500" : "text-red-500 max-w-[80px]")}>
                    {opponentRoll > 0 ? `+${opponentRoll}` : opponentRoll}
                 </p>
              </div>
            </div>
            
            {showResults && (
              <div className="absolute inset-0 -m-8 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center justify-center space-y-6 w-full px-6">
                   <p className="text-sm font-black uppercase tracking-[0.5em] text-primary animate-pulse">Final Verdict</p>
                   <div className="flex items-center justify-between w-full">
                     <div className="text-center">
                       <p className="text-7xl font-black italic text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]">{playerScore}</p>
                     </div>
                     <Swords className="w-12 h-12 text-slate-600 scale-150 rotate-12" />
                     <div className="text-center">
                       <p className="text-7xl font-black italic text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">{opponentScore}</p>
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {battleState === 'finished' && (
          <div className="text-center space-y-8 my-auto flex flex-col items-center">
            <Card className={cn("p-10 rounded-[3rem] border w-full", playerScore > opponentScore ? "bg-green-50" : "bg-white")}>
               <h2 className="text-5xl font-black uppercase italic leading-none">{playerScore > opponentScore ? "VICTORY" : "DEFEAT"}</h2>
               <p className="text-[10px] font-black uppercase text-primary mt-4">MATCH COMPLETE</p>
            </Card>
            <Button onClick={() => setBattleState('intro')} className="w-full h-16 text-lg font-black uppercase italic rounded-2xl shadow-xl">CHALLENGE AGAIN</Button>
          </div>
        )}
      </main>
    </div>
  )
}
