import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, register } = useAuthStore()

  const isSignup = params.get('mode') === 'signup'
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

  const finish = (user) => navigate(user.onboarding_complete ? '/dashboard' : '/onboarding')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = isSignup
        ? await register({
            email,
            password,
            display_name: name || 'New User',
            name: name || 'New User',
          })
        : await login(email, password)
      finish(user)
    } catch (err) {
      const status = err.response?.status
      if (!err.response) {
        setError('Cannot reach the server. Run: npm run dev')
      } else if (status === 502 || status === 503) {
        setError('Server is not running. Run: npm run dev')
      } else {
        setError(err.response?.data?.error || err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <SkillSwapLogo size="sm" />
            <span className="font-display text-lg font-bold text-white">SkillSwap</span>
          </Link>
        </div>

        <div className="card p-8">
          <div className="mb-6 flex rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode(false)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                !isSignup ? 'bg-sky-400 text-[#0a0e17]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode(true)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                isSignup ? 'bg-sky-400 text-[#0a0e17]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign up
            </button>
          </div>

          <h1 className="font-display text-xl font-bold text-white">
            {forgotMode ? 'Forgot password' : isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {forgotMode
              ? 'Enter your email and we will send a reset link.'
              : isSignup
                ? 'Enter your details to get started.'
                : 'Log in to continue to SkillSwap.'}
          </p>

          {forgotMode ? (
            <form onSubmit={handleForgot} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                <input id="email" className="input-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              {forgotMessage && (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{forgotMessage}</p>
              )}
              {forgotLink && (
                <p className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 break-all">
                  Dev reset link: <a href={forgotLink} className="underline">{forgotLink}</a>
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? 'Please wait…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-slate-400 hover:text-white">
                ← Back to login
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
                <input id="name" className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
              <input id="email" className="input-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <input id="password" className="input-field" type="password" placeholder={isSignup ? 'Create a password' : 'Your password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignup ? 6 : undefined} autoComplete={isSignup ? 'new-password' : 'current-password'} />
              {!isSignup && (
                <button type="button" onClick={() => setForgotMode(true)} className="mt-2 text-xs font-medium text-sky-400 hover:text-sky-300">
                  Forgot password?
                </button>
              )}
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>
          )}

          {!forgotMode && (
          <p className="mt-6 text-center text-sm text-slate-400">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setMode(!isSignup)} className="font-semibold text-sky-400 hover:text-sky-300">
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
          )}
        </div>

        <Link to="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-300">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
