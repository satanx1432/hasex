'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getActiveGoal } from '@/lib/data/goals'
import { exportGuestData, clearAllGuestData } from '@/lib/data/guest-data'
import { migrateGuestData } from '@/lib/data/migration'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setErrorMessage('Authentication failed. Please try again.')
          return
        }

        if (data.session) {
          const userId = data.session.user.id
          
          const shouldMigrate = localStorage.getItem('shouldMigrateGuestData') === 'true'
          const hasGuestData = localStorage.getItem('guestMode') === 'true'
          
          if (shouldMigrate && hasGuestData) {
            try {
              setStatus('loading')
              const guestData = await exportGuestData()
              await migrateGuestData(userId, guestData)
              await clearAllGuestData()
              localStorage.removeItem('shouldMigrateGuestData')
              localStorage.removeItem('guestMode')
              console.log('Guest data migrated successfully after Google signup')
            } catch (migrationError: any) {
              console.error('Migration failed after Google signup:', migrationError)
              setStatus('error')
              setErrorMessage(migrationError.message || 'Failed to migrate your guest data. Your data is preserved and you can retry.')
              return
            }
          }
          
          const activeGoal = await getActiveGoal(userId)
          
          if (activeGoal) {
            router.push('/app/home')
          } else {
            router.push('/onboarding')
          }
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setErrorMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleCallback()
  }, [router, supabase, retryCount])

  const handleRetry = () => {
    setStatus('loading')
    setErrorMessage('')
    setRetryCount(prev => prev + 1)
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-error-container border border-error rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-error text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-4">Migration Failed</h1>
          <p className="text-on-surface-variant mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:brightness-110 transition-all"
            >
              Retry Migration
            </button>
            <button
              onClick={() => router.push('/app/home')}
              className="w-full bg-surface border border-border text-primary font-semibold py-3 rounded-xl hover:border-primary transition-all"
            >
              Continue Without Migrating
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant">Completing sign in...</p>
      </div>
    </div>
  )
}