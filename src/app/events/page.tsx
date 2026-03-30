
"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock, ListOrdered, MessageSquare, Play, ChevronLeft, Timer, History, Zap } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
  startDate: Date;
  endDate: Date;
  status: 'Closed Arena' | 'Upcoming Arena';
  type: 'Regional';
  image: string;
  roopu: any[];
}

const events: Event[] = [
  {
    id: 'mataatua-2026',
    name: 'Mātaatua Senior Regional',
    location: 'Whakatāne',
    date: 'February 27-28, 2026',
    startDate: new Date('2026-02-27T00:00:00'),
    endDate: new Date('2026-02-28T23:59:59'),
    status: 'Closed Arena',
    type: 'Regional',
    image: PlaceHolderImages[2].imageUrl,
    roopu: [
      { id: 'apanui', name: 'Te Kapa Haka o Te Whānau-a-Apanui', time: 'OFFICIAL RESULTS', sortKey: 1 },
      { id: 'ohinemataroa', name: 'Ōhinemataroa ki Ruatāhuna', time: 'OFFICIAL RESULTS', sortKey: 2 }
    ]
  },
  {
    id: 'te-whenua-moemoea-2026',
    name: 'Te Whenua Moemoeā Senior Regional',
    location: 'Gold Coast',
    date: 'March 28, 2026',
    startDate: new Date('2026-03-28T09:00:00'),
    endDate: new Date('2026-03-28T23:59:59'),
    status: 'Upcoming Arena',
    type: 'Regional',
    image: PlaceHolderImages[0].imageUrl,
    roopu: [
      { id: 'atawhai', name: 'Te Atawhai Puumananawa', time: '9:00 AM', sortKey: 1 },
      { id: 'raranga', name: 'Te Raranga Whānui', time: '9:40 AM', sortKey: 2 },
      { id: 'hau-tawhiti', name: 'Te Kapa Haka o Te Hau Tawhiti', time: '10:20 AM', sortKey: 3 }
    ]
  }
]

function EventCountdown({ startDate }: { startDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  useEffect(() => {
    const calc = () => {
      const distance = startDate.getTime() - new Date().getTime();
      if (distance < 0) { setTimeLeft(null); return; }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startDate]);
  if (!timeLeft) return null;
  return <div className="flex items-center gap-1">LIVE IN: {timeLeft.d}D {timeLeft.h}H {timeLeft.m}M</div>;
}

export default function EventsPage() {
  const router = useRouter()
  return (
    <div className="space-y-6 pb-12">
      <header className="sticky top-4 z-40 bg-white/80 backdrop-blur-lg border rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-10 w-10 rounded-full"><ChevronLeft /></Button>
        <div><h1 className="text-xl font-black uppercase italic tracking-tighter">QUALIFYING MAP</h1><p className="text-[8px] font-black uppercase text-primary tracking-widest">Te Matatini 2027 Road</p></div>
      </header>
      <div className="space-y-6 px-1">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden border bg-white shadow-lg rounded-[2.5rem] mx-1">
            <div className="relative h-44 w-full">
              <Image src={event.image} alt={event.name} fill className="object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute top-4 right-4"><Badge className="bg-white/10 text-white font-black text-[9px] uppercase"><EventCountdown startDate={event.startDate} /> {event.status === 'Closed Arena' && 'CLOSED'}</Badge></div>
              <div className="absolute bottom-5 left-6 right-6"><h3 className="text-2xl font-black uppercase italic text-white leading-tight">{event.name}</h3><div className="flex flex-col gap-1 text-[9px] font-black text-white uppercase"><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {event.location}</div></div></div>
            </div>
            <CardContent className="p-0 bg-white">
              <Accordion type="single" collapsible><AccordionItem value="roopu" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:bg-slate-50"><div className="flex items-center gap-2"><ListOrdered className="w-5 h-5 text-primary" /><span className="text-[10px] font-black uppercase">Stage Order</span></div></AccordionTrigger>
                <AccordionContent className="px-4 pb-6">{event.roopu.map(g => (
                  <div key={g.id} className="p-4 bg-slate-50 rounded-2xl border mb-2 flex items-center justify-between">
                    <div><h4 className="text-[12px] font-black uppercase italic">{g.name}</h4><p className="text-[9px] font-bold text-muted-foreground uppercase">{g.time}</p></div>
                    <Link href={`/performance/${g.id}`}><Button size="sm" className="h-9 px-4 rounded-full font-black text-[10px] uppercase">VIEW</Button></Link>
                  </div>
                ))}</AccordionContent>
              </AccordionItem></Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
