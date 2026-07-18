import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import LandingFooter from '../components/landing/LandingFooter'
import SpotlightCard from '../components/ui/SpotlightCard'
import GradientText from '../components/ui/GradientText'
import SectionDivider from '../components/ui/SectionDivider'
import useParallax from '../hooks/useParallax'

const steps = [
  { n: '01', title: 'List your skills', desc: 'Share what you can teach and what you want to learn.' },
  { n: '02', title: 'Get matched', desc: 'AI finds partners with complementary skills and availability.' },
  { n: '03', title: 'Learn & teach', desc: 'Schedule sessions, earn points, and grow together.' },
]

const categories = ['Design', 'Coding', 'Music', 'Languages', 'Fitness', 'Business']

const testimonials = [
  { quote: 'I learned UI design while teaching Python — zero money spent.', author: 'Sarah K.' },
  { quote: 'The matching is scary accurate. Found my perfect swap in two days.', author: 'James L.' },
  { quote: 'Best way to pick up Spanish while sharing guitar skills.', author: 'Maria R.' },
]

const ease = [0.16, 1, 0.3, 1]

export default function Landing() {
  const parallax = useParallax(420)

  return (
    <div className="marketing-shell relative min-h-screen text-foreground">
      <nav className="section-wrap relative z-20 flex items-center justify-between border-b border-white/[0.06] py-6">
        <Link to="/" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <SkillSwapLogo size="sm" />
          <span className="text-xl font-semibold tracking-tight">Skill/Swap</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/auth" className="btn-ghost text-sm">Log in</Link>
          <Link to="/auth?mode=signup" className="btn-primary px-5 py-2.5 text-sm">Get Started</Link>
        </div>
      </nav>

      <section className="section-wrap relative z-10 overflow-hidden py-16 md:py-28 lg:py-32">
        <motion.div
          style={{
            opacity: parallax.opacity,
            scale: parallax.scale,
            y: parallax.y,
          }}
          className="will-change-transform"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Peer-to-peer skill exchange</p>
          <h1 className="mt-6 text-4xl font-semibold leading-none tracking-[-0.03em] sm:text-5xl md:text-7xl lg:text-8xl">
            <GradientText as="span">Skill/Swap</GradientText>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mutedForeground md:text-2xl">
            Learn anything. Teach what you love. <span className="text-gradient-accent">No money needed.</span>
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-mutedForeground md:text-lg">
            Swap skills with real people. Earn points by teaching, spend them to learn. AI-powered matching included.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/auth?mode=signup" className="btn-primary">Get Started →</Link>
            <Link to="/explore" className="btn-outline">Explore Features</Link>
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      <section className="py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">How it works</GradientText>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
              >
                <SpotlightCard className="h-full p-8">
                  <span className="font-mono text-xs tracking-widest text-accent">{s.n}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mutedForeground">{s.desc}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">Categories</GradientText>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {categories.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05, ease }}
                className="card flex items-center justify-center p-6 text-center transition duration-300 hover:-translate-y-1"
              >
                <span className="text-sm font-medium text-foreground">{name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative py-16 md:py-24 lg:py-32">
        <div className="section-wrap relative grid grid-cols-1 gap-10 text-center sm:grid-cols-3 sm:gap-8">
          {[['12k+', 'Skills exchanged'], ['8.5k', 'Active users'], ['45k', 'Sessions completed']].map(([n, l]) => (
            <div key={l} className="card p-8">
              <p className="text-4xl font-semibold tracking-tight md:text-5xl">
                <GradientText as="span" accent>{n}</GradientText>
              </p>
              <p className="mt-3 font-mono text-xs uppercase tracking-widest text-mutedForeground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      <section className="py-16 md:py-24 lg:py-32">
        <div className="section-wrap">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            <GradientText as="span">Testimonials</GradientText>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
            {testimonials.map((t, i) => (
              <motion.blockquote
                key={t.author}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
              >
                <SpotlightCard className="h-full p-8">
                  <span className="text-5xl leading-none text-accent/40" aria-hidden>&ldquo;</span>
                  <p className="mt-2 text-lg leading-relaxed text-foreground">{t.quote}</p>
                  <footer className="mt-6 font-mono text-xs uppercase tracking-widest text-mutedForeground">— {t.author}</footer>
                </SpotlightCard>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="section-wrap py-16 text-center md:py-28">
        <div className="card-inverted mx-auto max-w-3xl p-10 md:p-14">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            No money. No pressure.
            <br />
            Just real learning.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-mutedForeground">
            Skill/Swap runs on contribution, not payment. Teach to earn points, learn by spending them.
          </p>
          <Link to="/auth?mode=signup" className="btn-primary mt-10 inline-flex">
            Join Skill/Swap →
          </Link>
          <div className="mt-6">
            <Link
              to="/auth?mode=admin"
              className="inline-flex items-center gap-2 text-sm text-mutedForeground transition hover:text-accent"
            >
              Admin login →
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
