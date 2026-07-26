import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
}

let app
let auth

function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error('Google sign-in is not configured. Add VITE_FIREBASE_* env vars.')
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  }
  return auth
}

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

/** Sign in with Google popup and return the Firebase ID token. */
export async function signInWithGoogle() {
  const firebaseAuth = getFirebaseAuth()
  const result = await signInWithPopup(firebaseAuth, googleProvider())
  return result.user.getIdToken()
}

/**
 * Full-page redirect sign-in — used as a fallback when the popup is blocked or
 * silently closed by the browser (modern Chrome COOP / third-party-cookie
 * policies frequently break signInWithPopup). Navigates away; the result is
 * picked up by completeGoogleRedirect() when the app reloads.
 */
export async function signInWithGoogleRedirect() {
  const firebaseAuth = getFirebaseAuth()
  await signInWithRedirect(firebaseAuth, googleProvider())
}

/** On app load, finish a pending redirect sign-in. Returns the ID token or null. */
export async function completeGoogleRedirect() {
  if (!isFirebaseConfigured()) return null
  const firebaseAuth = getFirebaseAuth()
  const result = await getRedirectResult(firebaseAuth)
  if (!result || !result.user) return null
  return result.user.getIdToken()
}
