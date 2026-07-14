const features = [
  {
    title: 'AI Matching',
    description: 'Find the right people for the perfect swap and learn from anywhere.',
    graphic: 'ai',
  },
  {
    title: 'Real-time Chat',
    description: 'Instant connections that help you learn and grow in a more collaborative way.',
    graphic: 'chat',
  },
  {
    title: 'Flexible Scheduling',
    description: 'Learn as much as you can. Anytime, anywhere, complete your journey.',
    graphic: 'schedule',
  },
  {
    title: 'Skill Ratings',
    description: 'Feel empowered and motivated by tracking and sharing your progress.',
    graphic: 'ratings',
  },
  {
    title: 'Progress Tracking',
    description: 'Stay on track with your knowledge and share your learning journey progress.',
    graphic: 'progress',
  },
  {
    title: 'Achievements & Badges',
    description: 'Collect badges as you learn and celebrate every step of your journey.',
    graphic: 'badges',
  },
]

function FeatureGraphic({ type }) {
  if (type === 'ai') {
    return (
      <div className="relative flex h-44 items-center justify-center">
        <div className="absolute h-28 w-28 rounded-full bg-brand-500/30 blur-2xl" />
        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-[0_0_50px_rgba(59,130,246,0.6)]">
          <div className="absolute inset-2 rounded-full border border-white/20" />
          <div className="absolute inset-4 rounded-full border border-brand-300/40" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_#fff]" />
        </div>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <span
            key={deg}
            className="absolute h-1.5 w-1.5 rounded-full bg-brand-300"
            style={{ transform: `rotate(${deg}deg) translateX(56px)` }}
          />
        ))}
      </div>
    )
  }

  if (type === 'chat') {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-3 px-6">
        <div className="w-full max-w-[200px] rounded-2xl rounded-bl-sm bg-brand-600/30 px-4 py-2 text-left text-xs text-white/80">
          Ready for our session?
        </div>
        <div className="ml-auto w-full max-w-[180px] rounded-2xl rounded-br-sm bg-white/10 px-4 py-2 text-right text-xs text-white/70">
          Let&apos;s swap skills!
        </div>
        <div className="w-full max-w-[160px] rounded-2xl rounded-bl-sm bg-brand-500/20 px-4 py-2 text-left text-xs text-white/60">
          See you at 3pm ✦
        </div>
      </div>
    )
  }

  if (type === 'schedule') {
    return (
      <div className="h-44 px-6 py-4">
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
          {[
            { name: 'Roman', time: 'Mon 2:00 PM', color: 'bg-brand-500' },
            { name: 'Arunima', time: 'Wed 4:30 PM', color: 'bg-brand-400' },
            { name: 'Rafael', time: 'Fri 10:00 AM', color: 'bg-brand-300' },
          ].map((row) => (
            <div key={row.name} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <div className={`h-8 w-8 rounded-full ${row.color} flex items-center justify-center text-xs font-bold text-white`}>
                {row.name[0]}
              </div>
              <div className="flex-1 text-xs text-white/80">{row.name}</div>
              <div className="text-[10px] text-white/40">{row.time}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'ratings') {
    return (
      <div className="relative flex h-44 items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40" />
          <span className="text-5xl text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">★</span>
        </div>
      </div>
    )
  }

  if (type === 'progress') {
    return (
      <div className="flex h-44 flex-col justify-center gap-4 px-8">
        {[
          { label: 'Python', pct: 85 },
          { label: 'Video Editing', pct: 62 },
          { label: 'UI Design', pct: 40 },
        ].map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex justify-between text-[10px] text-white/50">
              <span>{bar.label}</span>
              <span>{bar.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${bar.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-44 items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600/40 text-2xl">🏅</div>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/30 text-2xl">⭐</div>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-2xl">🎯</div>
    </div>
  )
}

export default function FeatureCard({ title, description, graphic, index }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-sm transition hover:border-brand-500/30 hover:shadow-[0_12px_40px_rgba(37,99,235,0.15)]"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <FeatureGraphic type={graphic} />
      <div className="border-t border-white/5 px-6 py-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
      </div>
    </div>
  )
}

export { features }
