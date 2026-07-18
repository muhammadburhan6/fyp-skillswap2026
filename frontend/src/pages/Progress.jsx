import { useEffect, useState } from 'react'

import AppShell from '../components/layout/AppShell'

import api from '../lib/api'



export default function Progress() {

  const [data, setData] = useState(null)



  useEffect(() => { api.getProgress().then(setData) }, [])



  if (!data) {

    return (

      <AppShell>

        <p className="text-sm text-mutedForeground">Loading progress…</p>

      </AppShell>

    )

  }



  const xpPct = ((data.xp % 150) / 150) * 100



  return (

    <AppShell title="Progress" subtitle="Track your XP, level, and badges">

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {[

          { l: 'Level', v: data.level },

          { l: 'XP', v: data.xp },

          { l: 'Points', v: data.skill_points },

          { l: 'Sessions', v: data.sessions_completed },

        ].map((s) => (

          <div key={s.l} className="card p-6 text-center">

            <p className="stat-value">{s.v}</p>

            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-mutedForeground">{s.l}</p>

          </div>

        ))}

      </div>



      <div className="card mt-8">

        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-mutedForeground">XP to next level</p>

        <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">

          <div className="h-full rounded-full bg-accent shadow-accent-glow transition-all duration-500" style={{ width: `${xpPct}%` }} />

        </div>

        <p className="mt-2 font-mono text-xs text-mutedForeground">{Math.round(xpPct)}% to level {data.level + 1}</p>

      </div>



      <div className="card mt-8">

        <h2 className="font-display text-xl font-semibold text-foreground">Badges earned</h2>

        <div className="mt-4 flex flex-wrap gap-2">

          {data.badges?.map((b) => <span key={b} className="badge">{b}</span>)}

          {!data.badges?.length && <p className="text-sm text-mutedForeground">Complete sessions to earn badges</p>}

        </div>

      </div>

    </AppShell>

  )

}


