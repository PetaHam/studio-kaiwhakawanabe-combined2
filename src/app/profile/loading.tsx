import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-24 relative">
      <header className="sticky top-4 z-40 px-1">
        <div className="bg-white/80 backdrop-blur-lg border rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>

      <div className="p-4 space-y-10">
        <header className="flex flex-col items-center gap-6 py-8">
          <Skeleton className="w-56 h-56 rounded-full" />
          <div className="text-center space-y-4">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-8 w-40 mx-auto rounded-full" />
            <Skeleton className="h-6 w-32 mx-auto rounded-full" />
          </div>
        </header>

        <Card className="bg-white border shadow-xl rounded-[2.5rem] overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white border shadow-md rounded-2xl p-4">
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
