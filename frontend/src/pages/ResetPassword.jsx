import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import api from '../lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Missing reset token. Use the link from your email.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const data = await api.resetPassword(token, password)
      setMessage(data.message || 'Password updated.')
      setTimeout(() => navigate('/auth'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <SkillSwapLogo size="sm" />
            <span className="text-2xl font-semibold tracking-tight">Skillswap</span>
          </Link>
        </div>

        <div className="card p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-2 text-mutedForeground">Choose a new password for your account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-medium text-mutedForeground">New password</label>
              <input id="password" type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-2 block text-xs font-medium text-mutedForeground">Confirm password</label>
              <input id="confirm" type="password" className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
            {message && <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? 'Updating…' : 'Update password →'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-mutedForeground">
            <Link to="/auth" className="font-medium text-accent hover:text-accentBright">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
