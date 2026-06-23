'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  isGuest: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  upgradeToAccount: () => void
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check guest mode from localStorage
    const guestMode = localStorage.getItem('guestMode')
    setIsGuest(guestMode === 'true')

    // Check if we're in demo mode (no Supabase configured)
    if (!supabase) {
      setIsDemoMode(true)
      setLoading(false)
      return
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      // Demo mode - simulate login
      throw new Error('Authentication not configured. Please add Supabase credentials.')
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      // Demo mode - simulate signup
      throw new Error('Authentication not configured. Please add Supabase credentials.')
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    if (error) throw error
    
    // Profile is automatically created by database trigger
  }

  const signOut = async () => {
    // Clear user state
    setUser(null)
    setIsGuest(false)
    localStorage.removeItem('guestMode')
    
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      } catch (err) {
        console.error('Supabase signOut error:', err)
      }
    }
  }

  const upgradeToAccount = () => {
    // Clear guest mode and redirect to signup
    setIsGuest(false)
    localStorage.removeItem('guestMode')
    window.location.href = '/auth/signup'
  }

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, signIn, signUp, signOut, upgradeToAccount, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
