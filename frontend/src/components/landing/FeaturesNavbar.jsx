import { Link } from 'react-router-dom'
import { useState } from 'react'
import SkillSwapLogo from './SkillSwapLogo'

export default function FeaturesNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="relative z-50 border-b border-white/[0.06] bg-backgroundBase/80 px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="section-wrap flex items-center justify-between !px-0">
        <Link to="/" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <SkillSwapLogo />
          <span className="text-xl font-semibold tracking-tight">Skillswap</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/auth" className="btn-primary hidden px-5 py-2.5 text-sm sm:inline-flex">
            Get started →
          </Link>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] sm:hidden"
            aria-label="Menu"
          >
            <span className={`h-0.5 w-5 bg-foreground transition duration-200 ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`h-0.5 w-5 bg-foreground transition duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-5 bg-foreground transition duration-200 ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="section-wrap mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#050506]/95 p-4 backdrop-blur-xl !px-4 sm:hidden">
          <Link to="/" className="rounded-lg px-3 py-2 text-sm text-mutedForeground hover:bg-white/[0.05] hover:text-foreground" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/explore" className="rounded-lg px-3 py-2 text-sm text-mutedForeground hover:bg-white/[0.05] hover:text-foreground" onClick={() => setOpen(false)}>Features</Link>
          <Link to="/auth" className="btn-primary text-center text-sm" onClick={() => setOpen(false)}>Get started</Link>
        </div>
      )}
    </nav>
  )
}
