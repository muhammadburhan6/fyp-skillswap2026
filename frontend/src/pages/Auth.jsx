import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, register } = useAuthStore()

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
      setForgotMessage(data.message || 'If that email is registered, a reset link has been sent.')
      if (data.reset_link) setForgotLink(data.reset_link)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not send reset link.')
    } finally {
      setLoading(false)
    }
  }

  const finish = (user) => {
    if (user.role === 'admin') return navigate('/admin')
    return navigate(user.onboarding_complete ? '/dashboard' : '/onboarding')
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
      const status = err.response?.status
      if (!err.response) setError('Cannot reach the server. Run: npm run dev')
      else if (status === 502 || status === 503) setError('Server is not running. Run: npm run dev')
      else setError(err.response?.data?.error || err.message || 'Something went wrong')
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
            <span className="text-2xl font-semibold tracking-tight">Skill/Swap</span>
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
              ? 'Enter your email and we will send a reset link.'
              : isAdminMode
                ? 'Sign in with your admin credentials to open the control panel.'
                : isSignup
                  ? 'Enter your details to get started.'
                  : 'Log in to continue to Skill/Swap.'}
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
                  Dev reset link: <a href={forgotLink} className="text-accent underline">{forgotLink}</a>
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Please wait…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} className="btn-ghost w-full text-sm">
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
                  <button type="button" onClick={() => setForgotMode(true)} className="btn-ghost mt-2 text-xs">
                    Forgot password?
                  </button>
                )}
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Please wait…' : isAdminMode ? 'Admin log in →' : isSignup ? 'Create account →' : 'Log in →'}
              </button>
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
