"use client"
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Flame, Zap, Trophy, ShoppingCart } from 'lucide-react'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { doc, serverTimestamp, increment } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const MANA_PACKS = [
  { name: 'Initiate Pack', mana: 5000, price: '0.99', icon: Flame },
  { name: 'Matataki Pouch', mana: 15000, price: '2.99', icon: Zap },
  { name: 'Legendary Vault', mana: 30000, price: '4.99', icon: Trophy },
]

export function StoreModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useUser()
  const db = useFirestore()
  const pathname = usePathname()

  const handleBuyMana = (pack: any) => {
    if (!user) return;
    updateDocumentNonBlocking(doc(db, 'users', user.uid), { purchasedMana: increment(pack.mana), updatedAt: serverTimestamp() });
    toast({ title: "Shards Purchased!", description: `${pack.mana} Mana Shards added to your pool.` });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[3rem] max-w-[360px] p-6 border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center justify-center gap-2 uppercase italic font-black text-2xl text-slate-950">
            <ShoppingCart className="w-6 h-6 text-primary" /> SHARD VAULT
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 mt-2">
            Procure Mana Shards to unlock heritage teams and expand your draft roster.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {user?.isAnonymous && <Link href={`/login?returnUrl=${pathname}`} className="text-[10px] text-center text-red-500 font-bold uppercase mb-2 block hover:underline bg-red-50 py-2 rounded-xl border border-red-100">Registration Required to Purchase</Link>}
          <div className="grid gap-3">
            {MANA_PACKS.map(pack => (
              <Button key={pack.name} disabled={user?.isAnonymous} variant="outline" className="w-full h-20 justify-between items-center p-4 rounded-3xl border border-slate-200 bg-slate-50 hover:border-primary hover:bg-white transition-all group shadow-sm disabled:opacity-50" onClick={() => handleBuyMana(pack)}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm"><pack.icon className="w-6 h-6" /></div>
                  <div className="text-left leading-none">
                    <p className="text-[11px] font-black uppercase italic text-slate-950">{pack.name}</p>
                    <p className="text-[10px] font-bold text-primary mt-1">+{pack.mana} Shards</p>
                  </div>
                </div>
                <Badge className="bg-primary text-white font-black italic text-[11px] h-8 px-4 shadow-sm border-none rounded-full">${pack.price}</Badge>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
