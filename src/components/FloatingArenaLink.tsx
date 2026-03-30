
"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, Trash2, X } from 'lucide-react'
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

/**
 * A draggable, floating action button that appears only when the user is part of an active discussion node.
 * Hides automatically when the user is on the performance page represented by the active node.
 * Includes a "Bin" drop zone for tactical disconnection.
 */
export function FloatingArenaLink() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const db = useFirestore()

  const userRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user])
  const { data: profile } = useDoc(userRef)

  const activePartyId = profile?.activePartyId
  const partyRef = useMemoFirebase(() => activePartyId ? doc(db, 'parties', activePartyId) : null, [db, activePartyId])
  const { data: party } = useDoc(partyRef)


  const [position, setPosition] = useState({ x: 10, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isInDropZone, setIsInDropZone] = useState(false)
  const currentPos = useRef({ x: 10, y: 100 })

  
  const dragRef = useRef<HTMLDivElement>(null)
  const lastClickTime = useRef(0)

  // Visibility logic: Hide if we are currently on the page providing the chat
  const isVisiblePath = useMemo(() => {
    if (!party?.performanceId) return false;
    const targetPathSegment = party.performanceId.replace('_', '-');
    return !pathname?.includes(`/performance/${targetPathSegment}`);
  }, [party?.performanceId, pathname]);

  const shouldRender = !!activePartyId && !!party && isVisiblePath

  const handleDisconnect = async () => {
    if (!user || !activePartyId) return

    const isLeader = party?.leaderId === user.uid

    try {
      // 1. Clear user's active node reference
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        activePartyId: null,
        updatedAt: serverTimestamp()
      })

      // 2. Remove from party members sub-collection
      const memberRef = doc(db, 'parties', activePartyId, 'members', user.uid);
      deleteDocumentNonBlocking(memberRef);

      // 3. If leader, end the session for everyone
      if (isLeader) {
        updateDocumentNonBlocking(doc(db, 'parties', activePartyId), {
          status: 'finished',
          updatedAt: serverTimestamp()
        })
        toast({ title: "Session Terminated", description: "As Matataki, you ended the session." })
      } else {
        toast({ title: "Lobby Disconnected", description: "You left the sync portal." })
      }
    } catch (error) {
      console.error("Disconnect Error:", error)
    }
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      setIsAnimating(false)

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      const newX = Math.min(Math.max(10, clientX - 28), window.innerWidth - 66)
      const newY = Math.min(Math.max(10, clientY - 28), window.innerHeight - 66)
      
      // Magnetic Drop Zone Check
      const dropZoneY = window.innerHeight - 180
      const dropZoneXStart = (window.innerWidth / 2) - 100
      const dropZoneXEnd = (window.innerWidth / 2) + 100
      
      const inZone = clientY > dropZoneY && clientX > dropZoneXStart && clientX < dropZoneXEnd
      setIsInDropZone(inZone)
      
      if (inZone) {
         currentPos.current = { x: window.innerWidth / 2 - 28, y: window.innerHeight - 150 }
         setPosition(currentPos.current)
      } else {
         currentPos.current = { x: newX, y: newY }
         setPosition(currentPos.current)
      }
    }

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (isDragging && isInDropZone) {
        handleDisconnect()
      } else if (isDragging && !isInDropZone) {
        setIsAnimating(true)
        const snapX = currentPos.current.x > (window.innerWidth / 2) - 28 ? window.innerWidth - 66 : 10
        const snapY = Math.min(currentPos.current.y, (window.innerHeight / 2) - 60)
        currentPos.current = { x: snapX, y: Math.max(10, snapY) }
        setPosition(currentPos.current)
      }
      setIsDragging(false)
      setIsInDropZone(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false })
      window.addEventListener('mouseup', handleUp)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, isInDropZone, activePartyId, party, user, db])

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    setShowHint(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return
    
    const now = Date.now()
    const diff = now - lastClickTime.current
    
    if (diff < 300) {
      if (party?.performanceId === 'legacy_arena') {
        router.push(`/performance/legacy-arena`)
      } else {
        router.push(`/performance/${party?.performanceId}?partyId=${activePartyId}`)
      }
      setShowHint(false)
    } else {
      setShowHint(!showHint)
    }
    lastClickTime.current = now
  }

  if (!shouldRender) return null

  const isLeader = party?.leaderId === user?.uid

  return (
    <>
      {/* Drop Zone / Trash Bin */}
      <div 
        className={cn(
          "fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] transition-all duration-500 pointer-events-none flex flex-col items-center gap-2",
          isDragging ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-50"
        )}
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 border-4",
          isInDropZone 
            ? "bg-red-600 scale-125 border-white shadow-[0_0_40px_rgba(220,38,38,0.8)]" 
            : "bg-slate-950/60 backdrop-blur-xl border-white/20"
        )}>
          <Trash2 className={cn("w-8 h-8 transition-colors", isInDropZone ? "text-white" : "text-white/40")} />
        </div>
        <p className={cn(
          "text-[9px] font-black uppercase tracking-[0.3em] transition-colors bg-black/40 px-3 py-1 rounded-full",
          isInDropZone ? "text-white" : "text-white/40"
        )}>
          {isLeader ? 'TERMINATE ARENA' : 'LEAVE LOBBY'}
        </p>
      </div>

      <div 
        ref={dragRef}
        className={cn(
          "fixed z-[9999] pointer-events-none select-none",
          isAnimating ? "transition-all duration-300 ease-out" : ""
        )}
        style={{ left: position.x, top: position.y }}
      >
        <div className="relative pointer-events-auto">
          {/* Connection Pulse Ring */}
          {!isDragging && (
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-125" />
          )}
          
          {showHint && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-black text-white text-[9px] font-black uppercase italic tracking-widest px-4 py-2 rounded-xl border border-white/10 shadow-2xl whitespace-nowrap flex flex-col items-center gap-1">
                <span className="text-primary">SYNC LOBBY ACTIVE</span>
                <span>Double-Tap to Re-Entry</span>
                <span className="text-[7px] text-white/40 mt-1 uppercase">Drag to Bin to Exit</span>
              </div>
              <div className="w-2 h-2 bg-black rotate-45 mx-auto -mt-1 border-r border-b border-white/10" />
            </div>
          )}

          <button
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onClick={handleClick}
            className={cn(
              "w-14 h-14 rounded-full bg-slate-950 border-4 border-primary shadow-[0_0_25px_rgba(255,69,0,0.5)] flex items-center justify-center transition-all active:scale-90 relative overflow-hidden",
              isDragging ? "cursor-grabbing scale-110 opacity-90 shadow-none" : "cursor-grab",
              isInDropZone && "border-white bg-red-600 shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            )}
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-tr transition-colors",
              isInDropZone ? "from-red-950/40 to-transparent" : "from-primary/30 to-transparent"
            )} />
            
            <div className="relative z-10 flex flex-col items-center">
              {isInDropZone ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <>
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <div className="flex gap-0.5 mt-0.5">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
