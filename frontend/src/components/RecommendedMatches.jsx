import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function ModeBadge({ mode }) {
  const ai = mode === 'ai'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        ai ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
      }`}
    >
      {ai ? 'AI-powered' : 'Basic matching'}
    </span>
  )
}

export default function RecommendedMatches() {
  const [recs, setRecs] = useState([])
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.getRecommendations()
      .then((d) => {
        if (!active) return
        setRecs(d.recommendations || [])
        setMode(d.mode)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="dash-glass p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Recommended for you</h2>
          {mode && <ModeBadge mode={mode} />}
        </div>
        <Link to="/discover" className="text-sm text-slate-400 transition hover:text-sky-300">
          see all
        </Link>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Finding your best matches…</p>
      ) : recs.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No recommendations yet — add more skills to your profile to get matched.
        </p>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <div
              key={rec.user.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-sm font-bold text-sky-200">
                {initials(rec.user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{rec.user.name}</p>
                  <span className="shrink-0 rounded-full bg-sky-400/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                    {rec.score}%
                  </span>
                </div>
                {rec.shared_skills?.length > 0 && (
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {rec.shared_skills.slice(0, 4).join(' · ')}
                  </p>
                )}
                {rec.reason && <p className="mt-1.5 text-xs italic text-slate-400">{rec.reason}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
