import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../components/layout/AppShell'
import ChatbotWidget from '../components/ai/ChatbotWidget'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Exchange() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState({
    skill: 'Video Editing',
    title: 'SkillSwap Session',
    scheduled_at: '',
    guest_id: '',
    duration_minutes: 60,
  })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.myMatches().then((d) => setMatches(d.matches))
    api.getSessions().then((d) => setSessions(d.sessions))
  }, [])

  const handleSchedule = async (e) => {
    e.preventDefault()
    try {
      await api.createSession({
        ...form,
        host_id: user._id,
        heart_tokens_cost: 10,
      })
      setMsg('Session scheduled! 10 Heart Tokens spent.')
      const d = await api.getSessions()
      setSessions(d.sessions)
    } catch (err) {
      setMsg(err.message)
    }
  }

  const handleComplete = async (id) => {
    const d = await api.completeSession(id)
    setMsg(`Session completed! +${d.xp_gained} XP`)
    const s = await api.getSessions()
    setSessions(s.sessions)
  }

  return (
    <AppShell>
      <ChatbotWidget />
      <h1 className="mb-2 text-3xl font-bold text-white">Exchange</h1>
      <p className="mb-8 text-white/50">Schedule and run your skill swap sessions</p>

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSchedule} className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Schedule a Session</h2>

          <input className="input-field" placeholder="Skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
          <input className="input-field" placeholder="Session title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <select
            className="input-field"
            value={form.guest_id}
            onChange={(e) => setForm({ ...form, guest_id: e.target.value })}
            required
          >
            <option value="">Select match partner</option>
            {matches.map((m) => (
              <option key={m.other_user?._id} value={m.other_user?._id}>
                {m.other_user?.display_name}
              </option>
            ))}
          </select>

          <input
            className="input-field"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            required
          />

          <button type="submit" className="btn-primary w-full">Schedule (10 ♥ tokens)</button>
          {msg && <p className="text-sm text-brand-400">{msg}</p>}
        </motion.form>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-white/40">No sessions yet</p>
          ) : (
            sessions.map((s) => (
              <div key={s._id} className="card">
                <h3 className="font-medium text-white">{s.title}</h3>
                <p className="text-sm text-white/50">{s.skill} · {s.status}</p>
                <p className="text-xs text-white/30">{s.scheduled_at}</p>
                {s.status === 'scheduled' && (
                  <button type="button" onClick={() => handleComplete(s._id)} className="btn-outline mt-3 px-4 py-2 text-sm">
                    Complete Session (+XP)
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
