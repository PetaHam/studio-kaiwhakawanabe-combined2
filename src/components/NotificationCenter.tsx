'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Check, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDismiss: (id: string) => void
  onClearAll: () => void
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-green-600" />
      case 'info': return <Info className="w-5 h-5 text-blue-600" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'info': return 'border-blue-200 bg-blue-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      case 'error': return 'border-red-200 bg-red-50'
    }
  }

  return (
    <>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 rounded-full"
        aria-label={`Notifications. ${unreadCount} unread.`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl z-50 animate-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black uppercase italic text-slate-950">
                  Notifications
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    className="h-8 text-xs font-bold rounded-xl"
                  >
                    Mark all read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
                    className="h-8 text-xs font-bold rounded-xl"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <ScrollArea className="max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Bell className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    No notifications
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={cn(
                        'border-2 transition-all animate-in slide-in-from-right-2',
                        getColor(notification.type),
                        !notification.read && 'shadow-md'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="shrink-0 mt-0.5">
                            {getIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black text-slate-950">
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-slate-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2">
                                  {formatTimestamp(notification.timestamp)}
                                </p>
                              </div>
                              
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                              )}
                            </div>

                            {notification.action && (
                              <Button
                                size="sm"
                                onClick={notification.action.onClick}
                                className="h-8 text-xs font-bold rounded-xl"
                              >
                                {notification.action.label}
                              </Button>
                            )}

                            <div className="flex gap-2 pt-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="h-7 text-[10px] font-bold"
                                >
                                  Mark as read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDismiss(notification.id)}
                                className="h-7 text-[10px] font-bold"
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </>
  )
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}
