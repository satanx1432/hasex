'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Trophy, BarChart3, User, Flag, LogOut, Sparkles } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isGuest, signOut, upgradeToAccount } = useAuth()

  const navItems = [
    { name: 'Home', path: '/app/home', icon: Trophy },
    { name: 'Insights', path: '/app/insights', icon: BarChart3 },
    { name: 'Profile', path: '/app/profile', icon: User },
    { name: 'Destination', path: '/app/destination', icon: Flag }
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  const handleUpgrade = () => {
    upgradeToAccount()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-border z-50">
      <div className="w-full px-2 sm:px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] sm:text-xs font-label-mono tracking-wide">{item.name}</span>
              </button>
            )
          })}
          {(user || isGuest) && (
            <>
              {isGuest && (
                <button
                  onClick={handleUpgrade}
                  className="flex flex-col items-center justify-center space-y-1 px-3 py-2 cursor-pointer text-white hover:text-gray-300"
                  title="Upgrade to account"
                >
                  <Sparkles size={20} strokeWidth={1.5} />
                  <span className="text-[10px] sm:text-xs font-label-mono tracking-wide">Upgrade</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="flex flex-col items-center justify-center space-y-1 px-3 py-2 cursor-pointer text-gray-400 hover:text-white"
                title="Sign out"
              >
                <LogOut size={20} strokeWidth={1.5} />
                <span className="text-[10px] sm:text-xs font-label-mono tracking-wide">Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}