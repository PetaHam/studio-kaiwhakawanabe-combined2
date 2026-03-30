'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Settings, Zap, Volume2, Sparkles, Eye } from 'lucide-react'
import { useBattleSettings } from '@/contexts/BattleSettingsContext'
import { cn } from '@/lib/utils'

interface BattleSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BattleSettingsModal({ isOpen, onClose }: BattleSettingsModalProps) {
  const { settings, updateSettings } = useBattleSettings()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[3rem] border-2 border-slate-200 bg-white">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic">
              Battle Settings
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animation Speed */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <Label className="text-sm font-black uppercase">Animation Speed</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <Button
                  key={speed}
                  onClick={() => updateSettings({ animationSpeed: speed })}
                  variant={settings.animationSpeed === speed ? 'default' : 'outline'}
                  className={cn(
                    'h-12 rounded-2xl font-bold uppercase text-xs',
                    settings.animationSpeed === speed && 'bg-primary text-slate-950'
                  )}
                >
                  {speed}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Note: Legendary & S-Tier battles are always epic & dramatic
            </p>
          </section>

          {/* Effects Intensity */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label className="text-sm font-black uppercase">Effects Intensity</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <Button
                  key={level}
                  onClick={() => updateSettings({ effectsIntensity: level })}
                  variant={settings.effectsIntensity === level ? 'default' : 'outline'}
                  className={cn(
                    'h-12 rounded-2xl font-bold uppercase text-xs',
                    settings.effectsIntensity === level && 'bg-primary text-slate-950'
                  )}
                >
                  {level}
                </Button>
              ))}
            </div>
          </section>

          {/* Toggle Options */}
          <Card className="p-4 space-y-4 bg-slate-50 border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <div>
                  <Label className="text-sm font-bold">Sound Effects</Label>
                  <p className="text-[10px] text-slate-500">Haptic feedback & audio</p>
                </div>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-slate-600" />
                <div>
                  <Label className="text-sm font-bold">Particle Effects</Label>
                  <p className="text-[10px] text-slate-500">Confetti & celebrations</p>
                </div>
              </div>
              <Switch
                checked={settings.particlesEnabled}
                onCheckedChange={(checked) => updateSettings({ particlesEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-slate-600" />
                <div>
                  <Label className="text-sm font-bold">Accessibility Mode</Label>
                  <p className="text-[10px] text-slate-500">Reduced motion & effects</p>
                </div>
              </div>
              <Switch
                checked={settings.accessibilityMode}
                onCheckedChange={(checked) => updateSettings({ 
                  accessibilityMode: checked,
                  particlesEnabled: !checked,
                  effectsIntensity: checked ? 'low' : 'high'
                })}
              />
            </div>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl font-black uppercase italic bg-primary text-slate-950"
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
