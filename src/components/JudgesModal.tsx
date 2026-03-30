"use client"
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Award, ChevronRight, Scale } from 'lucide-react'
import { TE_MATATINI_JUDGES } from '@/lib/judges-data'
import { Badge } from '@/components/ui/badge'

export function JudgesHonourCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="border-2 border-slate-200 bg-white rounded-[2.5rem] overflow-hidden group shadow-sm cursor-pointer hover:border-slate-300 transition-colors" onClick={onOpen}>
      <CardContent className="p-6 flex items-center justify-between gap-4">
         <div className="flex items-center gap-4">
           <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 shadow-inner">
             <Scale className="w-5 h-5" />
           </div>
           <div className="space-y-1 text-left">
             <h3 className="text-[11px] font-black uppercase italic text-slate-950 leading-none tracking-tight">ROLL OF HONOUR</h3>
             <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-tight">National Adjudicators</p>
           </div>
         </div>
         <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
      </CardContent>
    </Card>
  )
}

export function JudgesHonourModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[3rem] max-w-[500px] h-[80vh] flex flex-col p-0 border-2 border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="p-6 text-center border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-slate-200 text-slate-700 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
          </div>
          <DialogTitle className="uppercase italic font-black text-2xl text-slate-950">
            TE MATATINI JUDGES
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 mt-2">
            Acknowledging the respected adjudicators across National History
          </DialogDescription>
        </div>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-8 pb-10">
            {TE_MATATINI_JUDGES.map((era) => (
              <div key={era.year} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-slate-200 flex-1" />
                  <Badge variant="outline" className="text-sm font-black italic border-slate-300 shadow-sm px-4 py-1.5 uppercase">
                    {era.year}
                  </Badge>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {era.judges.map(judge => (
                    <span key={judge} className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-tight">
                      {judge}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
