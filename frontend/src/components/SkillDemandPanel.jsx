import { useEffect, useState } from 'react'

import api from '../lib/api'

const LEVEL_LABELS = {
  high: 'High demand',
  rising: 'Rising',
  steady: 'Steady',
}

const LEVEL_STYLES = {
  high: 'border-accent/40 bg-accent/15 text-accent',
  rising: 'border-white/15 bg-white/[0.08] text-foreground',
  steady: 'border-white/10 bg-white/[0.04] text-mutedForeground',
}

export default function SkillDemandPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.getSkillDemand()
      .then((d) => { if (active) setData(d) })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const skills = data?.skills || []
  const maxScore = data?.max_score || 1

  return (
    <section className="card">
      <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold text-foreground">Skill Demand Analysis</h2>
          <span className="badge">{data?.mode === 'ai' ? 'AI-powered' : 'Live activity data'}</span>
        </div>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-mutedForeground">Analyzing platform activity…</p>
      ) : skills.length === 0 ? (
        <p className="py-6 text-center text-sm text-mutedForeground">
          Not enough activity yet — demand trends appear as users add skills.
        </p>
      ) : (
        <>
          {data?.insight && (
            <p className="mb-5 rounded-lg border border-accent/20 bg-accent/[0.07] px-4 py-3 text-sm text-foreground">
              {data.insight}
            </p>
          )}
          <div className="space-y-4">
            {skills.map((s) => (
              <div key={s.skill_id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.name}
                    <span className="ml-2 font-mono text-xs text-mutedForeground">{s.category}</span>
                  </p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${LEVEL_STYLES[s.level] || LEVEL_STYLES.steady}`}>
                    {LEVEL_LABELS[s.level] || s.level}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${Math.max(8, Math.round((s.demand_score / maxScore) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-xs text-mutedForeground">
                  {s.learners} learner{s.learners === 1 ? '' : 's'} · {s.teachers} teacher{s.teachers === 1 ? '' : 's'} · {s.sessions} session{s.sessions === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
