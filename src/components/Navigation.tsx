"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Layers, User, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/firebase'

const navItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Draft', icon: Layers, href: '/matchups' },
  { label: 'Live Voting', icon: Activity, href: '/vote' },
  { label: 'Events', icon: Calendar, href: '/events' },
  { label: 'Profile', icon: User, href: '/profile' },
]

export function Navigation() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()
  const [stationTime, setStationTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setStationTime(now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hydration safeguard and Auth blocker
  if (!mounted || isUserLoading || !user || pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Global Tactical Clock Bar */}
      <div className="fixed top-0 left-0 right-0 z-[999999] flex justify-center pointer-events-none">
        <div className="bg-black/90 backdrop-blur-xl px-5 py-1.5 rounded-b-2xl border-x border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto mt-[-1px] transition-all">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,69,0,0.8)]" />
            <p className="text-[10px] font-black italic text-primary tabular-nums tracking-[0.15em] leading-none">
              STATION SYNC: {stationTime}
            </p>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[999999] bg-black/90 backdrop-blur-2xl border-t border-white/10 px-2 py-3 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.6)] h-20">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-1 transition-all duration-300 active:scale-90 flex-1",
                isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-center">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      
      {/* Visual buffer for content at the bottom */}
      <div className="h-20 w-full pointer-events-none" aria-hidden="true" />
    </>
  )
}