
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ChevronLeft, Sparkles, Zap, ShieldCheck, Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LegacyPerformance } from '@/lib/legacy-data';

interface UnlockRevealProps {
  performance: LegacyPerformance | null;
  onClose: () => void;
}

export function UnlockReveal({ performance, onClose }: UnlockRevealProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (performance) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [performance]);

  if (!performance || !show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black overflow-hidden animate-in fade-in duration-700">
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.4)_0%,transparent_70%)] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 animate-swirl" />
      </div>


      {/* Particle/Sparkle Layer */}
      <div className="absolute top-6 left-6 z-[250]">
        <Button onClick={onClose} variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full px-4 h-12 font-black tracking-widest text-[10px] uppercase">
          <ChevronLeft className="w-5 h-5 mr-1" /> BACK TO VAULT
        </Button>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-primary rounded-full blur-[1px] animate-bounce"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's',
              animationDelay: Math.random() * 5 + 's',
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center text-center space-y-10">
        <header className="space-y-4 animate-in slide-in-from-top-10 duration-1000">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/20 border-2 border-primary animate-mana-pulse">
              <Crown className="w-16 h-16 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-[0_0_15px_rgba(255,69,0,0.8)]">
              LEGENDARY PRESENCE SECURED
            </h2>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">The stage yields to your authority</p>
          </div>
        </header>

        <div className="w-full aspect-[4/5] relative rounded-[3rem] overflow-hidden border-4 border-primary shadow-[0_0_50px_rgba(255,69,0,0.5)] animate-in zoom-in-50 duration-700 delay-300">
          <Image src={performance.image} alt={performance.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          <div className="absolute bottom-8 left-0 right-0 p-6 space-y-3">
            <Badge className="bg-primary text-white font-black italic text-[10px] tracking-widest uppercase">
              {performance.tier} ARCHIVE
            </Badge>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight drop-shadow-lg">
              {performance.name}
            </h3>
            <div className="flex items-center justify-center gap-4 text-white/80 font-bold uppercase text-[10px] tracking-widest">
              <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-primary" /> {performance.year}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-primary" /> AUTHENTICATED</span>
            </div>
          </div>
        </div>

        <div className="w-full space-y-6 animate-in slide-in-from-bottom-10 duration-1000 delay-500">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 backdrop-blur-md">
            <p className="text-xs text-primary font-black uppercase italic tracking-widest leading-relaxed">
              "Their Ihi has been bound to your bracket. The stadium pulse quickens at your command."
            </p>
          </div>

          <Button 
            onClick={onClose}
            className="w-full h-16 text-xl font-black italic uppercase bg-white text-black hover:bg-primary hover:text-white rounded-2xl shadow-2xl transition-all active:scale-95 group"
          >
            CLAIM PRESTIGE <Zap className="ml-2 w-6 h-6 fill-current group-hover:animate-bounce" />
          </Button>
        </div>
      </div>

      {/* Decorative Wording */}
      <div className="absolute bottom-10 left-0 right-0 pointer-events-none opacity-20">
        <p className="text-[120px] font-black text-primary/10 uppercase italic whitespace-nowrap -rotate-6 select-none">
          MANA MANA MANA MANA MANA
        </p>
      </div>
    </div>
  );
}
