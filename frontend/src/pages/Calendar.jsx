import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import LearningPath from '../components/LearningPath'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Calendar() {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState({ skill: 'Python', scheduled_at: '', learner_id: '', meeting_link: '' })

  const load = () => api.getSessions().then((d) => setSessions(d.sessions))
  useEffect(() => {
    load()
  }, [])

  const schedule = async (e) => {
    e.preventDefault()
    await api.createSession({ ...form, teacher_id: user.id, points_cost: 10 })
    load()
  }

  const complete = async (id) => {
    await api.updateSession(id, { status: 'completed' })
    load()
  }

  return (
    <AppShell title="Calendar" subtitle="Schedule and manage your skill swap sessions">
      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={schedule} className="card space-y-4">
          <h2 className="font-semibold text-white">Schedule a session</h2>
          <input className="input-field" placeholder="Skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
          <input className="input-field" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />
          <input className="input-field" placeholder="Partner user ID" value={form.learner_id} onChange={(e) => setForm({ ...form, learner_id: e.target.value })} />
          <input className="input-field" placeholder="Zoom / Meet link" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Book session (10 pts)</button>
        </form>
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Upcoming sessions</h2>
          {sessions.map((s) => (
            <div key={s.id} className="card">
              <p className="font-medium text-white">{s.skill} · {s.status}</p>
              <p className="text-sm text-slate-400">{s.scheduled_at}</p>
              {s.status === 'scheduled' && (
                <button type="button" onClick={() => complete(s.id)} className="btn-outline mt-3 px-4 py-2 text-sm">
                  Mark complete
                </button>
              )}
              {(s.status === 'scheduled' || s.has_learning_path) && (
                <LearningPath sessionId={s.id} hasExisting={s.has_learning_path} />
              )}
            </div>
          ))}
          {!sessions.length && <p className="text-slate-500">No sessions scheduled yet</p>}
        </div>
      </div>
    </AppShell>
  )
}
