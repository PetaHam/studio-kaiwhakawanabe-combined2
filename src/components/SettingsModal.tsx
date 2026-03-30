'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Settings, Moon, Sun, Sparkles, Bell, HelpCircle, LogOut, User, Palette } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function SettingsModal() {
  const [manaEnabled, setManaEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-10 w-10 rounded-full"
          data-testid="settings-button"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2 border-slate-200 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Settings className="w-6 h-6 text-slate-950" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic">Settings</DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Customize your judging experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-950 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </h3>
            
            <Card className="p-4 space-y-4 bg-slate-50/50 border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="dark-mode" className="text-xs font-bold">Dark Mode</Label>
                  <p className="text-[9px] text-slate-500">Coming soon - stadium lights out</p>
                </div>
                <Switch 
                  id="dark-mode" 
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  disabled
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="mana-bg" className="text-xs font-bold flex items-center gap-2">
                    Mana Background
                    <Sparkles className="w-3 h-3 text-primary" />
                  </Label>
                  <p className="text-[9px] text-slate-500">Animated shard particles</p>
                </div>
                <Switch 
                  id="mana-bg" 
                  checked={manaEnabled}
                  onCheckedChange={setManaEnabled}
                />
              </div>
            </Card>
          </section>

          {/* Notifications Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-950 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            
            <Card className="p-4 space-y-4 bg-slate-50/50 border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications" className="text-xs font-bold">Push Notifications</Label>
                  <p className="text-[9px] text-slate-500">Get notified of live events</p>
                </div>
                <Switch 
                  id="notifications" 
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </Card>
          </section>

          {/* Help & Support Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-950 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Help & Support
            </h3>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-2xl h-12 font-bold"
                onClick={() => {
                  localStorage.removeItem('tutorialCompleted')
                  window.location.reload()
                }}
              >
                <HelpCircle className="w-4 h-4 mr-3" />
                Restart Tutorial
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-2xl h-12 font-bold"
              >
                <User className="w-4 h-4 mr-3" />
                View Profile
              </Button>
            </div>
          </section>

          {/* App Info */}
          <section className="pt-4">
            <Card className="p-4 bg-slate-50/50 border-slate-200 rounded-2xl text-center space-y-2">
              <Badge variant="outline" className="text-[9px] font-black uppercase">
                v1.0.0
              </Badge>
              <p className="text-[9px] text-slate-500">
                Kaiwhakawānabe – The Couch Judge
              </p>
            </Card>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
