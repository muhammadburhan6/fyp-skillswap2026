import { Link } from 'react-router-dom'
import { useState } from 'react'
import SkillSwapLogo from './SkillSwapLogo'

export default function FeaturesNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="relative z-50 border-b border-white/5 bg-black/50 px-6 py-5 backdrop-blur-md lg:px-12">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <SkillSwapLogo />
          <span className="text-lg font-semibold text-white">SkillSwap</span>
        </Link>

        <Link
          to="/auth"
          className="rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-400 sm:px-6 sm:py-2.5 sm:text-sm"
        >
          Get started
        </Link>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 sm:hidden"
          aria-label="Menu"
        >
          <span className={`h-0.5 w-5 bg-white transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`h-0.5 w-5 bg-white transition ${open ? 'opacity-0' : ''}`} />
          <span className={`h-0.5 w-5 bg-white transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:hidden">
          <Link to="/" className="text-sm text-white/70" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/explore" className="text-sm text-white/70" onClick={() => setOpen(false)}>Features</Link>
          <Link to="/auth" className="btn-primary text-center" onClick={() => setOpen(false)}>Get started</Link>
        </div>
      )}
    </nav>
  )
}
