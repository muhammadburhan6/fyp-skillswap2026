import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import LandingFooter from '../components/landing/LandingFooter'

const steps = [
  { n: '01', title: 'List your skills', desc: 'Share what you can teach and what you want to learn.' },
  { n: '02', title: 'Get matched', desc: 'AI finds partners with complementary skills and availability.' },
  { n: '03', title: 'Learn & teach', desc: 'Schedule sessions, earn points, and grow together.' },
]

const categories = [
  { icon: '🎨', name: 'Design' }, { icon: '💻', name: 'Coding' }, { icon: '🎵', name: 'Music' },
  { icon: '🌍', name: 'Languages' }, { icon: '💪', name: 'Fitness' }, { icon: '📊', name: 'Business' },
]

const testimonials = [
  { quote: 'I learned UI design while teaching Python — zero money spent!', author: 'Sarah K.' },
  { quote: 'The matching is scary accurate. Found my perfect swap in 2 days.', author: 'James L.' },
  { quote: 'Best way to pick up Spanish while sharing guitar skills.', author: 'Maria R.' },
]

export default function Landing() {
  return (
    <div className="auth-shell min-h-screen text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <SkillSwapLogo size="sm" />
          <span className="font-display text-xl font-bold">SkillSwap</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm text-slate-400 hover:text-sky-300">Log in</Link>
          <Link to="/auth?mode=signup" className="btn-primary px-5 py-2.5">Get Started Free</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1 text-sm font-medium text-sky-300">
            Peer-to-peer skill exchange
          </span>
          <h1 className="section-title mx-auto mt-6 max-w-3xl">
            Learn anything. Teach what you love. <span className="text-sky-400">No money needed.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Swap skills with real people. Earn points by teaching, spend them to learn. AI-powered matching included.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/auth?mode=signup" className="btn-primary">Get Started Free</Link>
            <Link to="/explore" className="btn-outline">Explore Features</Link>
          </div>
        </motion.div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="section-title text-center">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card text-center">
                <span className="text-3xl font-bold text-sky-400">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="section-title">Popular skill categories</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <div key={c.name} className="card flex flex-col items-center gap-2 py-6">
                <span className="text-3xl">{c.icon}</span>
                <span className="font-medium text-white">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-8 px-6 text-center">
          {[['12k+', 'Skills exchanged'], ['8.5k', 'Active users'], ['45k', 'Sessions completed']].map(([n, l]) => (
            <div key={l}>
              <p className="text-3xl font-bold text-sky-300">{n}</p>
              <p className="mt-1 text-sm text-slate-400">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="section-title text-center">Loved by learners worldwide</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote key={t.author} className="card">
                <p className="text-slate-300">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-semibold text-sky-400">— {t.author}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">No money. No pressure. Just real learning.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-slate-400">
          SkillSwap runs on contribution, not payment. Teach to earn points, learn by spending them.
        </p>
        <Link to="/auth?mode=signup" className="btn-primary mt-8 inline-flex">Join SkillSwap</Link>
      </section>

      <LandingFooter />
    </div>
  )
}
