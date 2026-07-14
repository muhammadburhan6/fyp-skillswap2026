import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import ChatbotWidget from '../components/ai/ChatbotWidget'
import { api } from '../services/api'

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.discoverMatches().then((d) => setMatches(d.matches)).finally(() => setLoading(false))
  }, [])

  const handleMatch = async (userId, skill) => {
    await api.acceptMatch(userId, skill)
    alert('Match accepted! Check Chat to connect.')
  }

  return (
    <AppShell>
      <ChatbotWidget />
      <h1 className="mb-2 text-3xl font-bold text-white">Discover Matches</h1>
      <p className="mb-8 text-white/50">Find people to swap skills with</p>

      {loading ? (
        <p className="text-white/40">Loading matches...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m, i) => (
            <motion.div
              key={m.user._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/30 text-lg font-bold text-brand-400">
                {m.user.display_name?.[0]}
              </div>
              <h3 className="text-lg font-semibold text-white">{m.user.display_name}</h3>
              <p className="mt-1 text-sm text-white/50">
                Teaches: {m.user.skills_teach?.join(', ')}
              </p>
              <p className="mt-1 text-sm text-brand-400">
                Can teach you: {m.skill_offered}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-white/60">{m.match_score}% match</span>
                <button
                  type="button"
                  onClick={() => handleMatch(m.user._id, m.skill_offered)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Match
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
