
"use client"

import React, { useState, useEffect } from 'react'
import { kapaHakaJudgingAcademy, type KapaHakaJudgingAcademyOutput } from '@/ai/flows/kapa-haka-judging-academy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, CheckCircle2, Info, Lightbulb, ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc, increment, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const categories = [
  "Whakaeke", "Waiata-ā-ringa", "Poi", "Mōteatea", "Haka", "Whakawatea", "Kakahu"
]

export default function AcademyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KapaHakaJudgingAcademyOutput | null>(null)
  const [selected, setSelected] = useState("")
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
  
  const { user } = useUser()
  const db = useFirestore()
  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user])
  const { data: profile } = useDoc(userRef)

  useEffect(() => {
    if (user && profile && !profile.dailyTasksCompleted?.includes('academy_scholar')) {
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        dailyTasksCompleted: arrayUnion('academy_scholar'),
        criticPoints: increment(100),
        updatedAt: serverTimestamp()
      })
    }
  }, [user, profile, db])

  const handleFetch = async (item: string) => {
    setLoading(true)
    setSelected(item)
    try {
      const result = await kapaHakaJudgingAcademy({ performanceItem: item })
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <header className={cn(
        "sticky top-4 z-40 transition-all duration-500 ease-in-out px-1",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
      )}>
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">JUDGING ACADEMY</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1">Technical Excellence Hub</p>
          </div>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-4 px-4">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selected === cat ? "default" : "outline"}
            size="sm"
            onClick={() => handleFetch(cat)}
            className={cn(
              "h-12 px-6 rounded-2xl font-black uppercase italic border-4 transition-all shrink-0",
              selected === cat ? "bg-primary text-slate-950 border-primary shadow-xl scale-105" : "bg-slate-50 border-slate-200 text-slate-950 hover:border-primary/40"
            )}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="px-4">
        {!data && !loading && (
          <Card className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[2.5rem] shadow-inner">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center space-y-6">
              <div className="p-6 rounded-full bg-white border-4 border-slate-100 shadow-xl">
                <Info className="w-12 h-12 text-primary opacity-50" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase italic text-slate-950">Select a category</h3>
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Learn the technical nuances of each item.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-100 border-4 border-slate-50" />
            <Skeleton className="h-72 w-full rounded-[2.5rem] bg-slate-100 border-4 border-slate-50" />
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
            <Card className="overflow-hidden bg-white border-4 border-slate-100 shadow-2xl rounded-[3rem]">
              <div className="h-3 bg-primary w-full shadow-[0_0_20px_rgba(255,69,0,0.4)]" />
              <CardHeader className="p-8 pb-4">
                <Badge className="bg-primary text-slate-950 font-black text-[10px] tracking-widest uppercase px-4 py-1.5 mb-4 shadow-lg border-none">
                  {data.itemName} CORE GUIDE
                </Badge>
                <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-950">{data.itemName} Discipline</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-10">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Cultural Significance
                  </h4>
                  <p className="text-sm font-bold leading-relaxed text-slate-950 bg-slate-50 p-6 rounded-2xl border-4 border-slate-100 shadow-inner italic">
                    "{data.explanation}"
                  </p>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Technical Criteria
                  </h4>
                  <div className="grid gap-4">
                    {data.judgingCriteria.map((c, i) => (
                      <div key={i} className="flex gap-5 bg-slate-50 p-6 rounded-2xl border-4 border-slate-100 shadow-lg group hover:border-primary/20 transition-all">
                        <span className="text-primary font-black italic text-2xl drop-shadow-md">0{i + 1}</span>
                        <p className="text-[12px] font-bold text-slate-950 uppercase tracking-tight leading-tight self-center">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Expert Scoring Tips
                  </h4>
                  <div className="grid gap-4">
                    {data.expertTips.map((tip, i) => (
                      <div key={i} className="p-6 bg-primary/5 rounded-2xl border-l-8 border-primary border-4 border-slate-100 shadow-xl">
                        <p className="text-[12px] font-black italic text-slate-950 leading-relaxed">
                          "{tip}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
