"use client"

import React, { useState, useEffect } from 'react'
import { collection, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, UserPlus, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const ADJUDICATION_ITEMS = [
  { id: 'whakaeke', name: 'Whakaeke' },
  { id: 'moteatea', name: 'Mōteatea' },
  { id: 'poi', name: 'Poi' },
  { id: 'waiata_a_ringa', name: 'Waiata-ā-ringa' },
  { id: 'haka', name: 'Haka' },
  { id: 'whakawatea', name: 'Whakawātea' }
];

export function DelegateJudgeModal({ partyId, isLeader }: { partyId: string | null, isLeader: boolean }) {
  const db = useFirestore()
  const [open, setOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({})

  // Only listen to pending members if we are the leader and there is a party
  const pendingMembersQuery = useMemoFirebase(() => {
    if (!partyId || !isLeader) return null
    return query(collection(db, 'parties', partyId, 'members'), where('status', '==', 'pending'))
  }, [db, partyId, isLeader])

  const { data: pendingMembers } = useCollection(pendingMembersQuery)

  useEffect(() => {
    if (pendingMembers && pendingMembers.length > 0) {
      // Initialize selected items for any new pending members (default all)
      setSelectedItems(prev => {
        const next = { ...prev }
        pendingMembers.forEach(m => {
          if (!next[m.id]) next[m.id] = ADJUDICATION_ITEMS.map(i => i.id)
        })
        return next
      })
      // If modal isn't open, we should alert the leader!
      if (!open) {
        toast({ 
          title: "Waiting Room Alert", 
          description: `${pendingMembers.length} ${pendingMembers.length === 1 ? 'Judge is' : 'Judges are'} waiting for your delegation.`,
          duration: 5000,
        })
      }
    }
  }, [pendingMembers, open])

  if (!isLeader || !partyId || !pendingMembers || pendingMembers.length === 0) return null;

  const toggleItem = (userId: string, itemId: string) => {
    setSelectedItems(prev => {
      const userItems = prev[userId] || []
      if (userItems.includes(itemId)) {
        return { ...prev, [userId]: userItems.filter(i => i !== itemId) }
      } else {
        return { ...prev, [userId]: [...userItems, itemId] }
      }
    })
  }

  const approveJudge = (userId: string, userName: string) => {
    const items = selectedItems[userId] || []
    if (items.length === 0) {
      toast({ title: "Checklist Empty", description: "You must delegate at least one item to this judge.", variant: "destructive" })
      return
    }

    try {
      updateDocumentNonBlocking(doc(db, 'parties', partyId, 'members', userId), {
        status: 'approved',
        assignedItems: items,
        approvedAt: serverTimestamp()
      })
      toast({ title: "Judge Authorized", description: `${userName} has been granted access to score ${items.length} items.` })
    } catch (err) {
      console.error(err)
    }
  }

  const denyJudge = (userId: string) => {
    try {
      updateDocumentNonBlocking(doc(db, 'parties', partyId, 'members', userId), {
        status: 'denied',
        assignedItems: [],
        deniedAt: serverTimestamp()
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
        <Button 
          onClick={() => setOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 h-12 shadow-[0_0_30px_rgba(255,69,0,0.5)] border-2 border-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 animate-pulse"
        >
          <UserPlus className="w-4 h-4" />
          {pendingMembers.length} Pending Approval
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[450px] rounded-[2.5rem] p-8 shadow-2xl bg-white/95 backdrop-blur-xl border border-slate-200">
          <DialogHeader className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <DialogTitle className="uppercase italic font-black text-2xl text-center text-slate-950 leading-none">Delegate Judges</DialogTitle>
            <DialogDescription className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">
              Assign scoring responsibilities to incoming connections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 pb-4 plugin-scrollbar">
            {pendingMembers.map((member) => (
              <div key={member.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs" style={{ backgroundColor: member.userColor }}>
                      {member.userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-950 uppercase italic leading-tight">{member.userName}</h4>
                      <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Waiting in Lobby</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => denyJudge(member.id)} className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {ADJUDICATION_ITEMS.map(item => {
                    const isSelected = (selectedItems[member.id] || []).includes(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(member.id, item.id)}
                        className={cn(
                          "h-10 px-3 rounded-xl border flex items-center justify-between transition-all group",
                          isSelected ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        <span className={cn("text-[9px] font-black uppercase tracking-wider", isSelected ? "text-primary" : "text-slate-500")}>{item.name}</span>
                        <div className={cn("w-3 h-3 rounded-full border border-current flex items-center justify-center", isSelected ? "bg-primary text-white" : "")}>
                          {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <Button 
                  onClick={() => approveJudge(member.id, member.userName)}
                  className="w-full h-12 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-black uppercase italic tracking-wider text-[11px]"
                >
                  Delegate & Allow Entry
                </Button>
              </div>
            ))}
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
