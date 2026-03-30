import React from 'react'
import { LoadingPerformanceCard } from '@/components/LoadingCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function EventsLoading() {
  return (
    <div className="space-y-6 pb-12">
      <header className="sticky top-4 z-40 bg-white/80 backdrop-blur-lg border rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </header>
      
      <div className="space-y-6 px-1">
        {[1, 2].map((i) => (
          <LoadingPerformanceCard key={i} />
        ))}
      </div>
    </div>
  )
}
