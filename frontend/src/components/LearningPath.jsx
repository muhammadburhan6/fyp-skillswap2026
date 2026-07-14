import { useEffect, useState } from 'react'
import api from '../lib/api'

const LEVELS = ['beginner', 'intermediate', 'advanced']

function ModeBadge({ mode }) {
  if (!mode) return null
  const ai = mode === 'ai'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        ai ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
      }`}
    >
      {ai ? 'AI-generated' : 'Template plan'}
    </span>
  )
}

export default function LearningPath({ sessionId, hasExisting }) {
  const [plan, setPlan] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [level, setLevel] = useState('beginner')
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    if (open && hasExisting && !plan) {
      api.getLearningPath(sessionId)
        .then((d) => setPlan(d.learning_path))
        .catch(() => {})
    }
  }, [open, hasExisting, plan, sessionId])

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await api.generateLearningPath(sessionId, { level, duration_minutes: Number(duration) })
      setPlan(d.learning_path)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate a learning path.')
    } finally {
      setLoading(false)
    }
  }

  const totalMinutes = plan?.steps?.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0) || 0

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-sky-400 hover:text-sky-300"
      >
        {open ? 'Hide learning path' : hasExisting ? 'View learning path' : 'Generate learning path'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-400">
              Level
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-field mt-1 py-1.5 text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Duration (min)
              <input
                type="number"
                min="15"
                max="480"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-field mt-1 w-24 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {loading ? 'Generating…' : plan ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {plan && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ModeBadge mode={plan.mode} />
                <span className="text-xs text-slate-500">Total: {totalMinutes} min</span>
              </div>
              <ol className="space-y-2">
                {plan.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{step.title}</p>
                        <span className="shrink-0 text-xs text-slate-500">{step.duration_minutes} min</span>
                      </div>
                      {step.description && <p className="mt-0.5 text-xs text-slate-400">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              {plan.resources?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-300">Resources</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {plan.resources.map((r, i) => (
                      <li key={i} className="text-xs text-slate-400">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
