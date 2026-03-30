import React from 'react'
import { LoadingPerformanceCard } from '@/components/LoadingCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function VoteLoading() {
  return (
    <div className="space-y-6 pb-24">
      <header className="sticky top-4 z-40 px-1">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </header>

      <div className="space-y-8 px-1">
        {[1, 2, 3].map((i) => (
          <LoadingPerformanceCard key={i} />
        ))}
      </div>
    </div>
  )
}
