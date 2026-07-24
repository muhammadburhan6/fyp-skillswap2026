import { useState, useEffect } from 'react'
import SkillSwapLogo from './SkillSwapLogo'

const navLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Categories', href: '#categories' },
  { label: 'Stats', href: '#stats' },
  { label: 'Stories', href: '#testimonials' },
]

export default function LandingNavbar({ onLogin, onSignup }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const scrollTo = (href) => {
    setOpen(false)
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className={`ls-nav ${scrolled ? 'ls-nav-scrolled' : ''}`}>
      <nav className="section-wrap ls-nav-inner" aria-label="Primary">
        <a href="#top" className="ls-nav-brand" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <SkillSwapLogo size="sm" />
          <span>Skillswap</span>
        </a>

        <div className="ls-nav-links">
          {navLinks.map((link) => (
            <button key={link.href} type="button" className="ls-nav-link" onClick={() => scrollTo(link.href)}>
              {link.label}
            </button>
          ))}
        </div>

        <div className="ls-nav-actions">
          <button type="button" className="btn-ghost text-sm" onClick={onLogin}>
            Log in
          </button>
          <button type="button" className="btn-primary px-5 py-2.5 text-sm" onClick={onSignup}>
            Get Started
          </button>
        </div>

        <button
          type="button"
          className="ls-hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={open ? 'ls-ham-line open-1' : 'ls-ham-line'} />
          <span className={open ? 'ls-ham-line open-2' : 'ls-ham-line'} />
          <span className={open ? 'ls-ham-line open-3' : 'ls-ham-line'} />
        </button>
      </nav>

      {open && (
        <div className="ls-mobile-menu">
          {navLinks.map((link) => (
            <button key={link.href} type="button" className="ls-mobile-link" onClick={() => scrollTo(link.href)}>
              {link.label}
            </button>
          ))}
          <div className="ls-mobile-actions">
            <button
              type="button"
              className="btn-ghost w-full justify-center"
              onClick={() => {
                setOpen(false)
                onLogin()
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={() => {
                setOpen(false)
                onSignup()
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
