import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function reasonLabel(reason) {
  const map = {
    daily_login_bonus: 'Daily login',
    signup_bonus: 'Signup gift',
    teach_session: 'Teaching',
    session_booking: 'Session booking',
  }
  return map[reason] || reason
}

export default function PointsCalendar({ streak = 0 }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState(null)
  const [hoverDay, setHoverDay] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getPointsCalendar(year, month)
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year, month])

  const leadingBlanks = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month])

  const trailingBlanks = useMemo(() => {
    const total = leadingBlanks + (data?.days?.length || 0)
    return total % 7 === 0 ? 0 : 7 - (total % 7)
  }, [leadingBlanks, data])

  const shiftMonth = (delta) => {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMonth(m)
    setYear(y)
    setHoverDay(null)
  }

  const todayIso = data?.today
  const days = data?.days || []

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-foreground">Points calendar</h2>
          <p className="mt-1 text-sm text-mutedForeground">
            {streak > 0 ? `${streak}-day streak` : 'Visit Dashboard every 24h for +100 SP'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05] font-mono text-sm transition hover:bg-white/[0.08]"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="min-w-[9.5rem] text-center font-mono text-xs uppercase tracking-widest text-foreground">
            {MONTHS[month - 1]} {year}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05] font-mono text-sm transition hover:bg-white/[0.08]"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-widest text-mutedForeground sm:gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex h-8 items-center justify-center py-1">{d}</div>
        ))}
      </div>

      <div className="relative mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {loading && (
          <div className="col-span-7 py-10 text-center text-sm text-mutedForeground">Loading…</div>
        )}

        {!loading && [...Array(leadingBlanks)].map((_, i) => (
          <div key={`b-${i}`} className="aspect-square" aria-hidden />
        ))}

        {!loading && days.map((d) => {
          const isToday = d.date === todayIso
          const active = d.has_activity || d.has_daily_bonus
          const isBonus = d.has_daily_bonus

          return (
            <button
              key={d.date}
              type="button"
              onMouseEnter={() => setHoverDay(d)}
              onMouseLeave={() => setHoverDay(null)}
              onFocus={() => setHoverDay(d)}
              onBlur={() => setHoverDay(null)}
              className={`relative flex aspect-square w-full items-center justify-center rounded-lg border text-xs transition-all duration-200 ${
                isToday ? 'border-accent/40 ring-1 ring-accent/20' : 'border-white/[0.06]'
              } ${
                isBonus
                  ? 'bg-accent/25 text-accent shadow-accent-glow'
                  : active
                    ? 'bg-accent/15 text-accent'
                    : 'bg-white/[0.03] text-mutedForeground hover:border-white/10 hover:bg-white/[0.06] hover:text-foreground'
              }`}
            >
              <span className="font-medium">{d.day}</span>
              {(active || isBonus) && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </button>
          )
        })}

        {!loading && [...Array(trailingBlanks)].map((_, i) => (
          <div key={`t-${i}`} className="aspect-square" aria-hidden />
        ))}
      </div>

      {hoverDay && (hoverDay.has_activity || hoverDay.earned || hoverDay.spent) && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-backgroundElevated px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">{hoverDay.date}</p>
          <p className="mt-2 text-sm text-foreground">
            {hoverDay.earned > 0 && <span className="text-accent">+{hoverDay.earned} SP earned</span>}
            {hoverDay.earned > 0 && hoverDay.spent < 0 && ' · '}
            {hoverDay.spent < 0 && <span>{hoverDay.spent} SP spent</span>}
          </p>
          {hoverDay.reasons?.length > 0 && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mutedForeground">
              {hoverDay.reasons.map(reasonLabel).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
