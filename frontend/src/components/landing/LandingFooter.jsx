import { useState } from 'react'
import SkillSwapLogo from './SkillSwapLogo'
import { InfoModal } from './LandingModals'
import SectionDivider from '../ui/SectionDivider'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const productLinks = [
  { label: 'Home', action: 'scroll', target: 'top' },
  { label: 'How it works', action: 'scroll', target: 'how-it-works' },
  { label: 'Features', action: 'scroll', target: 'how-it-works' },
  { label: 'Success stories', action: 'scroll', target: 'testimonials' },
  { label: 'Community', action: 'scroll', target: 'categories' },
  { label: 'Pricing', action: 'alert', message: 'Pricing: Skillswap is free — no money needed. Coming soon: optional Pro tools.' },
  { label: 'Team', action: 'alert', message: 'Team: Meet the builders behind Skillswap — page coming soon!' },
]

const resourceContent = {
  'About us': {
    title: 'About us',
    body: 'Skillswap is a peer-to-peer learning platform where people teach what they know and learn what they need — powered by points, not payments.',
  },
  Careers: {
    title: 'Careers',
    body: "We're always looking for curious builders. Email careers@skillswap.com with your story — openings will appear here soon.",
  },
  Blog: {
    title: 'Blog',
    body: 'Stories, skill-swap tips, and product updates. Our blog launches soon — subscribe to the newsletter to hear first.',
  },
  Changelog: {
    title: 'Changelog',
    body: 'v1.0 — Matching, points wallet, sessions, and messenger. More polish shipping weekly.',
  },
  FAQ: {
    title: 'FAQ',
    body: 'How do points work? Teach to earn, learn to spend. Is it free? Yes. Can I cancel a session? Yes, from your dashboard calendar.',
  },
  Contact: {
    title: 'Contact',
    body: 'Questions or feedback? Reach us at hello@skillswap.com — we usually reply within one business day.',
  },
  Press: {
    title: 'Press',
    body: 'Media kit and press inquiries: press@skillswap.com. Brand assets and fact sheet coming soon.',
  },
}

const legalContent = {
  'Privacy policy': {
    title: 'Privacy policy',
    body: 'We collect account details you provide (name, email) and usage data needed to run matching and sessions. We do not sell personal data. You can request deletion of your account at any time from Settings.',
  },
  'Terms of use': {
    title: 'Terms of use',
    body: 'By using Skillswap you agree to treat others respectfully, keep session commitments when possible, and not use the platform for harassment or spam. Points have no cash value and cannot be transferred outside Skillswap.',
  },
  Cookies: {
    title: 'Cookies',
    body: 'We use essential cookies for authentication and session security. Analytics cookies help us improve the product; you can clear cookies anytime in your browser settings.',
  },
}

export default function LandingFooter({ onToast }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [info, setInfo] = useState(null)

  const scrollTo = (id) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleProduct = (link) => {
    if (link.action === 'scroll') scrollTo(link.target)
    else if (onToast) onToast(link.message)
    else window.alert(link.message)
  }

  const subscribe = () => {
    const value = email.trim()
    if (!value) {
      setStatus({ type: 'error', text: 'Email is required.' })
      return
    }
    if (!EMAIL_RE.test(value)) {
      setStatus({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }
    if (subscribers.includes(value.toLowerCase())) {
      setStatus({ type: 'error', text: "You're already subscribed with this email." })
      return
    }
    setSubscribers((list) => [...list, value.toLowerCase()])
    setStatus({ type: 'success', text: 'Thank you for subscribing!' })
    setEmail('')
  }

  return (
    <footer id="footer" className="relative bg-backgroundDeep py-16 sm:py-20">
      <SectionDivider />
      <div className="section-wrap pt-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <SkillSwapLogo size="sm" />
              <p className="text-2xl font-semibold tracking-tight">Skillswap</p>
            </div>
            <p className="mt-3 text-mutedForeground">
              A platform for learning and teaching to help people grow.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                className="input-field flex-1 text-sm"
                placeholder="Email for newsletter"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && subscribe()}
                aria-label="Newsletter email"
              />
              <button type="button" onClick={subscribe} className="btn-primary shrink-0 px-4 py-3 text-sm">
                Subscribe
              </button>
            </div>
            {status && (
              <p
                className={`mt-2 text-xs ${status.type === 'success' ? 'text-accent' : 'text-red-400'}`}
                role="status"
              >
                {status.text}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-mutedForeground">
                Product
              </h3>
              <ul className="space-y-2">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => handleProduct(link)}
                      className="text-left text-sm text-mutedForeground transition hover:text-foreground"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-mutedForeground">
                Resources
              </h3>
              <ul className="space-y-2">
                {Object.keys(resourceContent).map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => setInfo(resourceContent[label])}
                      className="text-left text-sm text-mutedForeground transition hover:text-foreground"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-mutedForeground">
                Legal
              </h3>
              <ul className="space-y-2">
                {Object.keys(legalContent).map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => setInfo(legalContent[label])}
                      className="text-left text-sm text-mutedForeground transition hover:text-foreground"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-12 font-mono text-xs uppercase tracking-widest text-mutedForeground">
          © 2026 Skillswap LTD.
        </p>
      </div>

      {info && (
        <InfoModal title={info.title} onClose={() => setInfo(null)}>
          <p>{info.body}</p>
        </InfoModal>
      )}
    </footer>
  )
}
