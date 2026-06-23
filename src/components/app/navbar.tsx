'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', path: '/app/home', icon: 'home' },
    { name: 'Actions', path: '/app/actions', icon: 'checklist' },
    { name: 'AI', path: '/app/chat', icon: 'chat' },
    { name: 'Insights', path: '/app/insights', icon: 'insights' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="w-full px-2 sm:px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 cursor-pointer ${
                pathname === item.path
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-xl sm:text-2xl">{item.icon}</span>
              <span className="text-[10px] sm:text-xs font-label-mono tracking-wide">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}