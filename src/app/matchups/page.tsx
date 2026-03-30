"use client"

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
 History as HistoryIcon, Plus, Trash2, Swords, Search,
 Lock, Crown, ShoppingCart,
 ShieldCheck, ChevronRight, ChevronLeft, Users,
 Award, Zap, Flame, Target, Edit3, Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { legacyPerformances, type LegacyPerformance, KAPA_HAKA_ITEMS, type KapaHakaItem } from '@/lib/legacy-data'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { toast } from '@/hooks/use-toast'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { UnlockReveal } from '@/components/UnlockReveal'
import { useRouter } from 'next/navigation'
import { MANA_PACKS } from '@/components/StoreModal'

const TIER_COSTS = {
 'S-Tier': 100000,
 'Legendary': 75000,
 'Ultimate': 50000,
 'Elite': 15000,
 'Epic': 5000,
 'Contender': 1000
};

const TIER_ORDER = {
 'Contender': -1,
 'Epic': 0,
 'Elite': 1,
 'Ultimate': 2,
 'Legendary': 3,
 'S-Tier': 4
};

export default function MatchupsPage() {
 const router = useRouter()
 const { user } = useUser()
 const db = useFirestore()
  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user])
 const { data: profile } = useDoc(userRef)

 const [search, setSearch] = useState('')
 const [teamToUnlock, setTeamToUnlock] = useState<LegacyPerformance | null>(null)
 const [isStoreOpen, setIsStoreOpen] = useState(false)
 const [activeSlot, setActiveSlot] = useState<KapaHakaItem | null>(null)
 const [recentlyUnlocked, setRecentlyUnlocked] = useState<LegacyPerformance | null>(null)
 const [isVisible, setIsVisible] = useState(true);
 const [lastScrollY, setLastScrollY] = useState(0);
 const [roopuName, setRoopuName] = useState('')

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

 const [lineup, setLineup] = useState<Record<KapaHakaItem, string | null>>({
   'Whakaeke': null,
   'Mōteatea': null,
   'Poi': null,
   'Waiata-ā-ringa': null,
   'Haka': null,
   'Whakawātea': null,
 })

 useEffect(() => {
   if (profile?.currentDraft) {
     setLineup(profile.currentDraft)
   }
   if (profile?.roopuName) {
     setRoopuName(profile.roopuName)
   }
 }, [profile])

 const handleUpdateRoopuName = (val: string) => {
   setRoopuName(val)
   if (user) {
     updateDocumentNonBlocking(doc(db, 'users', user.uid), {
       roopuName: val,
       updatedAt: serverTimestamp()
     })
   }
 }

 const totalMana = useMemo(() => {
   const points = profile?.criticPoints || 0
   const hearts = profile?.receivedHearts || 0
   const purchased = profile?.purchasedMana || 0
   return points + (hearts * 100) + purchased
 }, [profile])

 const availableMana = useMemo(() => {
   const spent = profile?.manaSpent || 0
   return totalMana - spent
 }, [totalMana, profile])

 const isHeritageTeam = (perf: LegacyPerformance | null) => {
   if (!perf) return false;
   return parseInt(perf.year) < 1994 && perf.tier === 'Legendary';
 }

 const isUnlocked = (perf: LegacyPerformance) => {
   return profile?.unlockedLegacyIds?.includes(perf.id) || false
 }

 const getUnlockCost = (perf: LegacyPerformance | null) => {
   if (!perf) return 0;
   if (isHeritageTeam(perf)) return 75000;
   return TIER_COSTS[perf.tier as keyof typeof TIER_COSTS] || 500;
 }

  const handleConfirmUnlock = () => {
   if (!teamToUnlock || !user) return
   const cost = getUnlockCost(teamToUnlock);
   if (availableMana < cost) {
     toast({ title: "Insufficient Mana Shards!", variant: "destructive" })
     return
   }
   updateDocumentNonBlocking(doc(db, 'users', user.uid), {
     unlockedLegacyIds: arrayUnion(teamToUnlock.id),
     manaSpent: increment(cost),
     updatedAt: serverTimestamp()
   })
  
   setRecentlyUnlocked(teamToUnlock)
   setTeamToUnlock(null)
  }

  const handleBuyMana = (pack: any) => {
    if (!user) return;
    if (user.isAnonymous) {
      toast({ title: "Registration Required", description: "Purchasing shards requires a permanent account.", variant: "destructive" });
      router.push('/login');
      return;
    }
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { purchasedMana: increment(pack.mana), updatedAt: serverTimestamp() });
    toast({ title: "Shards Purchased!", description: `${pack.mana} Mana Shards added to your pool.` });
  }

 const saveDraftToCloud = (newLineup: any) => {
   if (!user) return
   updateDocumentNonBlocking(doc(db, 'users', user.uid), {
     currentDraft: newLineup,
     updatedAt: serverTimestamp()
   })
 }

 const handleEquipItem = (teamId: string) => {
   if (!activeSlot) return
  
   const team = legacyPerformances.find(p => p.id === teamId)
   if (!team) return

   if (isHeritageTeam(team)) {
     const heritageEquipped = Object.values(lineup).some(id => {
       if (!id) return false;
       const p = legacyPerformances.find(lp => lp.id === id);
       return p && isHeritageTeam(p);
     });

     if (heritageEquipped) {
       toast({
         title: "Heritage Limit!",
         description: "You can only equip ONE Heritage Legend item in your repertoire.",
         variant: "destructive"
       })
       return
     }
   }

   const itemsFromSameTeam = Object.values(lineup).filter(id => id === teamId).length
   if (['Legendary', 'Immortal'].includes(team.tier) && itemsFromSameTeam >= 2) {
     toast({
       title: "Tier Balance!",
       description: `To maintain stage balance, you can only use 2 items from ${team.name}.`,
       variant: "destructive"
     })
     return
   }

   const nextLineup = { ...lineup, [activeSlot]: teamId }
   setLineup(nextLineup)
   saveDraftToCloud(nextLineup)
   setActiveSlot(null)
   toast({ title: `${activeSlot} Equipped!` })
 }

 const synergy = useMemo(() => {
   const equipped = Object.values(lineup).filter(id => id !== null) as string[]
   if (equipped.length === 0) return { bonus: 1, type: 'None', label: 'No Synergy' }
  
   const uniqueTeams = new Set(equipped).size
   const uniqueRegions = new Set(equipped.map(id => legacyPerformances.find(p => p.id === id)?.location)).size

   if (equipped.length === 6 && uniqueTeams === 6) {
     return { bonus: 1.10, type: 'Diversity', label: 'Diversity Master (+10%)' }
   }

   if (equipped.length >= 4 && uniqueRegions === 1) {
     return { bonus: 1.05, type: 'Regional', label: 'Regional Resonance (+5%)' }
   }

   return { bonus: 1, type: 'Standard', label: 'Neutral Balance' }
 }, [lineup])

 const lineupStats = useMemo(() => {
   const equipped = Object.values(lineup).filter(id => id !== null) as string[]
   if (equipped.length === 0) return { ihi: 0, wehi: 0, wana: 0, precision: 0 }
  
   const stats = equipped.reduce((acc, id) => {
     const perf = legacyPerformances.find(p => p.id === id)
     if (perf) {
       acc.ihi += perf.stats.ihi
       acc.wehi += perf.stats.wehi
       acc.wana += perf.stats.wana
       acc.precision += perf.stats.precision
     }
     return acc
   }, { ihi: 0, wehi: 0, wana: 0, precision: 0 })

   const multiplier = synergy.bonus

   return {
     ihi: Math.floor((stats.ihi / equipped.length) * multiplier),
     wehi: Math.floor((stats.wehi / equipped.length) * multiplier),
     wana: Math.floor((stats.wana / equipped.length) * multiplier),
     precision: Math.floor((stats.precision / equipped.length) * multiplier),
   }
 }, [lineup, synergy])

 const arenaUrl = useMemo(() => {
   const params = new URLSearchParams()
   params.set('ihi', lineupStats.ihi.toString())
   params.set('wehi', lineupStats.wehi.toString())
   params.set('wana', lineupStats.wana.toString())
   params.set('precision', lineupStats.precision.toString())
   return `/matchups/arena?${params.toString()}`
 }, [lineupStats])

 const unlockedPerformances = legacyPerformances.filter(p => isUnlocked(p))
 
 const lockedPerformances = useMemo(() => {
   return legacyPerformances
     .filter(p => !isUnlocked(p))
     .sort((a, b) => {
       if (TIER_ORDER[a.tier as keyof typeof TIER_ORDER] !== TIER_ORDER[b.tier as keyof typeof TIER_ORDER]) {
         return TIER_ORDER[a.tier as keyof typeof TIER_ORDER] - TIER_ORDER[b.tier as keyof typeof TIER_ORDER];
       }
       return parseInt(b.year) - parseInt(a.year);
     });
 }, [profile]);

 const searchResults = useMemo(() => {
   if (!search.trim()) return [];
   return legacyPerformances
     .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.year.includes(search))
     .sort((a, b) => {
       const aOwned = isUnlocked(a);
       const bOwned = isUnlocked(b);
       if (aOwned !== bOwned) return aOwned ? -1 : 1;
       return TIER_ORDER[a.tier as keyof typeof TIER_ORDER] - TIER_ORDER[b.tier as keyof typeof TIER_ORDER];
     });
 }, [search, profile]);

 const isBracketFull = Object.values(lineup).every(v => v !== null);

 return (
   <div className="space-y-6 pb-24 max-w-md mx-auto">
     <UnlockReveal performance={recentlyUnlocked} onClose={() => setRecentlyUnlocked(null)} />

     <header className={cn(
       "sticky top-4 z-40 transition-all duration-500 ease-in-out px-1",
       isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
     )}>
       <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
             <ChevronLeft className="w-5 h-5" />
           </Button>
           <div className="flex flex-col">
             <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none">DRAFT HUB</h1>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[9px] font-black italic text-primary">{availableMana} SHARDS</span>
             </div>
           </div>
         </div>
         <Button size="icon" variant="outline" onClick={() => router.push('/')} className="h-10 w-10 rounded-full border border-slate-200 text-primary bg-white shadow-sm hover:border-primary transition-all">
           <ShoppingCart className="w-4 h-4" />
         </Button>
       </div>
     </header>

     <Card id="tour-draft-builder" className="border border-slate-200 bg-white rounded-[3rem] overflow-hidden shadow-sm relative mx-1">
       <div className="p-8 space-y-8">
         <div className="space-y-2">
           <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary display-text flex items-center gap-2 ml-1">
             <Edit3 className="w-3.5 h-3.5" /> ROOPŪ DESIGNATION
           </label>
           <Input
             placeholder="e.g. Te Kapa Haka o [Your Name]"
             value={roopuName}
             onChange={(e) => handleUpdateRoopuName(e.target.value)}
             className="h-14 text-lg font-black uppercase italic rounded-2xl bg-surface-low border-none focus-visible:ring-primary shadow-inner placeholder:text-slate-300"
           />
         </div>

         <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary display-text flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> PERFORMANCE SLOTS
            </h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <Badge id="tour-synergy" className={cn(
                     "font-black text-[9px] uppercase tracking-widest px-4 py-1.5 cursor-help rounded-full shadow-sm border-none transition-colors",
                     synergy.type === 'Diversity' ? "bg-green-100 text-green-600" :
                     synergy.type === 'Regional' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                   )}>
                     {synergy.label}
                   </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] p-3 text-center bg-white border border-slate-200 rounded-2xl shadow-xl">
                  <p className="text-[10px] font-black uppercase text-slate-950 mb-1">Draft Synergy</p>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    <b>Diversity:</b> 6 unique sources (+10% Stats)<br/>
                    <b>Regional:</b> 4+ same region repertoire (+5% Stats)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
         </div>

         <div className="grid grid-cols-3 gap-4">
           {KAPA_HAKA_ITEMS.map(item => {
             const teamId = lineup[item]
             const team = teamId ? legacyPerformances.find(p => p.id === teamId) : null
             return (
               <div
                 key={item}
                 onClick={() => setActiveSlot(item)}
                 role="button"
                 tabIndex={0}
                 className={cn(
                   "h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative group overflow-hidden cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-primary shadow-sm",
                   team ? "border-primary bg-slate-50" : "border-slate-200 bg-white hover:border-primary/40",
                   activeSlot === item && "ring-4 ring-primary/20 border-primary"
                 )}
               >
                 {team ? (
                   <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                     <Image src={team.image} alt={team.name} fill className="object-cover opacity-20" />
                     <div className="relative z-10 w-full h-full flex flex-col justify-between">
                       <span className="text-[8px] font-black uppercase text-primary leading-none bg-white/80 self-center px-3 py-1 rounded-full shadow-sm">{item}</span>
                       <span className="text-[11px] font-black uppercase italic leading-tight line-clamp-2 flex-1 flex items-center justify-center px-1 text-slate-950 dark:text-white">{team.name}</span>
                       <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">YEAR {team.year}</span>
                     </div>
                     <button
                       onClick={(e) => { e.stopPropagation(); const nl = { ...lineup, [item]: null }; setLineup(nl); saveDraftToCloud(nl); }}
                       className="absolute top-2 right-2 p-2 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-red-100"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ) : (
                   <>
                     <Plus className="w-6 h-6 text-primary/40 mb-2" />
                     <span className="text-[9px] font-black uppercase text-slate-400">{item}</span>
                   </>
                 )}
               </div>
             )
           })}
         </div>

         <div className="grid grid-cols-4 gap-4 py-6 px-4 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
           {Object.entries(lineupStats).map(([key, val]) => (
             <div key={key} className="flex flex-col items-center gap-2">
               <span className="text-[8px] font-black uppercase text-slate-400 leading-none">{key}</span>
               <span className="text-[14px] font-black text-primary leading-none tabular-nums">{val}%</span>
               <Progress value={val} className="h-1.5 w-full bg-slate-200" indicatorClassName="bg-primary shadow-sm" />
             </div>
           ))}
         </div>

         <Link href={isBracketFull ? arenaUrl : "#"}>
           <Button disabled={!isBracketFull || !roopuName.trim()} className="w-full h-16 text-base font-black uppercase italic shadow-xl shadow-primary/10 gap-3 group rounded-2xl transition-all hover:scale-[1.02] active:scale-95">
             ENTER ARENA AS {roopuName || "ROOPŪ"} <Swords className="w-6 h-6 group-hover:rotate-12 transition-transform" />
           </Button>
         </Link>
       </div>
     </Card>

     <div id="tour-scout-collection" className="space-y-6 px-1">
       <div className="flex items-center gap-3 sticky top-[72px] z-20 bg-white/95 backdrop-blur-md py-4 px-2 rounded-[2rem] shadow-sm border border-slate-100 mx-1">
         <div className="relative flex-1">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
           <Input
             placeholder="Search Repertoire & Vault..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-12 h-12 rounded-full bg-slate-50 border-slate-200 text-sm font-bold focus-visible:ring-primary"
           />
         </div>
       </div>

       <div className="space-y-4 pt-4">
         {search ? (
            <>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mb-4">
                <Search className="w-5 h-5" /> SEARCH RESULTS
              </h2>
              <div className="grid grid-cols-2 gap-4 px-1">
                 {searchResults.map((perf) => {
                    const cost = getUnlockCost(perf);
                    const isOwned = isUnlocked(perf);
                    const isBlurred = perf.tier !== 'Contender';
                   
                    return (
                      <Card
                        key={perf.id}
                        className="surface-low border ghost-border rounded-[2.5rem] shadow-sm ambient-shadow overflow-hidden relative h-44 group cursor-pointer hover:scale-[1.02] transition-all"
                        onClick={() => isOwned ? null : setTeamToUnlock(perf)}
                      >
                        <Image
                          src={perf.image}
                          alt={perf.name}
                          fill
                          className={cn(
                            "object-cover transition-all duration-1000",
                            !isOwned && "grayscale",
                            isBlurred && !isOwned ? "opacity-10 blur-xl" : "opacity-30 group-hover:opacity-50"
                          )}
                        />
                        
                        {/* Item Stats HUD Overlay */}
                        <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4 z-20">
                           <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-3 text-center border-b border-primary/20 pb-1">Roopu Stats</p>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                             {Object.entries(perf.itemStats).map(([item, stat]) => (
                               <div key={item} className="flex flex-col gap-0.5">
                                 <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                                 <div className="flex items-center gap-1.5">
                                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary" style={{ width: `${stat}%` }} />
                                   </div>
                                   <span className="text-[8px] font-black text-white tabular-nums">{stat}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-5 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
                          <div className="flex items-center justify-between mb-auto pt-1 relative z-10">
                            {perf.tier === 'S-Tier' ? <Crown className="w-5 h-5 text-red-500" /> : ['Ultimate', 'Legendary'].includes(perf.tier) ? <Award className="w-5 h-5 text-yellow-500" /> : perf.tier === 'Contender' ? <Users className="w-5 h-5 text-green-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
                            {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[7px] px-2 h-4">OWNED</Badge>}
                          </div>

                          <div className="space-y-1 relative z-10 -translate-y-2 text-left">
                            <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5", 
                              perf.tier === 'S-Tier' ? "text-red-600" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "text-yellow-600" : perf.tier === 'Elite' ? "text-blue-600" : perf.tier === 'Contender' ? "text-green-600" : "text-primary/80"
                            )}>
                              {perf.tier}
                            </span>
                            <h3 className={cn(
                              "text-[12px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2 transition-all",
                              isBlurred && !isOwned && "blur-[4px] select-none opacity-40"
                            )}>
                              {perf.name}
                            </h3>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-2">YEAR {perf.year}</span>
                            {!isOwned && (
                              <Badge className={cn(
                                "w-full justify-center text-white font-black text-[9px] h-8 rounded-xl shadow-md border-none transition-all",
                                perf.tier === 'S-Tier' ? "bg-red-600 animate-pulse border-red-500" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "bg-yellow-600 hover:bg-yellow-700" : perf.tier === 'Elite' ? "bg-blue-600 hover:bg-blue-700" : perf.tier === 'Contender' ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                              )}>
                                {cost} SHARDS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                 })}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-slate-400" /> NATIONAL CONTENDERS
              </h2>
              <div className="flex flex-col gap-6">
                 {(() => {
                    const contenders = lockedPerformances.filter(p => p.tier === 'Contender');
                    
                    // Group by Year
                    const contendersByYear = contenders.reduce((acc, perf) => {
                       if (!acc[perf.year]) acc[perf.year] = [];
                       acc[perf.year].push(perf);
                       return acc;
                    }, {} as Record<string, typeof contenders>);
                    
                    const years = Object.keys(contendersByYear).sort((a,b) => Number(b) - Number(a));
                    
                    return years.map(year => (
                       <div key={year} className="space-y-3">
                          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 border-b border-slate-100 pb-1 flex justify-between items-center">
                             <span>Te Matatini {year}</span>
                             <span className="text-[8px] text-slate-300">{contendersByYear[year].length} Qualifiers</span>
                          </h3>
                          
                          <div className="flex overflow-x-auto gap-3 px-3 pb-4 snap-x hide-scrollbar">
                             {contendersByYear[year].map(perf => {
                                const cost = getUnlockCost(perf);
                                const isOwned = isUnlocked(perf);
                                
                                return (
                                  <Card
                                    key={perf.id}
                                    className="min-w-[140px] w-[140px] shrink-0 snap-center overflow-hidden border border-slate-200 bg-white relative h-40 group cursor-pointer rounded-[1.5rem] shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                                    onClick={() => isOwned ? null : setTeamToUnlock(perf)}
                                  >
                                    <Image
                                      src={perf.image}
                                      alt={perf.name}
                                      fill
                                      className={cn(
                                        "object-cover transition-all duration-1000",
                                        !isOwned && "grayscale",
                                        "opacity-30 group-hover:opacity-50"
                                      )}
                                    />
                                    
                                    {/* Item Stats HUD Overlay */}
                                    <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-3 z-20">
                                       <p className="text-[7px] font-black uppercase text-green-500 tracking-[0.2em] mb-2 text-center border-b border-green-500/20 pb-1">Stats</p>
                                       <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                         {Object.entries(perf.itemStats).slice(0,6).map(([item, stat]) => (
                                           <div key={item} className="flex flex-col gap-0.5">
                                             <span className="text-[6px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                                             <div className="flex items-center gap-1">
                                               <div className="h-0.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                 <div className="h-full bg-green-500" style={{ width: `${stat}%` }} />
                                               </div>
                                               <span className="text-[7px] font-black text-white tabular-nums">{stat}</span>
                                             </div>
                                           </div>
                                         ))}
                                       </div>
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-3 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
                                      <div className="flex items-center justify-between mb-auto relative z-10 -mt-1">
                                        <Users className="w-4 h-4 text-green-500" />
                                        {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[6px] px-1.5 h-3">OWNED</Badge>}
                                      </div>

                                      <div className="space-y-1 relative z-10 -translate-y-1 text-left">
                                        <h3 className="text-[10px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2">
                                          {perf.name}
                                        </h3>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-1.5 line-clamp-1">{perf.location}</span>
                                        {!isOwned && (
                                          <Badge className="w-full justify-center text-white font-black text-[8px] h-6 rounded-lg shadow-sm border-none transition-all bg-green-600 hover:bg-green-700">
                                            {cost} SHARDS
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                )
                             })}
                          </div>
                       </div>
                    ))
                 })()}
              </div>

              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 flex items-center gap-2 mt-8 mb-4">
                <Crown className="w-5 h-5 text-yellow-500" /> CHAMPIONSHIP TIERS
              </h2>
              <div className="grid grid-cols-2 gap-4 px-1">
                 {lockedPerformances.filter(p => p.tier !== 'Contender').map((perf) => {
                    const cost = getUnlockCost(perf);
                    const isOwned = isUnlocked(perf);
                    const isBlurred = perf.tier !== 'Contender';
                   
                    return (
                      <Card
                        key={perf.id}
                        className="surface-low border ghost-border rounded-[2.5rem] shadow-sm ambient-shadow overflow-hidden relative h-44 group cursor-pointer hover:scale-[1.02] transition-all"
                        onClick={() => isOwned ? null : setTeamToUnlock(perf)}
                      >
                        <Image
                          src={perf.image}
                          alt={perf.name}
                          fill
                          className={cn(
                            "object-cover transition-all duration-1000",
                            !isOwned && "grayscale",
                            isBlurred && !isOwned ? "opacity-10 blur-xl" : "opacity-30 group-hover:opacity-50"
                          )}
                        />
                        
                        {/* Item Stats HUD Overlay */}
                        <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4 z-20">
                           <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-3 text-center border-b border-primary/20 pb-1">Roopu Stats</p>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                             {Object.entries(perf.itemStats).map(([item, stat]) => (
                               <div key={item} className="flex flex-col gap-0.5">
                                 <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{item.substring(0, 3)}</span>
                                 <div className="flex items-center gap-1.5">
                                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary" style={{ width: `${stat}%` }} />
                                   </div>
                                   <span className="text-[8px] font-black text-white tabular-nums">{stat}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent p-5 flex flex-col justify-end group-hover:opacity-0 transition-opacity">
                          <div className="flex items-center justify-between mb-auto pt-1 relative z-10">
                            {perf.tier === 'S-Tier' ? <Crown className="w-5 h-5 text-red-500" /> : ['Ultimate', 'Legendary'].includes(perf.tier) ? <Award className="w-5 h-5 text-yellow-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
                            {isOwned && <Badge className="bg-green-100 text-green-600 border-none font-black text-[7px] px-2 h-4">OWNED</Badge>}
                          </div>

                          <div className="space-y-1 relative z-10 -translate-y-2 text-left">
                            <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block mb-0.5", 
                              perf.tier === 'S-Tier' ? "text-red-600" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "text-yellow-600" : perf.tier === 'Elite' ? "text-blue-600" : "text-primary/80"
                            )}>
                              {perf.tier}
                            </span>
                            <h3 className={cn(
                              "text-[12px] font-black text-slate-950 italic uppercase leading-tight line-clamp-2 transition-all",
                              isBlurred && !isOwned && "blur-[4px] select-none opacity-40"
                            )}>
                              {perf.name}
                            </h3>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] block mb-2">YEAR {perf.year}</span>
                            {!isOwned && (
                              <Badge className={cn(
                                "w-full justify-center text-white font-black text-[9px] h-8 rounded-xl shadow-md border-none transition-all",
                                perf.tier === 'S-Tier' ? "bg-red-600 animate-pulse border-red-500" : ['Ultimate', 'Legendary'].includes(perf.tier) ? "bg-yellow-600 hover:bg-yellow-700" : perf.tier === 'Elite' ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-primary/90"
                              )}>
                                {cost} SHARDS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                 })}
              </div>
            </>
          )}
       </div>
     </div>

     <Dialog open={!!activeSlot} onOpenChange={(open) => !open && setActiveSlot(null)}>
       <DialogContent className="rounded-[3rem] max-w-[360px] h-[80vh] flex flex-col border border-slate-200 bg-white shadow-2xl p-0 overflow-hidden">
         <div className="h-2 w-full bg-primary" />
         <DialogHeader className="p-8 pb-4">
           <DialogTitle className="uppercase italic font-black text-2xl text-center text-slate-950">Select {activeSlot}</DialogTitle>
         </DialogHeader>
         <ScrollArea className="flex-1 px-8">
           {unlockedPerformances.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
               <div className="p-6 rounded-full bg-slate-50 border-4 border-dashed border-slate-200">
                 <Lock className="w-10 h-10 text-slate-300" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-950">REPERTOIRE EMPTY</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed px-6 tracking-wide">
                   Visit the Historical Vault below to scout roopū and unlock technical items for your draft.
                 </p>
               </div>
             </div>
           ) : (
             <div className="grid gap-4 py-6">
               {unlockedPerformances.map(perf => {
                 const itemsUsedFromThisTeam = Object.values(lineup).filter(id => id === perf.id).length
                 const isTiered = ['Ultimate', 'Legendary'].includes(perf.tier)
                 const isHeritage = isHeritageTeam(perf)
                 const anyHeritageEquipped = Object.values(lineup).some(id => {
                   const p = legacyPerformances.find(lp => lp.id === id);
                   return p && isHeritageTeam(p);
                 });
                
                 const isCapped = (isHeritage && anyHeritageEquipped) || (isTiered && itemsUsedFromThisTeam >= 2)
                
                 return (
                   <button
                     key={perf.id}
                     disabled={isCapped}
                     onClick={() => handleEquipItem(perf.id)}
                     className={cn(
                       "flex items-center gap-5 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/40 hover:bg-white transition-all group text-left shadow-sm",
                       isCapped && "opacity-40 cursor-not-allowed grayscale"
                     )}
                   >
                     <div className="h-14 w-14 relative rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-inner">
                       <Image src={perf.image} alt={perf.name} fill className="object-cover" />
                     </div>
                     <div className="flex-1">
                       <p className="text-[12px] font-black uppercase italic leading-tight text-slate-950">{perf.name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">YEAR {perf.year} • {perf.tier}</p>
                     </div>
                     <ChevronRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                   </button>
                 )
               })}
             </div>
           )}
         </ScrollArea>
       </DialogContent>
     </Dialog>

     <AlertDialog open={!!teamToUnlock} onOpenChange={(o) => !o && setTeamToUnlock(null)}>
       <AlertDialogContent className="rounded-[3rem] max-w-[340px] p-10 border border-slate-200 bg-white shadow-2xl">
         <AlertDialogHeader>
           <AlertDialogTitle className="uppercase italic font-black text-center text-3xl text-slate-950 leading-tight">
             {isHeritageTeam(teamToUnlock) ? 'Ancient Legacy?' : 'Scout Legacy?'}
           </AlertDialogTitle>
           <AlertDialogDescription className="text-center text-[12px] space-y-6 leading-relaxed uppercase font-bold tracking-[0.1em] pt-4 text-slate-500">
             <div className="space-y-4">
               <p>Invest <span className="text-primary font-black">{teamToUnlock ? getUnlockCost(teamToUnlock) : 0} Mana Shards</span> to unbind <b className="text-slate-950">{teamToUnlock?.tier} Archive</b>?</p>
               {isHeritageTeam(teamToUnlock) && (
                 <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600">
                   <p className="font-black text-[9px] italic uppercase">S-TIER ABILITY: AUTO-WIN ON CLASH ROLL</p>
                 </div>
               )}
             </div>
           </AlertDialogDescription>
         </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-4 sm:flex-col mt-10">
            {teamToUnlock && availableMana < getUnlockCost(teamToUnlock) ? (
              <div className="space-y-3 w-full animate-in slide-in-from-bottom-2">
                <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-[10px] font-black uppercase text-center border border-red-100 mb-2">Insufficient Shards. Top up below:</div>
                {user?.isAnonymous && <div className="text-[10px] text-red-500 font-bold uppercase text-center mb-1 bg-red-50 py-1 rounded-full">Sign in to purchase</div>}
                {MANA_PACKS.map(pack => (
                  <Button key={pack.name} variant="outline" disabled={user?.isAnonymous} className="w-full h-16 justify-between items-center p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-primary hover:bg-white transition-all group shadow-sm disabled:opacity-50" onClick={() => handleBuyMana(pack)}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary"><pack.icon className="w-5 h-5" /></div>
                      <div className="text-left leading-none">
                        <p className="text-[11px] font-black uppercase italic text-slate-950">{pack.name}</p>
                        <p className="text-[10px] font-bold text-primary mt-1">+{pack.mana} Shards</p>
                      </div>
                    </div>
                    <Badge className="bg-primary text-white font-black italic text-[10px] h-8 px-3 shadow-sm border-none rounded-full">${pack.price}</Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <AlertDialogAction className="w-full font-black uppercase italic h-16 text-lg bg-primary text-slate-950 rounded-2xl shadow-xl active:scale-95 transition-all border-none" onClick={handleConfirmUnlock}>Confirm Scout</AlertDialogAction>
            )}
            <AlertDialogCancel className="w-full font-black uppercase italic border-none text-slate-400 h-12 text-[11px] tracking-widest hover:text-slate-600">Maybe Later</AlertDialogCancel>
          </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   </div>
 )
}