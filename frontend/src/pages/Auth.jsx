import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'
import { isFirebaseConfigured, signInWithGoogle } from '../lib/firebase'

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, register, loginWithGoogle } = useAuthStore()

  const isAdminMode = params.get('mode') === 'admin'
  const isSignup = params.get('mode') === 'signup' && !isAdminMode
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotLink, setForgotLink] = useState('')

  const setMode = (signup) => {
    setError('')
    setForgotMode(false)
    setForgotMessage('')
    setForgotLink('')
    setParams(signup ? { mode: 'signup' } : {})
  }

  const openForgot = () => {
    setError('')
    setForgotMessage('')
    setForgotLink('')
    setPassword('')
    setForgotMode(true)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setError('')
    setForgotMessage('')
    setForgotLink('')
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }
    setLoading(true)
    try {
      const data = await api.forgotPassword(email.trim())
      setForgotMessage(data.message || 'If that email is registered, a reset link has been sent to your inbox.')
      if (data.reset_link) setForgotLink(data.reset_link)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not send reset link.')
    } finally {
      setLoading(false)
    }
  }

  const finish = (user) => {
    if (user.role === 'admin') return navigate('/admin')
    const next = params.get('next')
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
    if (!user.onboarding_complete) {
      if (safeNext) sessionStorage.setItem('skillswap_next', safeNext)
      return navigate('/onboarding')
    }
    if (safeNext) return navigate(safeNext)
    return navigate('/dashboard')
  }

  const mapAuthError = (err) => {
    const status = err.response?.status
    const code = err.code || ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google sign-in was cancelled.'
    }
    if (code === 'auth/popup-blocked') {
      return 'Popup was blocked. Allow popups for this site and try again.'
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not allowed in Firebase. Add it under Authentication → Settings → Authorized domains.'
    }
    if (!err.response && !code) {
      return import.meta.env.DEV
        ? 'Cannot reach the server. Run the backend (npm run dev from project root).'
        : 'Cannot reach the server. Wait 30s (backend waking up) and try again.'
    }
    if (status === 502 || status === 503) {
      return import.meta.env.DEV
        ? 'Server is not running. Run: npm run dev'
        : err.response?.data?.error || 'Server is waking up. Wait 30 seconds and try again.'
    }
    return err.response?.data?.error || err.message || 'Something went wrong'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isAdminMode || !isSignup) {
        const user = await login(email, password)
        if (isAdminMode && user.role !== 'admin') {
          const { logout } = useAuthStore.getState()
          logout()
          setError('This account is not an admin. Use a regular login instead.')
          return
        }
        finish(user)
      } else {
        const user = await register({ email, password, display_name: name || 'New User', name: name || 'New User' })
        finish(user)
      }
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    if (!isFirebaseConfigured()) {
      setError('Google sign-in is not configured yet. Add VITE_FIREBASE_* env vars and redeploy.')
      return
    }
    setLoading(true)
    try {
      const idToken = await signInWithGoogle()
      const user = await loginWithGoogle(idToken)
      finish(user)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <SkillSwapLogo size="sm" />
            <span className="text-2xl font-semibold tracking-tight">Skillswap</span>
          </Link>
        </div>

        <div className="card p-8">
          {!isAdminMode && (
            <div className="mb-8 flex overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setMode(false)}
                className={`flex-1 py-3 text-sm font-medium transition duration-200 ${
                  !isSignup ? 'bg-accent text-white shadow-accent-glow' : 'text-mutedForeground hover:text-foreground'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode(true)}
                className={`flex-1 py-3 text-sm font-medium transition duration-200 ${
                  isSignup ? 'bg-accent text-white shadow-accent-glow' : 'text-mutedForeground hover:text-foreground'
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          <h1 className="text-3xl font-semibold tracking-tight">
            {forgotMode ? 'Forgot password' : isAdminMode ? 'Admin login' : isSignup ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-mutedForeground">
            {forgotMode
              ? 'Enter your email and we will send a reset link to your inbox.'
              : isAdminMode
                ? 'Sign in with your admin credentials to open the control panel.'
                : isSignup
                  ? 'Enter your details to get started.'
                  : 'Log in to continue to Skillswap.'}
          </p>
          {isAdminMode && (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-xs text-accent-soft">
              Demo: admin@skillswap.io / admin123
            </p>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgot} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-medium text-mutedForeground">Email</label>
                <input id="email" className="input-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              {forgotMessage && <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">{forgotMessage}</p>}
              {forgotLink && (
                <p className="break-all rounded-lg border border-white/10 px-3 py-2 font-mono text-xs">
                  Reset link (email delivery failed — click to continue):{' '}
                  <a href={forgotLink} className="text-accent underline">{forgotLink}</a>
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Please wait…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setForgotMessage('')
                  setForgotLink('')
                  setError('')
                }}
                className="btn-ghost w-full text-sm"
              >
                ← Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {isSignup && (
                <div>
                  <label htmlFor="name" className="mb-2 block text-xs font-medium text-mutedForeground">Name</label>
                  <input id="name" className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-medium text-mutedForeground">Email</label>
                <input id="email" className="input-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-medium text-mutedForeground">Password</label>
                <input id="password" className="input-field" type="password" placeholder={isSignup ? 'Create a password' : 'Your password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignup ? 6 : undefined} autoComplete={isSignup ? 'new-password' : 'current-password'} />
                {!isSignup && (
                  <button type="button" onClick={openForgot} className="btn-ghost mt-2 text-xs">
                    Forgot password?
                  </button>
                )}
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Please wait…' : isAdminMode ? 'Admin log in →' : isSignup ? 'Create account →' : 'Log in →'}
              </button>
              {!isAdminMode && (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-mutedForeground">or</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-60"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
            </form>
          )}

          {!forgotMode && !isAdminMode && (
            <p className="mt-8 text-center text-sm text-mutedForeground">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={() => setMode(!isSignup)} className="font-medium text-accent hover:text-accentBright">
                {isSignup ? 'Log in' : 'Sign up'}
              </button>
            </p>
          )}
          {!forgotMode && isAdminMode && (
            <p className="mt-8 text-center text-sm text-mutedForeground">
              Not an admin?{' '}
              <button type="button" onClick={() => setMode(false)} className="font-medium text-accent hover:text-accentBright">
                User login
              </button>
            </p>
          )}
        </div>

        <Link to="/" className="btn-ghost mt-8 block text-center text-sm">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
