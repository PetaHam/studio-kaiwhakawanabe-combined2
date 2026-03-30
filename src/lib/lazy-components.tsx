import React from 'react'
import dynamic from 'next/dynamic'

// Loading component for dynamic imports
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
)

// Lazy load heavy modals and dialogs
export const LazyUnifiedStoreModal = dynamic(
  () => import('@/components/UnifiedStoreModal').then(mod => ({ default: mod.UnifiedStoreModal })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyWelcomeModal = dynamic(
  () => import('@/components/WelcomeModal').then(mod => ({ default: mod.WelcomeModal })),
  {
    loading: () => null,
    ssr: false
  }
)

export const LazySettingsModal = dynamic(
  () => import('@/components/SettingsModal').then(mod => ({ default: mod.SettingsModal })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyEnhancedChatPanel = dynamic(
  () => import('@/components/EnhancedChatPanel').then(mod => ({ default: mod.EnhancedChatPanel })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)