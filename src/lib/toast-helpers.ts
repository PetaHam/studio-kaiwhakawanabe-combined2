import { toast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, AlertCircle, Info, Sparkles } from 'lucide-react'

export const showToast = {
  success: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      duration: 3000,
      className: 'border-green-200 bg-green-50',
    })
  },

  error: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      duration: 4000,
      className: 'border-red-200 bg-red-50',
      variant: 'destructive',
    })
  },

  warning: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      duration: 3500,
      className: 'border-orange-200 bg-orange-50',
    })
  },

  info: (message: string, description?: string) => {
    toast({
      title: message,
      description,
      duration: 3000,
      className: 'border-blue-200 bg-blue-50',
    })
  },

  manaEarned: (amount: number, reason: string) => {
    toast({
      title: `+${amount} Mana Shards! ✨`,
      description: reason,
      duration: 4000,
      className: 'border-primary/30 bg-primary/5',
    })
  },

  guestReminder: (feature: string) => {
    toast({
      title: 'Guest Mode',
      description: `${feature} - Your progress is saved, but creating an account unlocks more features!`,
      duration: 5000,
      className: 'border-orange-200 bg-orange-50',
    })
  },
}
