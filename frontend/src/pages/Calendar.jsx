import { useEffect, useState } from 'react'

import AppShell from '../components/layout/AppShell'

import LearningPath from '../components/LearningPath'

import api from '../lib/api'

import { useAuthStore } from '../store/useAuthStore'



function SessionReview({ session }) {

  const [rating, setRating] = useState(0)

  const [comment, setComment] = useState('')

  const [status, setStatus] = useState('idle') // idle | submitting | done | error

  const [errorMsg, setErrorMsg] = useState('')



  if (status === 'done') {

    return <p className="mt-3 text-sm text-mutedForeground">Thanks for your feedback!</p>

  }



  const submit = async () => {

    if (!rating) return

    setStatus('submitting')

    try {

      await api.submitReview(session.id, rating, comment)

      setStatus('done')

    } catch (err) {

      setStatus('error')

      setErrorMsg(err?.response?.data?.error || 'Could not submit review')

    }

  }



  return (

    <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">

      <p className="text-sm text-foreground">Rate this session</p>

      <div className="flex gap-1">

        {[1, 2, 3, 4, 5].map((n) => (

          <button

            key={n}

            type="button"

            onClick={() => setRating(n)}

            aria-label={`${n} star${n > 1 ? 's' : ''}`}

            className={`text-lg ${n <= rating ? 'text-accent' : 'text-mutedForeground'}`}

          >

            ★

          </button>

        ))}

      </div>

      <input

        className="input-field"

        placeholder="Optional comment"

        value={comment}

        onChange={(e) => setComment(e.target.value)}

      />

      <button

        type="button"

        onClick={submit}

        disabled={!rating || status === 'submitting'}

        className="btn-outline px-4 py-2 text-sm disabled:opacity-50"

      >

        {status === 'submitting' ? 'Submitting…' : 'Submit review'}

      </button>

      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

    </div>

  )

}



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

          <h2 className="font-display font-semibold text-foreground">Schedule a session</h2>

          <input className="input-field" placeholder="Skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />

          <input className="input-field" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />

          <input className="input-field" placeholder="Partner user ID" value={form.learner_id} onChange={(e) => setForm({ ...form, learner_id: e.target.value })} />

          <input className="input-field" placeholder="Zoom / Meet link" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />

          <button type="submit" className="btn-primary w-full">Book session (10 pts)</button>

        </form>

        <div className="space-y-3">

          <h2 className="font-display font-semibold text-foreground">Upcoming sessions</h2>

          {sessions.map((s) => (

            <div key={s.id} className="card">

              <p className="font-medium text-foreground">{s.skill} · {s.status}</p>

              <p className="text-sm text-mutedForeground">{s.scheduled_at}</p>

              {s.status === 'scheduled' && (

                <button type="button" onClick={() => complete(s.id)} className="btn-outline mt-3 px-4 py-2 text-sm">

                  Mark complete

                </button>

              )}

              {(s.status === 'scheduled' || s.has_learning_path) && (

                <LearningPath sessionId={s.id} hasExisting={s.has_learning_path} />

              )}

              {s.status === 'completed' && s.learner_id === user.id && (

                <SessionReview session={s} />

              )}

            </div>

          ))}

          {!sessions.length && <p className="text-sm text-mutedForeground">No sessions scheduled yet</p>}

        </div>

      </div>

    </AppShell>

  )

}


