import { useEffect, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

import AppShell from '../components/layout/AppShell'

import api from '../lib/api'



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



export default function Discover() {

  const [matches, setMatches] = useState([])

  const [requests, setRequests] = useState([])

  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState(() => searchParams.get('skill') || '')

  const [sentTo, setSentTo] = useState(() => new Set())

  const [feedback, setFeedback] = useState('')



  useEffect(() => {

    api.getMatchRequests().then((d) => setRequests(d.requests || [])).catch(() => {})

  }, [])



  // Server-side skill search across ALL users (debounced), so any skill
  // typed here or passed via ?skill= finds its teachers.

  useEffect(() => {

    const timer = setTimeout(() => {

      api.discoverMatches(query.trim() || undefined).then((d) => setMatches(d.matches)).catch(() => {})

    }, query ? 300 : 0)

    return () => clearTimeout(timer)

  }, [query])



  const filtered = matches



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



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {filtered.map((m) => (

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

            <p className="mt-4 text-sm text-foreground">

              Can teach you: <span className="text-accent">{m.skill_offered}</span>

            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">

              <div className="flex flex-wrap items-center gap-2">

                <span className="badge">{m.match_score}% match</span>

                {m.is_reciprocal && <span className="badge">Reciprocal</span>}

              </div>

              {sentTo.has(m.user.id) ? (

                <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Request sent ✓</span>

              ) : (

                <button type="button" onClick={() => sendRequest(m.user.id)} className="btn-primary px-4 py-2 text-xs">

                  Request →

                </button>

              )}

            </div>

          </div>

        ))}

        {!filtered.length && (

          <div className="card col-span-full py-16 text-center text-mutedForeground">

            {query ? `No matches found for "${query}".` : 'No matches yet. Complete your profile to get better recommendations.'}

          </div>

        )}

      </div>

    </AppShell>

  )

}
