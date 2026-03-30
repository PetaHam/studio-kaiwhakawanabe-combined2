'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Gavel, Users, X, Crown, UserCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const ADJUDICATION_ITEMS = [
  { id: 'whakaeke', name: 'Whakaeke' },
  { id: 'moteatea', name: 'Mōteatea' },
  { id: 'poi', name: 'Poi' },
  { id: 'waiata_a_ringa', name: 'Waiata-ā-ringa' },
  { id: 'haka', name: 'Haka' },
  { id: 'whakawatea', name: 'Whakawātea' }
];

interface ChatPanelProps {
  partyMessages: any[]
  currentUserId: string
  scores: Record<string, number>
  onScoreChange: (itemId: string, value: number) => void
  onSendMessage: (message: string) => void
  isLeader: boolean
  assignedItems: string[]
  showCompactMode?: boolean
}

export function EnhancedChatPanel({
  partyMessages,
  currentUserId,
  scores,
  onScoreChange,
  onSendMessage,
  isLeader,
  assignedItems,
  showCompactMode = false
}: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const [showScoreboard, setShowScoreboard] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Confirmation modal state
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [pendingValue, setPendingValue] = useState<number>(0)
  const [originalValue, setOriginalValue] = useState<number>(0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [partyMessages])

  const handleSend = () => {
    if (!message.trim()) return
    onSendMessage(message)
    setMessage('')
  }

  const handleSliderStart = (itemId: string) => {
    const canEdit = isLeader || assignedItems.includes(itemId)
    if (!canEdit) return
    
    setEditingItem(itemId)
    setPendingValue(scores[itemId] || 50)
    setOriginalValue(scores[itemId] || 50)
  }

  const handleSliderChange = (value: number[]) => {
    if (!editingItem) return
    setPendingValue(value[0])
  }

  const handleConfirmScore = () => {
    if (editingItem) {
      onScoreChange(editingItem, pendingValue)
      setEditingItem(null)
    }
  }

  const handleCancelScore = () => {
    if (editingItem) {
      onScoreChange(editingItem, originalValue)
      setEditingItem(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Integrated Scoring Panel */}
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        showScoreboard ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-black uppercase italic text-slate-950">Judge Panel</h3>
            </div>
            {isLeader && (
              <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/30 text-primary">
                <Crown className="w-3 h-3 mr-1" />
                Lead Judge
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {ADJUDICATION_ITEMS.map(item => {
              const canEdit = isLeader || assignedItems.includes(item.id)
              const isEditingThisItem = editingItem === item.id
              
              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className={cn(
                      "text-[10px] font-black uppercase italic",
                      canEdit ? "text-slate-950" : "text-slate-400"
                    )}>
                      {item.name}
                      {assignedItems.includes(item.id) && !isLeader && (
                        <UserCheck className="w-3 h-3 inline ml-1 text-green-600" />
                      )}
                    </label>
                    <span className={cn(
                      "text-[11px] font-black tabular-nums",
                      canEdit ? "text-primary" : "text-slate-400"
                    )}>
                      {isEditingThisItem ? pendingValue.toFixed(1) : (scores[item.id]?.toFixed(1) || 50)}%
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Slider
                      value={[isEditingThisItem ? pendingValue : (scores[item.id] || 50)]}
                      max={100}
                      step={0.1}
                      onPointerDown={() => handleSliderStart(item.id)}
                      onValueChange={v => handleSliderChange(v)}
                      disabled={!canEdit || editingItem !== null && editingItem !== item.id}
                      className={cn(
                        "transition-opacity",
                        !canEdit && "opacity-40 cursor-not-allowed",
                        editingItem !== null && editingItem !== item.id && "opacity-50"
                      )}
                    />

                    {/* Confirmation Modal */}
                    {isEditingThisItem && (
                      <div className="absolute -top-20 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Card className="p-4 bg-white shadow-xl border-2 border-primary/50 rounded-2xl">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-500">
                                {item.name}
                              </span>
                              <span className="text-xl font-black text-primary tabular-nums">
                                {pendingValue.toFixed(1)}%
                              </span>
                            </div>
                            
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-150"
                                style={{ width: `${pendingValue}%` }}
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={handleCancelScore}
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleConfirmScore}
                                size="sm"
                                className="flex-1 h-9 rounded-xl text-[10px] font-black uppercase bg-primary text-slate-950 hover:bg-primary/90"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!isLeader && assignedItems.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">
                You're delegated to judge: {assignedItems.map(id => 
                  ADJUDICATION_ITEMS.find(i => i.id === id)?.name
                ).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4 pt-6 bg-white">
        <div className="flex flex-col gap-3 pb-6">
          {partyMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-50">
              <Users className="w-10 h-10 text-slate-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                No messages yet
              </p>
            </div>
          ) : (
            partyMessages.map((m, idx) => {
              const isOwnMessage = m.userId === currentUserId
              return (
                <div
                  key={m.id || idx}
                  className={cn(
                    "flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isOwnMessage ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8 shrink-0 border-2" style={{ borderColor: m.userColor || '#ccc' }}>
                      <AvatarFallback className="text-[10px] font-black" style={{ backgroundColor: m.userColor + '20', color: m.userColor }}>
                        {(m.userName || 'J').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "flex flex-col gap-1 max-w-[75%]",
                    isOwnMessage ? "items-end" : "items-start"
                  )}>
                    {!isOwnMessage && (
                      <span className="text-[9px] font-bold text-slate-500 px-2">
                        {m.userName || 'Judge'}
                      </span>
                    )}
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm",
                      isOwnMessage 
                        ? "bg-primary text-slate-950 rounded-br-sm" 
                        : "bg-slate-100 text-slate-950 rounded-bl-sm"
                    )}>
                      {m.text}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area with Toggle */}
      <div className="bg-white border-t border-slate-200 p-4 space-y-3">
        {/* Judge Panel Toggle */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScoreboard(!showScoreboard)}
            className={cn(
              "h-9 px-5 rounded-full font-black text-[9px] uppercase italic gap-2 transition-all",
              showScoreboard 
                ? "bg-primary text-slate-950 border-primary hover:bg-primary/90" 
                : "bg-white text-primary border-slate-200 hover:bg-slate-50"
            )}
          >
            <Gavel className="w-3.5 h-3.5" />
            {showScoreboard ? 'Close Panel' : 'Judge Panel'}
          </Button>
        </div>

        {/* Message Input */}
        <div className="relative">
          <Input
            placeholder="Type your hot-take..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="rounded-2xl h-12 bg-slate-50 pr-14 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl bg-primary text-slate-950 hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}