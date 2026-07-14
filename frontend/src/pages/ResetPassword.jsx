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
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <SkillSwapLogo size="sm" />
            <span className="font-display text-lg font-bold text-white">SkillSwap</span>
          </Link>
        </div>

        <div className="card p-8">
          <h1 className="font-display text-xl font-bold text-white">Reset password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a new password for your account.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                New password
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-300">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
            {message && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {message}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            <Link to="/auth" className="font-semibold text-sky-400 hover:text-sky-300">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
