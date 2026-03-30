'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full p-8 space-y-6 text-center border-2 border-red-100 bg-white rounded-[2.5rem] shadow-2xl">
        <div className="flex justify-center">
          <div className="p-6 rounded-full bg-red-50 border-4 border-red-100">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-black uppercase italic text-slate-950">Technical Fault</h1>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            A critical error occurred. The judging system needs to reset.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-left">
              <p className="text-[9px] font-mono text-red-600 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-[8px] font-mono text-red-400 mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={reset}
            className="w-full h-12 rounded-2xl font-black uppercase italic bg-slate-950 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full h-12 rounded-2xl font-black uppercase italic"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
}
