'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-10 space-y-8 text-center border border-slate-200 bg-white rounded-[3rem] shadow-2xl">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="text-[120px] font-black italic text-primary/10 leading-none">404</div>
              <Search className="w-16 h-16 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black uppercase italic text-slate-950 tracking-tight">Arena Not Found</h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4">
              This judging station doesn't exist or has been archived.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => router.push('/')}
            className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary text-slate-950 shadow-xl"
          >
            <Home className="w-5 h-5 mr-2" />
            Return to Dashboard
          </Button>
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="w-full h-12 rounded-2xl font-black uppercase italic text-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  )
}
