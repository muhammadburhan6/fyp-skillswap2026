import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import api from '../lib/api'



function initials(name = '') {

  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

}



function ModeBadge({ mode }) {

  return (

    <span className="badge">

      {mode === 'ai' ? 'AI-powered' : 'Basic matching'}

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

    return () => { active = false }

  }, [])



  return (

    <section className="card">

      <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-4">

        <div className="flex items-center gap-3">

          <h2 className="font-display text-xl font-semibold text-foreground">AI Skill Matching</h2>

          {mode && <ModeBadge mode={mode} />}

        </div>

        <Link to="/discover" className="btn-ghost font-mono text-xs uppercase tracking-widest">See all</Link>

      </div>



      {loading ? (

        <p className="py-6 text-center text-sm text-mutedForeground">Finding your best matches…</p>

      ) : recs.length === 0 ? (

        <p className="py-6 text-center text-sm text-mutedForeground">

          No recommendations yet — add more skills to your profile.

        </p>

      ) : (

        <div className="divide-y divide-white/[0.06]">

          {recs.map((rec) => (

            <div key={rec.user.id} className="flex items-start gap-4 rounded-lg py-4 transition-colors duration-200 hover:bg-white/[0.03]">

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-mono text-xs text-accent">

                {initials(rec.user.name)}

              </span>

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-2">

                  <p className="truncate font-medium text-foreground">{rec.user.name}</p>

                  <span className="badge shrink-0">{rec.score}%</span>

                </div>

                {rec.shared_skills?.length > 0 && (

                  <p className="mt-1 truncate font-mono text-xs text-mutedForeground">

                    {rec.shared_skills.slice(0, 4).join(' · ')}

                  </p>

                )}

                {rec.reason && <p className="mt-1.5 text-sm text-mutedForeground">{rec.reason}</p>}

              </div>

            </div>

          ))}

        </div>

      )}

    </section>

  )

}


