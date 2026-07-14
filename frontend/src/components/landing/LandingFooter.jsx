import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const footerLinks = {
  Product: ['Home', 'How it works', 'Features', 'Success stories', 'Community', 'Pricing', 'Team'],
  Resources: ['About us', 'Careers', 'Blog', 'Changelog', 'FAQ', 'Contact', 'Press'],
  Legal: ['Privacy policy', 'Terms of use', 'Cookies'],
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function LandingFooter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', text }
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
    <footer className="border-t border-white/10 bg-[#080b12] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-display text-lg font-bold text-white">SkillSwap</p>
            <p className="mt-3 text-sm text-slate-400">A platform for learning and teaching to help people grow.</p>
            <div className="mt-6 flex gap-2">
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
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? '…' : 'Subscribe'}
              </button>
            </div>
            {status && (
              <p className={`mt-2 text-xs ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.text}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <Link to={link === 'Features' ? '/explore' : link === 'Home' ? '/' : '#'} className="text-sm text-slate-400 hover:text-sky-300">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 text-sm text-slate-500">© 2026 SkillSwap Ltd.</p>
      </div>
    </footer>
  )
}
