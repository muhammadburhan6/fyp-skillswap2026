import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ModalOverlay({ children, onClose, labelledBy }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="lm-overlay" onClick={onClose} role="presentation">
      <div
        className="lm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="lm-close" aria-label="Close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

function FormMsg({ msg }) {
  if (!msg) return null
  return <p className={`lm-msg ${msg.type === 'error' ? 'lm-msg-error' : 'lm-msg-success'}`}>{msg.text}</p>
}

function validate(fields) {
  for (const f of fields) {
    if (!f.value.trim()) return { type: 'error', text: `${f.label} is required.` }
    if (f.type === 'email' && !EMAIL_RE.test(f.value.trim())) {
      return { type: 'error', text: 'Please enter a valid email address.' }
    }
    if (f.type === 'password' && f.value.length < 6) {
      return { type: 'error', text: 'Password must be at least 6 characters.' }
    }
  }
  return null
}

function mapAuthError(err) {
  if (!err.response) {
    return import.meta.env.DEV
      ? 'Cannot reach the server. Run the backend and try again.'
      : 'Cannot reach the server. Please try again shortly.'
  }
  return err.response?.data?.error || err.message || 'Something went wrong'
}

export function LoginModal({ onClose, onSwitch }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate([
      { value: email, label: 'Email', type: 'email' },
      { value: password, label: 'Password', type: 'password' },
    ])
    if (err) {
      setMsg(err)
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const user = await login(email.trim(), password)
      setMsg({ type: 'success', text: 'Login successful! Redirecting...' })
      setTimeout(() => {
        if (user.role === 'admin') navigate('/admin')
        else navigate(user.onboarding_complete ? '/dashboard' : '/onboarding')
      }, 800)
    } catch (error) {
      setMsg({ type: 'error', text: mapAuthError(error) })
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} labelledBy="login-title">
      <CloseBtn onClick={onClose} />
      <h2 id="login-title" className="lm-title">Welcome back</h2>
      <p className="lm-subtitle">Log in to your Skillswap account</p>
      <form onSubmit={handleSubmit} className="lm-form" noValidate>
        <label className="lm-label">
          <span>Email</span>
          <input
            type="email"
            className="lm-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="lm-label">
          <span>Password</span>
          <input
            type="password"
            className="lm-input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <FormMsg msg={msg} />
        <button type="submit" className="lm-btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="lm-switch">
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onSwitch} className="lm-link">
          Sign up
        </button>
      </p>
    </ModalOverlay>
  )
}

export function SignupModal({ onClose, onSwitch }) {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate([
      { value: name, label: 'Name' },
      { value: email, label: 'Email', type: 'email' },
      { value: password, label: 'Password', type: 'password' },
      { value: confirm, label: 'Confirm password' },
    ])
    if (err) {
      setMsg(err)
      return
    }
    if (password !== confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password })
      setMsg({ type: 'success', text: 'Account created! Redirecting...' })
      setTimeout(() => {
        navigate(user.onboarding_complete ? '/dashboard' : '/onboarding')
      }, 800)
    } catch (error) {
      setMsg({ type: 'error', text: mapAuthError(error) })
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} labelledBy="signup-title">
      <CloseBtn onClick={onClose} />
      <h2 id="signup-title" className="lm-title">Create your account</h2>
      <p className="lm-subtitle">Join Skillswap and start exchanging skills</p>
      <form onSubmit={handleSubmit} className="lm-form" noValidate>
        <label className="lm-label">
          <span>Full Name</span>
          <input
            type="text"
            className="lm-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="lm-label">
          <span>Email</span>
          <input
            type="email"
            className="lm-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="lm-label">
          <span>Password</span>
          <input
            type="password"
            className="lm-input"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="lm-label">
          <span>Confirm Password</span>
          <input
            type="password"
            className="lm-input"
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <FormMsg msg={msg} />
        <button type="submit" className="lm-btn-primary" disabled={loading}>
          {loading ? 'Creating account...' : 'Get Started'}
        </button>
      </form>
      <p className="lm-switch">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="lm-link">
          Log in
        </button>
      </p>
    </ModalOverlay>
  )
}

export function AdminLoginModal({ onClose, onSwitch }) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate([
      { value: email, label: 'Email', type: 'email' },
      { value: password, label: 'Password', type: 'password' },
    ])
    if (err) {
      setMsg(err)
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const user = await login(email.trim(), password)
      if (user.role !== 'admin') {
        logout()
        setMsg({ type: 'error', text: 'Access denied. Admin credentials required.' })
        setLoading(false)
        return
      }
      setMsg({ type: 'success', text: 'Admin login successful!' })
      setTimeout(() => navigate('/admin'), 800)
    } catch (error) {
      setMsg({ type: 'error', text: mapAuthError(error) })
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} labelledBy="admin-title">
      <CloseBtn onClick={onClose} />
      <div className="lm-admin-icon" aria-hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h2 id="admin-title" className="lm-title">Admin Login</h2>
      <p className="lm-subtitle">Authorized personnel only</p>
      <form onSubmit={handleSubmit} className="lm-form" noValidate>
        <label className="lm-label">
          <span>Email</span>
          <input
            type="email"
            className="lm-input"
            placeholder="admin@skillswap.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="lm-label">
          <span>Password</span>
          <input
            type="password"
            className="lm-input"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <FormMsg msg={msg} />
        <button type="submit" className="lm-btn-primary lm-btn-admin" disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In as Admin'}
        </button>
      </form>
      {onSwitch && (
        <p className="lm-switch">
          <button type="button" onClick={onSwitch} className="lm-link">
            ← Back to user login
          </button>
        </p>
      )}
    </ModalOverlay>
  )
}

export function InfoModal({ title, children, onClose }) {
  return (
    <ModalOverlay onClose={onClose} labelledBy="info-title">
      <CloseBtn onClick={onClose} />
      <h2 id="info-title" className="lm-title">{title}</h2>
      <div className="lm-info-body">{children}</div>
      <button type="button" className="lm-btn-primary" onClick={onClose}>
        Got it
      </button>
    </ModalOverlay>
  )
}

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const t = setTimeout(onDismiss, 2800)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null
  return (
    <div className="lm-toast" role="status">
      {message}
      <button type="button" onClick={onDismiss} className="lm-toast-close" aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
