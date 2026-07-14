import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'

export default function Discover() {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    api.discoverMatches().then((d) => setMatches(d.matches))
  }, [])

  const request = async (userId, skill) => {
    await api.acceptMatch(userId, skill)
    alert('Swap request sent!')
  }

  return (
    <AppShell title="Matches" subtitle="AI-scored partners based on complementary skills">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <div key={m.user.id} className="card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-lg font-bold text-sky-200">
              {m.user.name?.[0]}
            </div>
            <h3 className="mt-3 font-semibold text-white">{m.user.name}</h3>
            <p className="text-sm text-slate-400">Teaches: {m.user.skills_teach?.join(', ')}</p>
            <p className="mt-1 text-sm text-sky-300">Can teach you: {m.skill_offered}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="badge">{m.match_score}% match</span>
              <button type="button" onClick={() => request(m.user.id, m.skill_offered)} className="btn-primary px-4 py-2 text-sm">
                Request Swap
              </button>
            </div>
          </div>
        ))}
        {!matches.length && (
          <div className="card col-span-full py-12 text-center text-slate-400">
            No matches yet. Complete your profile to get better recommendations.
          </div>
        )}
      </div>
    </AppShell>
  )
}
