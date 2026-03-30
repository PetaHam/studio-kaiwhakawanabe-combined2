'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface BattleSettings {
  animationSpeed: 'normal' | 'fast' | 'slow'
  effectsIntensity: 'low' | 'medium' | 'high'
  accessibilityMode: boolean
  soundEnabled: boolean
  particlesEnabled: boolean
}

interface BattleSettingsContextType {
  settings: BattleSettings
  updateSettings: (updates: Partial<BattleSettings>) => void
  getAnimationDuration: (tier: string) => number
}

const defaultSettings: BattleSettings = {
  animationSpeed: 'normal',
  effectsIntensity: 'high',
  accessibilityMode: false,
  soundEnabled: true,
  particlesEnabled: true
}

const BattleSettingsContext = createContext<BattleSettingsContextType | undefined>(undefined)

export function BattleSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BattleSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('battleSettings')
      return saved ? JSON.parse(saved) : defaultSettings
    }
    return defaultSettings
  })

  const updateSettings = (updates: Partial<BattleSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    if (typeof window !== 'undefined') {
      localStorage.setItem('battleSettings', JSON.stringify(newSettings))
    }
  }

  const getAnimationDuration = (tier: string): number => {
    const isLegendary = tier === 'Legendary' || tier === 'S-Tier'
    const baseSpeed = settings.animationSpeed

    if (isLegendary) {
      // Epic & dramatic for legendary
      switch (baseSpeed) {
        case 'fast': return 2000
        case 'normal': return 3000
        case 'slow': return 4000
      }
    } else {
      // Smooth & gradual for normal
      switch (baseSpeed) {
        case 'fast': return 800
        case 'normal': return 1200
        case 'slow': return 1800
      }
    }
    return 1200
  }

  return (
    <BattleSettingsContext.Provider value={{ settings, updateSettings, getAnimationDuration }}>
      {children}
    </BattleSettingsContext.Provider>
  )
}

export function useBattleSettings() {
  const context = useContext(BattleSettingsContext)
  if (!context) {
    throw new Error('useBattleSettings must be used within BattleSettingsProvider')
  }
  return context
}
