import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { localInputToISO } from '../lib/dateTime'

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function IncomingRequests({ requests, onAccept, onDecline }) {
  if (!requests.length) return null

  return (
    <section className="card mb-6">
      <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Incoming swap requests</h2>
        <span className="badge">{requests.length}</span>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {requests.map((r) => (
          <div key={r.match_id} className="flex flex-wrap items-center gap-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-mono text-xs text-accent">
              {initials(r.user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{r.user.name}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-mutedForeground">
                Teaches: {r.user.skills_teach?.join(', ') || '—'}
              </p>
            </div>
            <span className="badge">{Math.round(r.match_score)}%</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => onAccept(r)} className="btn-primary px-4 py-2 text-xs">
                Accept
              </button>
              <button type="button" onClick={() => onDecline(r)} className="btn-outline px-4 py-2 text-xs">
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BookPaidModal({ match, onClose }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const skill = match.skill_offered || ''
  const teacherId = match.user.id
  const price = match.price_usd

  const book = async (e) => {
    e.preventDefault()
    if (!scheduledAt) {
      setError('Please select a date and time')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { checkout_url } = await api.createCheckout({
        teacher_id: teacherId,
        skill,
        scheduled_at: localInputToISO(scheduledAt),
      })
      window.location.href = checkout_url
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-backgroundElevated p-6 shadow-card-hover"
      >
        <h3 className="font-display text-xl font-semibold text-foreground">Book paid session</h3>
        <p className="mt-1 text-sm text-mutedForeground">
          {skill} with <span className="text-foreground">{match.user.name}</span>
        </p>

        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-sm text-mutedForeground">Session price</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-300">${price?.toFixed(2)}</p>
          <p className="mt-0.5 text-xs text-mutedForeground">10% platform fee included · secure via Stripe</p>
        </div>

        <form onSubmit={book} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-mutedForeground">Session date &amp; time</label>
            <input
              type="datetime-local"
              className="input-field"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Redirecting to Stripe…' : `Pay $${price?.toFixed(2)} →`}
            </button>
            <button type="button" onClick={onClose} className="btn-outline px-4">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Discover() {
  const [matches, setMatches] = useState([])
  const [requests, setRequests] = useState([])
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('skill') || '')
  const [sentTo, setSentTo] = useState(() => new Set())
  const [feedback, setFeedback] = useState('')
  const [teacherPricing, setTeacherPricing] = useState({})
  const [bookingMatch, setBookingMatch] = useState(null)

  useEffect(() => {
    api.getMatchRequests().then((d) => setRequests(d.requests || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      api.discoverMatches(query.trim() || undefined)
        .then(async (d) => {
          const list = d.matches || []
          setMatches(list)

          // Fetch pricing for all unique teachers in parallel
          const uniqueTeacherIds = [...new Set(list.map((m) => m.user.id))]
          const results = await Promise.allSettled(
            uniqueTeacherIds.map((id) => api.getTeacherPricing(id).then((p) => ({ id, pricing: p.pricing || [] })))
          )
          const map = {}
          results.forEach((r) => {
            if (r.status === 'fulfilled') {
              map[r.value.id] = r.value.pricing
            }
          })
          setTeacherPricing(map)
        })
        .catch(() => {})
    }, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  const getPriceForMatch = (match) => {
    const teacherId = match.user.id
    const skill = (match.skill_offered || '').trim()
    const teacherPrices = teacherPricing[teacherId] || []
    return teacherPrices.find(
      (p) => p.is_active && (p.skill || '').trim().toLowerCase() === skill.toLowerCase()
    ) || null
  }

  const paidMatchCount = matches.filter((m) => getPriceForMatch(m)).length

  const sendRequest = async (userId) => {
    try {
      await api.requestMatch(userId)
      setSentTo((prev) => new Set(prev).add(userId))
      setFeedback('Swap request sent — they will be notified.')
      setTimeout(() => setFeedback(''), 4000)
    } catch {
      setFeedback('Could not send request. Try again.')
      setTimeout(() => setFeedback(''), 4000)
    }
  }

  const acceptRequest = async (r) => {
    await api.acceptMatch(r.user.id)
    setRequests((prev) => prev.filter((x) => x.match_id !== r.match_id))
    setFeedback(`You are now matched with ${r.user.name} — a chat has been opened.`)
    setTimeout(() => setFeedback(''), 5000)
  }

  const declineRequest = async (r) => {
    await api.declineMatch(r.user.id)
    setRequests((prev) => prev.filter((x) => x.match_id !== r.match_id))
  }

  return (
    <AppShell title="Matches" subtitle="AI-scored partners based on complementary skills">
      {bookingMatch && (
        <BookPaidModal match={bookingMatch} onClose={() => setBookingMatch(null)} />
      )}

      <IncomingRequests requests={requests} onAccept={acceptRequest} onDecline={declineRequest} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          className="input-field max-w-md flex-1"
          placeholder="Search by skill or name (e.g. Python, Video Editing)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {feedback && <p className="text-sm text-accent">{feedback}</p>}
      </div>

      {matches.length > 0 && paidMatchCount === 0 && (
        <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-mutedForeground">
          No paid sessions in these results yet. Teachers can enable Stripe booking from{' '}
          <a href="/profile" className="text-emerald-300 hover:text-emerald-200">Profile → Teaching Rates</a>.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const priceEntry = getPriceForMatch(m)
          return (
            <div key={m.user.id} className="card flex flex-col">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-display text-lg text-accent">
                  {m.user.name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold text-foreground">{m.user.name}</h3>
                  <p className="mt-1 text-sm text-mutedForeground">Teaches: {m.user.skills_teach?.join(', ')}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className="text-sm text-foreground">
                  Can teach you: <span className="text-accent">{m.skill_offered}</span>
                </p>
                {priceEntry && (
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-300">
                    ${priceEntry.price_usd.toFixed(2)} / session
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge">{m.match_score}% match</span>
                  {m.is_reciprocal && <span className="badge">Reciprocal</span>}
                  {m.review_count > 0 && m.average_rating != null && (
                    <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">
                      {m.rating_scope === 'skill' ? `${m.rating_skill} ` : ''}
                      ★ {m.average_rating} ({m.review_count})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {sentTo.has(m.user.id) ? (
                    <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Request sent ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendRequest(m.user.id)}
                      className="btn-outline px-4 py-2 text-xs"
                    >
                      Request swap
                    </button>
                  )}
                  {priceEntry && (
                    <button
                      type="button"
                      onClick={() => setBookingMatch({ ...m, price_usd: priceEntry.price_usd })}
                      className="btn-primary px-4 py-2 text-xs"
                    >
                      Book paid →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!matches.length && (
          <div className="card col-span-full py-16 text-center text-mutedForeground">
            {query ? `No matches found for "${query}".` : 'No matches yet. Complete your profile to get better recommendations.'}
          </div>
        )}
      </div>
    </AppShell>
  )
}
