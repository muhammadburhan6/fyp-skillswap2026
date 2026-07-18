import { Link } from 'react-router-dom'
import SkillSwapLogo from './SkillSwapLogo'

export default function LandingNavbar() {
  return (
    <nav className="relative z-50 flex items-center justify-between border-b border-white/[0.06] bg-backgroundBase/80 px-6 py-5 backdrop-blur-xl lg:px-12">
      <Link to="/" className="flex items-center gap-2.5">
        <SkillSwapLogo />
        <span className="text-lg font-semibold tracking-tight">Skill/Swap</span>
      </Link>

      <Link to="/auth" className="btn-primary px-5 py-2.5 text-sm">
        Get started
      </Link>
    </nav>
  )
}
