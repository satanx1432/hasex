import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let googleProvider: GoogleAuthProvider | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app && typeof window !== 'undefined') {
    app = getApps().length === 0 
      ? initializeApp(firebaseConfig) 
      : getApps()[0]
  }
  return app!
}

export function getFirebaseAuth(): Auth {
  if (!auth && typeof window !== 'undefined') {
    auth = getAuth(getFirebaseApp())
  }
  return auth!
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider()
    googleProvider.addScope('email')
    googleProvider.addScope('profile')
  }
  return googleProvider!
}

export async function signInWithFirebaseGoogle(): Promise<User | null> {
  try {
    const auth = getFirebaseAuth()
    const provider = getGoogleProvider()
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Firebase Google sign in error:', error)
    throw error
  }
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    const auth = getFirebaseAuth()
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Firebase sign out error:', error)
    throw error
  }
}

export function onFirebaseAuthChange(callback: (user: User | null) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  
  const auth = getFirebaseAuth()
  const unsubscribe = auth.onIdTokenChanged(callback)
  return unsubscribe
}

export function getFirebaseUser(): User | null {
  if (typeof window === 'undefined') return null
  const auth = getFirebaseAuth()
  return auth.currentUser
}

export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  )
}