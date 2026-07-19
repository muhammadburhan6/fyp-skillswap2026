import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import LearningPath from '../components/LearningPath'
import SessionReview from '../components/SessionReview'
import api from '../lib/api'
import { formatLocalDateTime, localInputToISO } from '../lib/dateTime'
import { useAuthStore } from '../store/useAuthStore'

function MeetingLinkControl({ session, userId, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [link, setLink] = useState(session.meeting_link || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isTeacher = session.teacher_id === userId

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api.updateSession(session.id, { meeting_link: link.trim() })
      setEditing(false)
      onUpdated()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save meeting link')
    } finally {
      setSaving(false)
    }
  }

  if (session.meeting_link && !editing) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={session.meeting_link}
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-4 py-2 text-sm"
        >
          Join session
        </a>
        {isTeacher && (
          <button type="button" onClick={() => setEditing(true)} className="btn-outline px-4 py-2 text-sm">
            Edit meeting link
          </button>
        )}
      </div>
    )
  }

  if (!isTeacher) {
    return <p className="mt-3 text-sm text-mutedForeground">The teacher will add the meeting link before the session.</p>
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="btn-outline mt-3 px-4 py-2 text-sm">
        Add Zoom / Meet link
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <input
        className="input-field"
        type="url"
        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || !link.trim()} className="btn-primary px-4 py-2 text-sm">
          {saving ? 'Saving…' : 'Save link'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn-outline px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Calendar() {
  const { user } = useAuthStore()
  const [sessions, setSessions] = useState([])
  const [partners, setPartners] = useState([])
  const [form, setForm] = useState({ teacher_id: '', skill: '', scheduled_at: '' })
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const paymentStatus = searchParams.get('payment')

  const load = () => api.getSessions().then((d) => setSessions(d.sessions))

  useEffect(() => {
    load()
    api.getConversations()
      .then((d) => setPartners((d.conversations || []).map((c) => c.other_user).filter(Boolean)))
      .catch(() => {})
  }, [])

  // Auto-dismiss the payment banner after 6 seconds
  useEffect(() => {
    if (!paymentStatus) return
    const t = setTimeout(() => {
      setSearchParams({}, { replace: true })
    }, 6000)
    return () => clearTimeout(t)
  }, [paymentStatus, setSearchParams])

  const schedule = async (e) => {
    e.preventDefault()
    setBooking(true)
    setBookingError('')
    try {
      await api.createSession({
        ...form,
        scheduled_at: localInputToISO(form.scheduled_at),
      })
      setForm({ teacher_id: '', skill: '', scheduled_at: '' })
      setBookingSuccess('Swap session booked. Your partner has been notified.')
      setTimeout(() => setBookingSuccess(''), 5000)
      load()
    } catch (err) {
      setBookingError(err?.response?.data?.error || 'Could not book the session')
    } finally {
      setBooking(false)
    }
  }

  const complete = async (id) => {
    await api.updateSession(id, { status: 'completed' })
    load()
  }

  const selectedPartner = partners.find((p) => p.id === Number(form.teacher_id))
  const availableSkills = selectedPartner?.skills_teach || []

  return (
    <AppShell title="Sessions" subtitle="Manage your upcoming paid and skill-swap sessions">
      {paymentStatus === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <span className="text-emerald-300">✓</span>
          <p className="text-sm text-emerald-300 font-medium">
            Payment confirmed — your session is booked! It will appear in the list below.
          </p>
        </div>
      )}
      {paymentStatus === 'cancel' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-sm text-mutedForeground">Payment cancelled — your card was not charged.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={schedule} className="card space-y-4">
          <div>
            <h2 className="font-display font-semibold text-foreground">Book a skill-swap session</h2>
            <p className="mt-1 text-sm text-mutedForeground">Choose an accepted partner and a skill they teach. Booking costs 10 SP.</p>
          </div>

          {partners.length ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-mutedForeground">Learn from</label>
                <select
                  className="input-field"
                  value={form.teacher_id}
                  onChange={(e) => setForm({ teacher_id: e.target.value, skill: '', scheduled_at: form.scheduled_at })}
                  required
                >
                  <option value="">Select a partner…</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-mutedForeground">Skill</label>
                <select
                  className="input-field"
                  value={form.skill}
                  onChange={(e) => setForm({ ...form, skill: e.target.value })}
                  required
                  disabled={!selectedPartner}
                >
                  <option value="">{selectedPartner ? 'Select a skill…' : 'Choose a partner first'}</option>
                  {availableSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-mutedForeground">Date and time</label>
                <input
                  className="input-field"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  required
                />
              </div>

              {bookingError && <p className="text-sm text-red-300">{bookingError}</p>}
              {bookingSuccess && <p className="text-sm text-emerald-300">{bookingSuccess}</p>}
              <button type="submit" disabled={booking} className="btn-primary w-full disabled:opacity-60">
                {booking ? 'Booking…' : 'Book for 10 SP'}
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-sm text-mutedForeground">Accept a match first to schedule a skill-swap session.</p>
              <Link to="/discover" className="mt-3 inline-block text-sm text-accent hover:text-accentBright">
                Find a partner →
              </Link>
            </div>
          )}
        </form>

        <div className="space-y-3">
          <h2 className="font-display font-semibold text-foreground">Upcoming sessions</h2>

          {sessions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{s.skill} · {s.status}</p>
                {s.session_type === 'paid' && (
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                    Paid
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-mutedForeground">
                {s.teacher_id === user.id
                  ? `Teaching ${s.learner_name || 'your learner'}`
                  : `Learning from ${s.teacher_name || 'your teacher'}`}
                {' · '}
                {formatLocalDateTime(s.scheduled_at)}
              </p>

              <MeetingLinkControl session={s} userId={user.id} onUpdated={load} />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  to={`/materials?partner=${s.teacher_id === user.id ? s.learner_id : s.teacher_id}`}
                  className="text-sm text-accent hover:text-accentBright"
                >
                  View materials
                </Link>
              </div>

              {s.status === 'scheduled' && s.teacher_id === user.id && (
                <button type="button" onClick={() => complete(s.id)} className="btn-outline mt-3 px-4 py-2 text-sm">
                  Mark complete
                </button>
              )}

              {(s.status === 'scheduled' || s.has_learning_path) && (
                <LearningPath sessionId={s.id} hasExisting={s.has_learning_path} />
              )}

              {s.status === 'completed' && s.learner_id === user.id && (
                <SessionReview session={s} onSubmitted={load} />
              )}
            </div>
          ))}

          {!sessions.length && <p className="text-sm text-mutedForeground">No sessions scheduled yet</p>}
        </div>
      </div>
    </AppShell>
  )
}
