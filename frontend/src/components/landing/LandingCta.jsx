import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import TiltCard from '../3d/TiltCard'

export default function LandingCta() {
  return (
    <section className="relative overflow-hidden bg-black px-6 py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[min(900px,120vw)] -translate-x-1/2 -translate-y-1/2">
        <div className="h-full w-full rounded-[50%] bg-brand-500/40 blur-[80px]" />
        <div className="absolute inset-x-[15%] top-[30%] h-[60%] rounded-[50%] bg-brand-400/30 blur-[60px]" />
      </div>

      <TiltCard className="group relative z-10 mx-auto max-w-2xl" depth={14}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl border border-white/10 bg-black/40 px-8 py-14 text-center shadow-[0_25px_80px_rgba(37,99,235,0.15)] backdrop-blur-xl"
          style={{ transform: 'translateZ(40px)' }}
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            SkillSwap <span className="text-white/50">is out now!</span>
          </h2>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth"
              className="rounded-full bg-brand-500 px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              style={{ transform: 'translateZ(20px)' }}
            >
              Log In
            </Link>
            <Link
              to="/auth?mode=signup"
              className="rounded-full border border-white/30 bg-white/5 px-10 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
              style={{ transform: 'translateZ(20px)' }}
            >
              Sign Up
            </Link>
          </div>
        </motion.div>
      </TiltCard>
    </section>
  )
}
