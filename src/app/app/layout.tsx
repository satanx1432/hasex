'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/app/navbar'
import CognitiveLockOverlay from '@/components/cognitive/cognitive-lock-overlay'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    // In production, this would come from authentication
    const mockUserId = 'user_123'
    setUserId(mockUserId)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="pb-16">
        {children}
      </main>
      {userId && <CognitiveLockOverlay userId={userId} />}
    </div>
  )
}