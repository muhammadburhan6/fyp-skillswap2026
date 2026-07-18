import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import SectionDivider from '../ui/SectionDivider'

const footerLinks = {
  Product: ['Home', 'How it works', 'Features', 'Success stories', 'Community', 'Pricing', 'Team'],
  Resources: ['About us', 'Careers', 'Blog', 'Changelog', 'FAQ', 'Contact', 'Press'],
  Legal: ['Privacy policy', 'Terms of use', 'Cookies'],
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function LandingFooter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const subscribe = async () => {
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setStatus({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const data = await api.subscribeNewsletter(value)
      setStatus({ type: 'success', text: data.message || 'Thanks for subscribing!' })
      setEmail('')
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.error || 'Could not subscribe. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="relative bg-backgroundDeep py-16 sm:py-20">
      <SectionDivider />
      <div className="section-wrap pt-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-2xl font-semibold tracking-tight">Skill/Swap</p>
            <p className="mt-3 text-mutedForeground">A platform for learning and teaching to help people grow.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                className="input-field flex-1 text-sm"
                placeholder="Email for newsletter"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && subscribe()}
                disabled={loading}
              />
              <button
                type="button"
                onClick={subscribe}
                disabled={loading}
                className="btn-primary shrink-0 px-4 py-3 text-sm disabled:opacity-60"
              >
                {loading ? '…' : 'Subscribe'}
              </button>
            </div>
            {status && (
              <p className={`mt-2 text-xs ${status.type === 'success' ? 'text-accent' : 'text-mutedForeground'}`}>
                {status.text}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-mutedForeground">{title}</h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <Link
                        to={link === 'Features' ? '/explore' : link === 'Home' ? '/' : '#'}
                        className="text-sm text-mutedForeground transition hover:text-foreground"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 font-mono text-xs uppercase tracking-widest text-mutedForeground">© 2026 Skill/Swap Ltd.</p>
      </div>
    </footer>
  )
}
