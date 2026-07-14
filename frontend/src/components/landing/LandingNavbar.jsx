import { Link } from 'react-router-dom'
import SkillSwapLogo from './SkillSwapLogo'

export default function LandingNavbar() {
  return (
    <nav className="relative z-50 flex items-center justify-between border-b border-white/5 bg-black/30 px-6 py-5 backdrop-blur-md lg:px-12">
      <Link to="/" className="flex items-center gap-2.5">
        <SkillSwapLogo />
        <span className="text-lg font-semibold tracking-tight text-white">SkillSwap</span>
      </Link>

      <Link
        to="/auth"
        className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
      >
        Get started
      </Link>
    </nav>
  )
}
