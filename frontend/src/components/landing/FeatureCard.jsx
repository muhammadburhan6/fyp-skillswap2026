import SpotlightCard from '../ui/SpotlightCard'

const features = [
  { title: 'AI Matching', description: 'Find the right people for the perfect swap and learn from anywhere.', graphic: 'ai', span: 'md:col-span-4 md:row-span-2' },
  { title: 'Real-time Chat', description: 'Instant connections that help you learn and grow collaboratively.', graphic: 'chat', span: 'md:col-span-2' },
  { title: 'Flexible Scheduling', description: 'Learn anytime, anywhere — complete your journey on your terms.', graphic: 'schedule', span: 'md:col-span-2' },
  { title: 'Skill Ratings', description: 'Track and share your progress with structured feedback.', graphic: 'ratings', span: 'md:col-span-2' },
  { title: 'Progress Tracking', description: 'Stay on track and share your learning journey.', graphic: 'progress', span: 'md:col-span-2' },
  { title: 'Achievements & Badges', description: 'Collect badges as you learn and celebrate every step.', graphic: 'badges', span: 'md:col-span-2' },
]

function FeatureGraphic({ type }) {
  if (type === 'ai') {
    return (
      <div className="flex h-44 items-center justify-center border-b border-white/[0.06] md:h-64">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/40 bg-accent/15 text-2xl font-semibold text-accent shadow-[0_0_40px_rgba(94,106,210,0.35)]">
          AI
        </div>
      </div>
    )
  }
  if (type === 'chat') {
    return (
      <div className="flex h-36 flex-col justify-center gap-2 border-b border-white/[0.06] px-6">
        <div className="max-w-[200px] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-mutedForeground">Ready for our session?</div>
        <div className="ml-auto max-w-[180px] rounded-lg bg-accent px-3 py-2 font-mono text-xs text-white shadow-accent-glow">Let&apos;s swap skills</div>
      </div>
    )
  }
  if (type === 'schedule') {
    return (
      <div className="h-36 border-b border-white/[0.06] px-6 py-4">
        {['Mon 2:00 PM', 'Wed 4:30 PM', 'Fri 10:00 AM'].map((time) => (
          <div key={time} className="flex items-center justify-between border-b border-white/[0.06] py-2 font-mono text-xs last:border-0">
            <span>Session</span>
            <span className="text-mutedForeground">{time}</span>
          </div>
        ))}
      </div>
    )
  }
  if (type === 'ratings') {
    return (
      <div className="flex h-36 items-center justify-center border-b border-white/[0.06] text-5xl text-accent">
        ★
      </div>
    )
  }
  if (type === 'progress') {
    return (
      <div className="flex h-36 flex-col justify-center gap-3 border-b border-white/[0.06] px-8">
        {[85, 62, 40].map((pct) => (
          <div key={pct} className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex h-36 items-center justify-center gap-4 border-b border-white/[0.06] font-mono text-xs uppercase tracking-widest text-mutedForeground">
      Badge · Star · Goal
    </div>
  )
}

export default function FeatureCard({ title, description, graphic, span = '' }) {
  return (
    <SpotlightCard className={`h-full overflow-hidden p-0 ${span}`}>
      <FeatureGraphic type={graphic} />
      <div className="px-6 py-5">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-mutedForeground">{description}</p>
      </div>
    </SpotlightCard>
  )
}

export { features }
