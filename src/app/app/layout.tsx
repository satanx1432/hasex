'use client'

import Navbar from '@/components/app/navbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="pb-16">
        {children}
      </main>
    </div>
  )
}