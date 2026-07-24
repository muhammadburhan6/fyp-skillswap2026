import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import LandingNavbar from '../components/landing/LandingNavbar'
import LandingFooter from '../components/landing/LandingFooter'
import AnimatedCounter from '../components/landing/AnimatedCounter'
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel'
import {
  Toast,
} from '../components/landing/LandingModals'
import SpotlightCard from '../components/ui/SpotlightCard'
import GradientText from '../components/ui/GradientText'
import SectionDivider from '../components/ui/SectionDivider'
import useParallax from '../hooks/useParallax'
import { useAuthStore } from '../store/useAuthStore'

const steps = [
  {
    n: '01',
    action: 'signup',
    cta: 'Create account',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
    title: 'Sign Up',
    desc: 'Create your free account and list the skills you can teach and want to learn.',
  },
  {
    n: '02',
    action: 'teach',
    cta: 'Start teaching',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: 'Teach a Skill',
    desc: 'Share what you love. Every session you teach earns you points for the skills you want.',
  },
  {
    n: '03',
    action: 'learn',
    cta: 'Find a match',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
    title: 'Earn Points & Learn',
    desc: 'Spend points to book learning sessions. Grow together — no money needed.',
  },
]

const categories = [
  { name: 'Programming', icon: '</>' },
  { name: 'Design', icon: '◇' },
  { name: 'Music', icon: '♪' },
  { name: 'Languages', icon: '文' },
  { name: 'Cooking', icon: '◎' },
  { name: 'Fitness', icon: '✦' },
  { name: 'Business', icon: '▣' },
  { name: 'Photography', icon: '◉' },
]

const ease = [0.16, 1, 0.3, 1]

export default function Landing() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const parallax = useParallax(420)
  const [toast, setToast] = useState(null)

  const openLogin = useCallback(() => navigate('/auth'), [navigate])
  const openSignup = useCallback(() => navigate('/auth?mode=signup'), [navigate])
  const showToast = useCallback((message) => setToast(message), [])

  const openCategory = useCallback(
    (name) => {
      const path = `/discover?skill=${encodeURIComponent(name)}`
      if (user) {
        navigate(path)
        return
      }
      navigate(`/auth?mode=signup&next=${encodeURIComponent(path)}`)
    },
    [user, navigate],
  )

  const goAuthNext = useCallback(
    (path) => {
      if (user) navigate(path)
      else navigate(`/auth?mode=signup&next=${encodeURIComponent(path)}`)
    },
    [user, navigate],
  )

  const openStep = useCallback(
    (action) => {
      if (action === 'signup') {
        if (user) navigate(user.onboarding_complete ? '/dashboard' : '/onboarding')
        else openSignup()
        return
      }
      if (action === 'teach') {
        goAuthNext(user?.onboarding_complete === false ? '/onboarding' : '/profile')
        return
      }
      if (action === 'learn') {
        goAuthNext('/discover')
      }
    },
    [user, navigate, openSignup, goAuthNext],
  )

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div id="top" className="marketing-shell ls-page relative min-h-screen text-foreground">
      <LandingNavbar onLogin={openLogin} onSignup={openSignup} />

      <section className="section-wrap relative z-10 overflow-hidden pb-16 pt-10 md:pb-28 md:pt-16 lg:pb-32 lg:pt-20">
        <motion.div
          style={{
            opacity: parallax.opacity,
            scale: parallax.scale,
            y: parallax.y,
          }}
          className="will-change-transform"
        >
          <div className="flex items-center gap-3">
            <SkillSwapLogo size="md" />
            <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">
              Peer-to-peer skill exchange
            </p>
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-none tracking-[-0.03em] sm:text-5xl md:text-7xl lg:text-8xl">
            <GradientText as="span">Skillswap</GradientText>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mutedForeground md:text-2xl">
            Learn anything. Teach what you love. <span className="text-gradient-accent">No money needed.</span>
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-mutedForeground md:text-lg">
            Swap skills with real people using a points system. Earn points by teaching, spend them to learn —
            AI-powered matching included.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <button type="button" onClick={openSignup} className="btn-primary">
              Get Started →
            </button>
            <button type="button" onClick={scrollToHow} className="btn-outline">
              Explore Features
            </button>
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      <section id="how-it-works" className="scroll-mt-24 py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">How it works</GradientText>
          </h2>
          <p className="mt-3 max-w-xl text-mutedForeground">Three simple steps from signup to your first skill swap.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
              >
                <SpotlightCard
                  as="button"
                  type="button"
                  className="ls-step-card h-full p-8"
                  onClick={() => openStep(s.action)}
                  aria-label={`${s.title} — ${s.cta}`}
                >
                  <div className="ls-step-icon">{s.icon}</div>
                  <span className="mt-4 block font-mono text-xs tracking-widest text-accent">{s.n}</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mutedForeground">{s.desc}</p>
                  <span className="ls-step-cta">
                    {s.cta} →
                  </span>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section id="categories" className="scroll-mt-24 py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">Categories</GradientText>
          </h2>
          <p className="mt-3 max-w-xl text-mutedForeground">Browse skills people are exchanging right now.</p>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.name}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04, ease }}
                className="ls-category-card"
                onClick={() => openCategory(cat.name)}
              >
                <span className="ls-category-icon" aria-hidden>
                  {cat.icon}
                </span>
                <span className="ls-category-name">{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section id="stats" className="scroll-mt-24 relative py-16 md:py-24 lg:py-32">
        <div className="section-wrap relative grid grid-cols-1 gap-6 text-center sm:grid-cols-3 sm:gap-8">
          <AnimatedCounter end={12} suffix="k+" label="Skills Exchanged" />
          <AnimatedCounter end={8.5} decimals={1} suffix="k" label="Active Users" />
          <AnimatedCounter end={45} suffix="k" label="Sessions Completed" />
        </div>
      </section>

      <SectionDivider />

      <section id="testimonials" className="scroll-mt-24 py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">Success stories</GradientText>
          </h2>
          <p className="mt-3 max-w-xl text-mutedForeground">Real learners, real swaps, zero tuition.</p>
          <div className="mt-12">
            <TestimonialsCarousel />
          </div>
        </div>
      </section>

      <LandingFooter onToast={showToast} />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
