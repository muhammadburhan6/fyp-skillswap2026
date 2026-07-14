import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import RecommendedMatches from '../components/RecommendedMatches'
import api from '../lib/api'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MatchSkeleton() {
  return (
    <div className="dash-glass-inner flex flex-col items-center p-4">
      <div className="h-14 w-14 rounded-full bg-white/10" />
      <div className="mt-3 h-2 w-20 rounded-full bg-white/10" />
      <div className="mt-2 h-2 w-16 rounded-full bg-white/5" />
      <div className="mt-2 h-2 w-24 rounded-full bg-white/5" />
      <div className="mt-4 h-7 w-16 rounded-full bg-sky-400/30" />
    </div>
  )
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  return cells
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  useEffect(() => {
    api.dashboard().then(setData)
  }, [])

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  )

  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const hasMatches = data?.progress?.length > 0
  const hasLessonsToday = data?.has_lessons_today

  const shiftMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  if (!data) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-slate-400">Loading dashboard…</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="dash-glass p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Activity</h2>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300"
              >
                Today
              </button>
            </div>

            {hasLessonsToday ? (
              <div className="space-y-3">
                {data.today_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
                  >
                    Session scheduled · {new Date(session.scheduled_at).toLocaleString()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-lg font-medium text-white">Ready for your first SkillSwap session?</p>
                <p className="mt-2 text-sm text-slate-400">
                  Book a session with a match to start earning XP and skill points.
                </p>
                <Link
                  to="/calendar"
                  className="mt-6 inline-flex rounded-full bg-sky-400 px-6 py-2.5 text-sm font-semibold text-[#0a0e17] transition hover:bg-sky-300"
                >
                  Schedule a session
                </Link>
              </div>
            )}
          </section>

          <section className="dash-glass p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Matches</h2>
              <Link to="/discover" className="text-sm text-slate-400 transition hover:text-sky-300">
                see all
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {hasMatches
                ? data.progress.map((match) => (
                    <div key={match.user_id} className="dash-glass-inner flex flex-col items-center p-4 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/30 text-lg font-bold text-sky-200">
                        {match.name.charAt(0)}
                      </span>
                      <p className="mt-3 text-sm font-medium text-white">{match.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Teaches {match.skill}</p>
                      <span className="mt-4 rounded-full bg-sky-400/20 px-3 py-1 text-xs font-semibold text-sky-300">
                        {match.match_score}%
                      </span>
                    </div>
                  ))
                : [0, 1, 2].map((key) => <MatchSkeleton key={key} />)}
            </div>
          </section>

          <RecommendedMatches />
        </div>

        <section className="dash-glass flex flex-col p-6 lg:min-h-[520px]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-1 text-center text-sm">
            {calendarDays.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />

              const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
              const isSelected = sameDay(cellDate, selectedDate)
              const isToday = sameDay(cellDate, new Date())

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(cellDate)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    isSelected
                      ? 'bg-sky-400 font-semibold text-[#0a0e17] shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                      : isToday
                        ? 'text-sky-300'
                        : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-auto border-t border-white/10 pt-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 9.75h18M4.5 6.75h15a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 20.25V8.25A1.5 1.5 0 014.5 6.75z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white">No lessons on this day</p>
            <p className="mt-1 text-xs text-slate-500">Pick another date or create a session</p>
            <Link
              to="/calendar"
              className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Open calendar →
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
