import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingCta() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="card-inverted relative z-10 mx-auto max-w-2xl px-8 py-14 text-center"
      >
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Skill/Swap <span className="text-mutedForeground">is out now.</span>
        </h2>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/auth" className="btn-primary px-10 py-3.5 text-sm">
            Log In
          </Link>
          <Link to="/auth?mode=signup" className="btn-outline px-10 py-3.5 text-sm">
            Sign Up
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
