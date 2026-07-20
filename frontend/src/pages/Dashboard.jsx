import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import DashboardSpPopups from '../components/DashboardSpPopups'
import RecommendedMatches from '../components/RecommendedMatches'
import SessionReview from '../components/SessionReview'
import SkillDemandPanel from '../components/SkillDemandPanel'
import api from '../lib/api'
import { formatLocalDateTime, parseApiDate } from '../lib/dateTime'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MatchSkeleton() {
  return (
    <div className="card flex flex-col items-center p-4">
      <div className="h-14 w-14 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="mt-3 h-2 w-20 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="mt-2 h-2 w-16 animate-pulse rounded-full bg-white/[0.08]" />
    </div>
  )
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const load = () => {
    api.dashboard().then(setData)
  }

  useEffect(() => {
    load()
  }, [])

  const userId = data?.user?.id

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  )
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const hasMatches = data?.progress?.length > 0

  const sessionDates = useMemo(() => {
    const set = new Set()
    for (const session of data?.today_sessions || []) {
      const d = parseApiDate(session.scheduled_at)
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    }
    return set
  }, [data])

  const selectedSessions = useMemo(() => {
    return (data?.today_sessions || []).filter((session) =>
      sameDay(parseApiDate(session.scheduled_at), selectedDate),
    )
  }, [data, selectedDate])

  const shiftMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  if (!data) {
    return (
      <AppShell title="Dashboard" subtitle="Your activity, matches, and schedule">
        <DashboardSpPopups />
        <div className="flex h-64 items-center justify-center text-sm text-mutedForeground">Loading dashboard…</div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Dashboard" subtitle="Your activity, matches, and schedule">
      <DashboardSpPopups />

      <div className="grid gap-6 xl:grid-cols-[1fr_minmax(280px,340px)]">
        <div className="space-y-6">
          <section className="card">
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Activity</h2>
              <span className="badge">Sessions</span>
            </div>
            {data.today_sessions?.length > 0 ? (
              <div className="space-y-3">
                {data.today_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-foreground"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p>
                        {session.skill ? `${session.skill} · ` : ''}
                        {formatLocalDateTime(session.scheduled_at)}
                      </p>
                      <span
                        className={`badge ${
                          session.status === 'completed' ? 'border-accent/40 text-accent' : ''
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    {session.status === 'completed' &&
                      (session.learner_id === userId || session.teacher_id === userId) && (
                      <SessionReview session={session} onSubmitted={load} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-display text-xl text-foreground">Ready for your first Skill/Swap session?</p>
                <p className="mt-2 text-sm text-mutedForeground">
                  Book a session with a match to start earning XP and skill points.
                </p>
                <Link to="/discover" className="btn-primary mt-6 inline-flex text-xs">
                  Find a match →
                </Link>
              </div>
            )}
          </section>

          <section className="card">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Matches</h2>
              <Link to="/discover" className="btn-ghost font-mono text-xs uppercase tracking-widest">
                See all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {hasMatches
                ? data.progress.map((match) => (
                    <div key={match.user_id} className="card p-4 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-display text-lg text-accent">
                        {match.name.charAt(0)}
                      </span>
                      <p className="mt-3 text-sm font-medium text-foreground">{match.name}</p>
                      <p className="mt-1 font-mono text-xs text-mutedForeground">Teaches {match.skill}</p>
                      <span className="badge mt-4 inline-block">{match.match_score}%</span>
                    </div>
                  ))
                : [0, 1, 2].map((key) => <MatchSkeleton key={key} />)}
            </div>
          </section>

          <RecommendedMatches />
          <SkillDemandPanel />
        </div>

        <section className="card flex w-full flex-col overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <h2 className="min-w-0 truncate font-display text-lg font-semibold text-foreground sm:text-xl">
              {monthLabel}
            </h2>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05] font-mono text-sm transition hover:border-white/10 hover:bg-white/[0.08]"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05] font-mono text-sm transition hover:border-white/10 hover:bg-white/[0.08]"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-wider text-mutedForeground sm:text-xs sm:tracking-widest">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex h-8 items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" aria-hidden />
              }

              const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
              const isSelected = sameDay(cellDate, selectedDate)
              const isToday = sameDay(cellDate, new Date())
              const hasSession = sessionDates.has(
                `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`,
              )

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(cellDate)}
                  className={`relative flex aspect-square w-full items-center justify-center rounded-lg border text-sm transition-colors duration-200 ${
                    isSelected
                      ? 'border-accent/50 bg-accent/20 font-semibold text-accent shadow-accent-glow'
                      : isToday
                        ? 'border-accent/30 bg-white/[0.05] text-foreground'
                        : 'border-transparent text-mutedForeground hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-foreground'
                  }`}
                >
                  {day}
                  {hasSession && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 border-t border-white/[0.06] pt-5 text-center">
            {selectedSessions.length > 0 ? (
              <div className="space-y-2 text-left">
                <p className="text-center text-sm font-medium text-foreground">
                  {selectedSessions.length} session{selectedSessions.length > 1 ? 's' : ''} on this day
                </p>
                {selectedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-foreground"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{formatLocalDateTime(session.scheduled_at)}</span>
                      <span
                        className={`font-mono uppercase tracking-wider ${
                          session.status === 'completed' ? 'text-accent' : 'text-mutedForeground'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    {session.skill ? (
                      <p className="mt-1 text-mutedForeground">{session.skill}</p>
                    ) : null}
                    {session.status === 'completed' &&
                      (session.learner_id === userId || session.teacher_id === userId) && (
                      <SessionReview session={session} onSubmitted={load} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">No lessons on this day</p>
                <p className="mt-1 font-mono text-xs text-mutedForeground">
                  Pick another date or create a session
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
