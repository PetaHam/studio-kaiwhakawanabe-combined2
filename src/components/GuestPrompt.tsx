'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCircle, LogIn, ArrowRight, ShieldCheck } from 'lucide-react'
import { useUser } from '@/firebase'

interface GuestPromptProps {
  feature: string
  description: string
  onSignIn?: () => void
}

export function GuestPrompt({ feature, description, onSignIn }: GuestPromptProps) {
  const { user } = useUser()

  if (!user || !user.isAnonymous) return null

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-xl rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="h-1.5 bg-gradient-to-r from-orange-400 to-primary w-full" />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-orange-100 shrink-0">
            <UserCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-black uppercase border-orange-300 text-orange-700 bg-orange-50">
                Guest Mode
              </Badge>
            </div>
            <h3 className="text-base font-black uppercase italic text-slate-950">
              {feature}
            </h3>
            <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">
            Your progress is saved automatically
          </p>
        </div>

        {onSignIn && (
          <Button 
            onClick={onSignIn}
            className="w-full h-12 rounded-2xl font-black uppercase italic bg-gradient-to-r from-orange-500 to-primary text-white shadow-lg"
          >
            Create Account
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function InlineGuestHint({ message }: { message: string }) {
  const { user } = useUser()

  if (!user || !user.isAnonymous) return null

  return (
    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-2xl">
      <UserCircle className="w-4 h-4 text-orange-600 shrink-0" />
      <p className="text-[10px] font-bold text-orange-700">{message}</p>
    </div>
  )
}
