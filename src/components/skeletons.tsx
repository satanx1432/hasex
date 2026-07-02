'use client'

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface ${className}`} />
  )
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-4 rounded" />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 border border-border bg-surface ${className}`}>
      <SkeletonBlock className="h-6 w-1/3 mb-4 rounded" />
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="p-6 border border-border bg-surface text-center">
      <SkeletonBlock className="h-4 w-20 mx-auto mb-2 rounded" />
      <SkeletonBlock className="h-8 w-16 mx-auto rounded" />
    </div>
  )
}

export function SkeletonLeaderboardRow() {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border">
      <div className="col-span-1"><SkeletonBlock className="h-5 w-5 rounded" /></div>
      <div className="col-span-5"><SkeletonBlock className="h-4 w-24 rounded" /></div>
      <div className="col-span-3"><SkeletonBlock className="h-4 w-12 ml-auto rounded" /></div>
      <div className="col-span-3"><SkeletonBlock className="h-4 w-16 ml-auto rounded" /></div>
    </div>
  )
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        <div className="mb-12">
          <SkeletonBlock className="h-12 w-48 mb-6 rounded" />
          <SkeletonBlock className="h-6 w-64 mb-4 rounded" />
          <div className="flex gap-6 mb-6">
            <SkeletonBlock className="h-4 w-16 rounded" />
            <SkeletonBlock className="h-4 w-20 rounded" />
            <SkeletonBlock className="h-4 w-16 rounded" />
          </div>
          <SkeletonBlock className="h-[2px] w-full mb-8 rounded" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-full rounded" />
            <SkeletonBlock className="h-4 w-3/4 rounded" />
            <SkeletonBlock className="h-4 w-1/2 rounded" />
          </div>
        </div>

        <div className="mb-12">
          <SkeletonBlock className="h-6 w-32 mb-6 rounded" />
          <div className="p-8 border border-border bg-surface">
            <SkeletonBlock className="h-6 w-3/4 mb-4 rounded" />
            <div className="flex gap-6 mb-6">
              <SkeletonBlock className="h-4 w-20 rounded" />
              <SkeletonBlock className="h-4 w-24 rounded" />
              <SkeletonBlock className="h-4 w-16 rounded" />
            </div>
            <SkeletonBlock className="h-16 w-full mb-4 rounded" />
            <SkeletonBlock className="h-12 w-24 ml-auto rounded" />
          </div>
        </div>

        <div className="mb-12">
          <SkeletonBlock className="h-6 w-32 mb-6 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        </div>

        <div className="mb-12">
          <SkeletonBlock className="h-6 w-32 mb-6 rounded" />
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low border-b border-border">
              <SkeletonBlock className="col-span-1 h-4 w-12 rounded" />
              <SkeletonBlock className="col-span-5 h-4 w-16 rounded" />
              <SkeletonBlock className="col-span-3 h-4 w-12 rounded" />
              <SkeletonBlock className="col-span-3 h-4 w-12 rounded" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLeaderboardRow key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function InsightsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        <SkeletonBlock className="h-10 w-48 mb-8 rounded" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 border border-border bg-surface">
            <SkeletonBlock className="h-5 w-32 mb-4 rounded" />
            <SkeletonBlock className="h-40 w-full rounded" />
          </div>
          
          <div className="p-6 border border-border bg-surface">
            <SkeletonBlock className="h-5 w-40 mb-4 rounded" />
            <div className="flex items-center justify-center h-40">
              <SkeletonBlock className="h-24 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-24 mx-auto mt-4 rounded" />
          </div>
        </div>

        <div className="p-6 border border-border bg-surface">
          <SkeletonBlock className="h-5 w-40 mb-4 rounded" />
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  )
}

export function DestinationPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        <SkeletonBlock className="h-10 w-64 mb-8 rounded" />
        
        <div className="p-6 border border-border bg-surface mb-8">
          <SkeletonBlock className="h-6 w-48 mb-4 rounded" />
          <SkeletonText lines={2} />
        </div>

        <SkeletonBlock className="h-6 w-24 mb-4 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-border bg-surface">
              <SkeletonBlock className="h-5 w-3/4 mb-2 rounded" />
              <SkeletonBlock className="h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        <SkeletonBlock className="h-10 w-32 mb-8 rounded" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 border border-border bg-surface">
            <SkeletonBlock className="h-5 w-32 mb-4 rounded" />
            <SkeletonText lines={4} />
          </div>
          
          <div className="p-6 border border-border bg-surface">
            <SkeletonBlock className="h-5 w-40 mb-4 rounded" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBlock className="h-5 w-5 rounded" />
                  <SkeletonBlock className="h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}