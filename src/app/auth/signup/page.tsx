'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { exportGuestData, clearAllGuestData } from '@/lib/data/guest-data'
import { migrateGuestData } from '@/lib/data/migration'

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signUpWithGoogle, loading, isGuest } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasGuestData, setHasGuestData] = useState(false)
  const [willMigrate, setWillMigrate] = useState(true)
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle')
  const [migrationError, setMigrationError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false })
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' })

  useEffect(() => {
    const checkGuestData = async () => {
      if (isGuest) {
        const guestData = await exportGuestData()
        const hasData = guestData.goals.length > 0 || guestData.tasks.length > 0
        setHasGuestData(hasData)
      }
    }
    checkGuestData()
  }, [isGuest])

  const validateName = (name: string) => {
    if (!name.trim()) return 'Name is required'
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    return ''
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return 'Email is required'
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    return ''
  }

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required'
    if (password.length < 6) return 'Password must be at least 6 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    return ''
  }

  const validateConfirmPassword = (confirm: string) => {
    if (!confirm) return 'Please confirm your password'
    if (confirm !== password) return 'Passwords do not match'
    return ''
  }

  const handleChange = (field: string, value: string) => {
    if (field === 'name') {
      setName(value)
      if (touched.name) setFieldErrors({ ...fieldErrors, name: validateName(value) })
    }
    if (field === 'email') {
      setEmail(value)
      if (touched.email) setFieldErrors({ ...fieldErrors, email: validateEmail(value) })
    }
    if (field === 'password') {
      setPassword(value)
      if (touched.password) setFieldErrors({ ...fieldErrors, password: validatePassword(value) })
      if (touched.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: validateConfirmPassword(confirmPassword) })
    }
    if (field === 'confirmPassword') {
      setConfirmPassword(value)
      if (touched.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: validateConfirmPassword(value) })
    }
  }

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true })
    if (field === 'name') setFieldErrors({ ...fieldErrors, name: validateName(name) })
    if (field === 'email') setFieldErrors({ ...fieldErrors, email: validateEmail(email) })
    if (field === 'password') setFieldErrors({ ...fieldErrors, password: validatePassword(password) })
    if (field === 'confirmPassword') setFieldErrors({ ...fieldErrors, confirmPassword: validateConfirmPassword(confirmPassword) })
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword)
    }
    setFieldErrors(errors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })

    if (Object.values(errors).some(err => err)) return

    setIsLoading(true)

    try {
      await signUp(email, password, name)
      
      const supabase = (await import('@/lib/supabase/client')).createClient()
      let attempts = 0
      let user = null
      
      while (attempts < 10 && !user) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user
        attempts++
      }
      
      if (hasGuestData && willMigrate && user?.id) {
        setMigrationStatus('migrating')
        try {
          const guestData = await exportGuestData()
          await migrateGuestData(user.id, guestData)
          await clearAllGuestData()
          setMigrationStatus('success')
        } catch (migrationErr: any) {
          console.error('Migration failed:', migrationErr)
          setMigrationStatus('error')
          setMigrationError(migrationErr.message || 'Failed to migrate guest data')
          setIsLoading(false)
          return
        }
      }
      
      if (hasGuestData && willMigrate) {
        router.push('/app/home')
      } else {
        router.push('/onboarding')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setIsLoading(true)

    try {
      if (hasGuestData) {
        localStorage.setItem('shouldMigrateGuestData', willMigrate ? 'true' : 'false')
      }
      
      await signUpWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  const handleRetryMigration = async () => {
    if (!hasGuestData || !willMigrate) return
    
    setMigrationStatus('migrating')
    setMigrationError('')
    setRetryCount(prev => prev + 1)

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const guestData = await exportGuestData()
        await migrateGuestData(session.user.id, guestData)
        await clearAllGuestData()
        setMigrationStatus('success')
        router.push('/app/home')
      }
    } catch (err: any) {
      setMigrationStatus('error')
      setMigrationError(err.message || 'Failed to migrate guest data')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Create Account</h1>
          <p className="text-on-surface-variant">Start your behavioral transformation journey</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          {error && (
            <div className="bg-error-container border border-error p-4 rounded-lg">
              <p className="text-on-error text-sm">{error}</p>
            </div>
          )}

          {migrationStatus === 'error' && (
            <div className="bg-error-container border border-error p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-error">error</span>
                <div className="flex-1">
                  <p className="text-on-error text-sm font-medium mb-1">Migration failed</p>
                  <p className="text-on-error text-xs">{migrationError}</p>
                  <button
                    onClick={handleRetryMigration}
                    className="mt-2 text-xs text-on-error underline hover:no-underline"
                  >
                    Retry migration
                  </button>
                </div>
              </div>
            </div>
          )}

          {migrationStatus === 'migrating' && (
            <div className="bg-surface-container-low border border-border p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-on-surface-variant">Migrating your guest data...</p>
              </div>
            </div>
          )}

          {migrationStatus === 'success' && (
            <div className="bg-primary-container border border-primary p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-primary text-sm">Guest data migrated successfully!</p>
              </div>
            </div>
          )}

          {hasGuestData && migrationStatus === 'idle' && (
            <div className="bg-surface-container-low border border-border p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="migrateData"
                  checked={willMigrate}
                  onChange={(e) => setWillMigrate(e.target.checked)}
                  className="mt-1 w-4 h-4 border-border rounded focus:ring-primary"
                />
                <div>
                  <label htmlFor="migrateData" className="text-sm font-medium text-primary cursor-pointer">
                    Import your guest data
                  </label>
                  <p className="text-xs text-on-surface-variant mt-1">
                    We found your guest data. Would you like to import it to your new account?
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-surface border border-border hover:border-primary px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-primary font-medium">Continue with Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-on-surface-variant">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-on-surface mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                required
                className={`w-full bg-surface-container border ${
                  fieldErrors.name && touched.name ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                } px-4 py-3 rounded-xl focus:outline-none text-primary placeholder:text-on-surface-variant`}
                placeholder="Your name"
              />
              {fieldErrors.name && touched.name && (
                <p className="text-error text-xs mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                required
                className={`w-full bg-surface-container border ${
                  fieldErrors.email && touched.email ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                } px-4 py-3 rounded-xl focus:outline-none text-primary placeholder:text-on-surface-variant`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && touched.email && (
                <p className="text-error text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  required
                  className={`w-full bg-surface-container border ${
                    fieldErrors.password && touched.password ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                  } px-4 py-3 rounded-xl focus:outline-none text-primary placeholder:text-on-surface-variant pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.password && touched.password && (
                <p className="text-error text-xs mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-on-surface mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                  className={`w-full bg-surface-container border ${
                    fieldErrors.confirmPassword && touched.confirmPassword ? 'border-error focus:border-error' : 'border-border focus:border-primary'
                  } px-4 py-3 rounded-xl focus:outline-none text-primary placeholder:text-on-surface-variant pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {fieldErrors.confirmPassword && touched.confirmPassword && (
                <p className="text-error text-xs mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center text-sm">
            <p className="text-on-surface-variant">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}