'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
        <div className="p-6 rounded-full bg-white border-2 border-slate-100 shadow-sm">
          <Icon className="w-10 h-10 text-slate-400" />
        </div>
        
        <div className="space-y-2 max-w-xs">
          <h3 className="text-lg font-black uppercase italic text-slate-950">
            {title}
          </h3>
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        {actionLabel && onAction && (
          <Button 
            onClick={onAction}
            className="h-12 rounded-2xl font-black uppercase italic bg-primary text-slate-950 shadow-lg px-6"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function EmptyStateInline({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-500">
      <div className="p-4 rounded-full bg-slate-100">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {message}
      </p>
    </div>
  )
}
