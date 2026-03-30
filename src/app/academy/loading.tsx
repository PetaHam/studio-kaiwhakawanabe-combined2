import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AcademyLoading() {
  return (
    <div className="space-y-8 pb-12">
      <header className="sticky top-4 z-40 px-1">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200/50 rounded-[2.5rem] p-4 shadow-2xl flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto py-4 px-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-12 w-32 rounded-2xl shrink-0" />
        ))}
      </div>

      <div className="px-4 space-y-6">
        <Card className="bg-white border-4 border-slate-100 shadow-2xl rounded-[3rem] overflow-hidden">
          <div className="h-3 w-full bg-slate-100" />
          <CardHeader className="p-8 pb-4 space-y-4">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-10">
            <div className="space-y-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
