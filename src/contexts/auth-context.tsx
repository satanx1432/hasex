'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { createClient } from '@/lib/supabase/client'
import { 
  signInWithFirebaseGoogle, 
  signOutFromFirebase, 
  onFirebaseAuthChange,
  isFirebaseConfigured 
} from '@/lib/firebase'

interface AuthContextType {
  user: any
  firebaseUser: FirebaseUser | null
  loading: boolean
  isGuest: boolean
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signUpWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  upgradeToAccount: () => void
  enterGuestMode: () => void
  isDemoMode: boolean
  authProvider: 'supabase' | 'firebase'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [authProvider, setAuthProvider] = useState<'supabase' | 'firebase'>('supabase')
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const guestMode = localStorage.getItem('guestMode')
    setIsGuest(guestMode === 'true')

    if (!supabase) {
      setIsDemoMode(true)
      setLoading(false)
      return
    }

    if (isFirebaseConfigured()) {
      setAuthProvider('firebase')
      const unsubscribe = onFirebaseAuthChange(async (fbUser) => {
        setFirebaseUser(fbUser)
        
        if (fbUser) {
          const { data: supabaseUser, error } = await supabase.auth.getSession()
          if (error || !supabaseUser.session) {
            const { data: authData } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: await fbUser.getIdToken(),
            })
            setUser(authData?.user || null)
          } else {
            setUser(supabaseUser.session?.user || null)
          }
        } else {
          setUser(null)
        }
        setLoading(false)
      })
      return () => unsubscribe()
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

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
      throw new Error('Authentication not configured. Please add Supabase credentials.')
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data.user
  }

  const signInWithGoogle = async () => {
    if (authProvider === 'firebase' && isFirebaseConfigured()) {
      try {
        const fbUser = await signInWithFirebaseGoogle()
        if (fbUser) {
          const { data: authData, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: await fbUser.getIdToken(),
          })
          if (error) {
            console.error('Supabase token sign in error:', error)
          }
        }
      } catch (err) {
        console.error('Firebase Google sign in error:', err)
        throw err
      }
    } else {
      if (!supabase) {
        throw new Error('Authentication not configured.')
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
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
  }

  const signUpWithGoogle = async () => {
    await signInWithGoogle()
  }

  const signOut = async () => {
    setUser(null)
    setFirebaseUser(null)
    setIsGuest(false)
    localStorage.removeItem('guestMode')
    document.cookie = 'guestMode=; path=/; max-age=0'
    
    if (authProvider === 'firebase' && firebaseUser) {
      try {
        await signOutFromFirebase()
      } catch (err) {
        console.error('Firebase sign out error:', err)
      }
    }
    
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      } catch (err) {
        console.error('Supabase signOut error:', err)
      }
    }
    
    window.location.href = '/auth/login'
  }

  const upgradeToAccount = () => {
    setIsGuest(false)
    localStorage.removeItem('guestMode')
    document.cookie = 'guestMode=; path=/; max-age=0'
    window.location.href = '/auth/signup'
  }

  const enterGuestMode = () => {
    localStorage.setItem('guestMode', 'true')
    document.cookie = 'guestMode=true; path=/; max-age=31536000'
    setIsGuest(true)
    setLoading(false)
    window.location.href = '/app/home'
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser,
      loading, 
      isGuest, 
      signIn, 
      signInWithGoogle, 
      signUp, 
      signUpWithGoogle, 
      signOut, 
      upgradeToAccount, 
      enterGuestMode, 
      isDemoMode,
      authProvider 
    }}>
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