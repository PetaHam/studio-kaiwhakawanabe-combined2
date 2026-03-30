'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingCart, Flame, Zap, Trophy, Sparkles, 
  Lock, Crown, Star, Gift
} from 'lucide-react'
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { doc, serverTimestamp, increment } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import { showToast } from '@/lib/toast-helpers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export const MANA_PACKS = [
  { 
    id: 'starter',
    name: 'Initiate Pack', 
    mana: 5000, 
    price: 0.99, 
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    popular: false
  },
  { 
    id: 'standard',
    name: 'Matataki Pouch', 
    mana: 15000, 
    price: 2.99, 
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    popular: true,
    bonus: '+2000 bonus'
  },
  { 
    id: 'premium',
    name: 'Legendary Vault', 
    mana: 30000, 
    price: 4.99, 
    icon: Trophy,
    color: 'from-purple-500 to-pink-500',
    popular: false,
    bonus: '+5000 bonus'
  },
]

const SPECIAL_OFFERS = [
  {
    id: 'season-pass',
    name: 'Season Pass',
    description: '2x rewards for 30 days',
    price: 9.99,
    icon: Crown,
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'legacy-bundle',
    name: 'Legacy Bundle',
    description: 'Unlock 3 S-Tier teams',
    price: 7.99,
    icon: Star,
    color: 'from-indigo-500 to-purple-500'
  }
]

interface UnifiedStoreModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'mana' | 'special'
}

export function UnifiedStoreModal({ isOpen, onClose, defaultTab = 'mana' }: UnifiedStoreModalProps) {
  const { user } = useUser()
  const db = useFirestore()
  const pathname = usePathname()
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const handleBuyMana = async (pack: typeof MANA_PACKS[0]) => {
    if (!user || user.isAnonymous) {
      showToast.warning('Registration Required', 'Please create an account to purchase Mana Shards')
      return
    }

    setPurchasing(pack.id)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await updateDocumentNonBlocking(
        doc(db, 'users', user.uid),
        {
          purchasedMana: increment(pack.mana),
          updatedAt: serverTimestamp()
        }
      )
      
      showToast.manaEarned(pack.mana, `Purchased ${pack.name}`)
      
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      showToast.error('Purchase Failed', 'Please try again')
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[3rem] border-2 border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-orange-500 to-red-500" />
        
        <DialogHeader className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-primary/10">
              <ShoppingCart className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-3xl font-black uppercase italic text-slate-950">
            Shard Vault
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 mt-2">
            Procure Mana Shards & unlock heritage teams
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="px-6 pb-6">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-2xl">
            <TabsTrigger 
              value="mana"
              className="rounded-xl font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Mana Shards
            </TabsTrigger>
            <TabsTrigger 
              value="special"
              className="rounded-xl font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Gift className="w-3.5 h-3.5 mr-2" />
              Special
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mana" className="space-y-3 mt-0">
            {user?.isAnonymous && (
              <Link 
                href={`/login?returnUrl=${pathname}`}
                className="block text-center text-[10px] text-red-600 font-bold uppercase py-3 rounded-2xl bg-red-50 border-2 border-red-100 hover:bg-red-100 transition-colors"
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Registration Required to Purchase
              </Link>
            )}
            
            <div className="space-y-3">
              {MANA_PACKS.map(pack => (
                <Card 
                  key={pack.id}
                  className={cn(
                    "border-2 transition-all duration-300 overflow-hidden",
                    pack.popular 
                      ? "border-primary shadow-lg shadow-primary/20" 
                      : "border-slate-200 hover:border-primary/50"
                  )}
                >
                  {pack.popular && (
                    <div className="bg-primary text-slate-950 text-center py-1 px-3">
                      <p className="text-[8px] font-black uppercase tracking-widest">
                        ⚡ Most Popular
                      </p>
                    </div>
                  )}
                  <CardContent className="p-0">
                    <Button
                      disabled={user?.isAnonymous || purchasing === pack.id}
                      variant="ghost"
                      className="w-full h-auto p-5 hover:bg-slate-50 transition-all group rounded-none"
                      onClick={() => handleBuyMana(pack)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
                            pack.color
                          )}>
                            <pack.icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="text-left space-y-1">
                            <p className="text-sm font-black uppercase italic text-slate-950">
                              {pack.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-primary">
                                +{pack.mana.toLocaleString()} Shards
                              </p>
                              {pack.bonus && (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-[8px] font-black h-5">
                                  {pack.bonus}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-slate-950 text-white font-black italic text-sm h-10 px-5 shadow-md border-none rounded-2xl">
                          ${pack.price}
                        </Badge>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="special" className="space-y-3 mt-0">
            {SPECIAL_OFFERS.map(offer => (
              <Card key={offer.id} className="border-2 border-slate-200 hover:border-primary/50 transition-all">
                <CardContent className="p-0">
                  <Button
                    disabled={user?.isAnonymous}
                    variant="ghost"
                    className="w-full h-auto p-5 hover:bg-slate-50 transition-all rounded-none"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
                          offer.color
                        )}>
                          <offer.icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left space-y-1">
                          <p className="text-sm font-black uppercase italic text-slate-950">
                            {offer.name}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500">
                            {offer.description}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-slate-950 text-white font-black italic text-sm h-10 px-5 shadow-md border-none rounded-2xl">
                        ${offer.price}
                      </Badge>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            <div className="pt-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                More offers coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {purchasing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-[3rem]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-black uppercase text-slate-950">Processing...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
