import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingCard() {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-[2.5rem] overflow-hidden">
      <CardHeader className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingPerformanceCard() {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-[2.5rem] overflow-hidden">
      <div className="relative h-44 w-full">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingDraftCard() {
  return (
    <Card className="border border-slate-200 bg-white rounded-[3rem] overflow-hidden shadow-sm">
      <div className="p-8 space-y-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </Card>
  )
}
