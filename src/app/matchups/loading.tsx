import React from 'react'
import { LoadingDraftCard } from '@/components/LoadingCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function MatchupsLoading() {
  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto">
      <header className="sticky top-4 z-40 px-1">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      <div className="px-1">
        <LoadingDraftCard />
      </div>

      <div className="px-1 space-y-4">
        <div className="flex items-center gap-3 py-4 px-2">
          <Skeleton className="h-12 flex-1 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[2.5rem]" />
          ))}
        </div>
      </div>
    </div>
  )
}
