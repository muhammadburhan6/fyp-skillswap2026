import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'

export default function Progress() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getProgress().then(setData)
  }, [])

  if (!data) {
    return (
      <AppShell>
        <p className="text-slate-400">Loading progress…</p>
      </AppShell>
    )
  }

  const xpPct = ((data.xp % 150) / 150) * 100

  return (
    <AppShell title="Progress" subtitle="Track your XP, level, and badges">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { l: 'Level', v: data.level },
          { l: 'XP', v: data.xp },
          { l: 'Points', v: data.skill_points },
          { l: 'Sessions', v: data.sessions_completed },
        ].map((s) => (
          <div key={s.l} className="card text-center">
            <p className="stat-value">{s.v}</p>
            <p className="text-sm text-slate-400">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <p className="mb-2 text-sm text-slate-400">XP to next level</p>
        <div className="h-3 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-sky-400" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold text-white">Badges earned</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.badges?.map((b) => (
            <span key={b} className="badge">🏅 {b}</span>
          ))}
          {!data.badges?.length && <p className="text-slate-500">Complete sessions to earn badges</p>}
        </div>
      </div>
    </AppShell>
  )
}
