import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import RecommendedMatches from '../components/RecommendedMatches'
import SkillDemandPanel from '../components/SkillDemandPanel'
import { isLocalhost } from '../lib/env'

export default function SkillAI() {
  // `key` bump forces both panels to remount and re-fetch from the AI backend.
  const [refreshKey, setRefreshKey] = useState(0)

  // Localhost-only feature — if opened anywhere else, bounce to the dashboard.
  if (!isLocalhost()) return <Navigate to="/dashboard" replace />

  return (
    <AppShell
      title="AI Skill Insights"
      subtitle="AI-powered matching and live skill demand analysis. (Local development feature)"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mutedForeground">
          Scores, reasons and demand insights below are generated live by AI (Gemini). Hit
          <span className="text-foreground"> Re-run analysis</span> to regenerate.
        </p>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="btn-primary px-4 py-2 text-xs"
        >
          ⟳ Re-run analysis
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendedMatches key={`matches-${refreshKey}`} showSeeAll={false} />
        <SkillDemandPanel key={`demand-${refreshKey}`} />
      </div>
    </AppShell>
  )
}
