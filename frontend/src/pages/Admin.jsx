import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import Avatar from '../components/ui/Avatar'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'

const MODULES = [
  { id: 'users', title: 'User Management', desc: 'Verify, suspend, or permanently delete accounts.', icon: '👥' },
  { id: 'reports', title: 'User Reports', desc: 'Review spam, harassment, and user conduct reports.', icon: '🚩' },
  { id: 'disputes', title: 'Dispute Resolution', desc: 'Review fraud reports and close open disputes.', icon: '⚖️' },
  { id: 'analytics', title: 'Analytics', desc: 'Demand, activity, swaps vs disputes.', icon: '📊' },
]

function statusBadge(status) {
  const map = {
    active: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    verified: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    suspended: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    banned: 'text-red-300 border-red-500/30 bg-red-500/10',
    open: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    warned: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
    resolved: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    pending: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    approved: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    rejected: 'text-red-300 border-red-500/30 bg-red-500/10',
    removed: 'text-red-300 border-red-500/30 bg-red-500/10',
    shadowbanned: 'text-red-300 border-red-500/30 bg-red-500/10',
  }
  return map[status] || 'text-mutedForeground border-white/10 bg-white/[0.04]'
}

// Flips true one frame after mount so CSS transitions animate the charts in.
function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return m
}

const CHART_COLORS = ['#5e6ad2', '#f59e0b', '#ef4444']

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function donutArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const large = endAngle - startAngle > 180 ? 1 : 0
  const [x1, y1] = polar(cx, cy, rOuter, startAngle)
  const [x2, y2] = polar(cx, cy, rOuter, endAngle)
  const [x3, y3] = polar(cx, cy, rInner, endAngle)
  const [x4, y4] = polar(cx, cy, rInner, startAngle)
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`
}

function BarChart({ data }) {
  const mounted = useMounted()
  const [active, setActive] = useState(null)
  if (!data.length) return <p className="text-sm text-mutedForeground">No demand data yet.</p>
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const isActive = active === i
        return (
          <div
            key={d.skill}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="-mx-2 cursor-default rounded-md px-2 py-1 transition-colors hover:bg-white/[0.04]"
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className="font-mono text-mutedForeground">{i + 1}.</span>
                <span className={isActive ? 'font-medium text-foreground' : ''}>{d.skill}</span>
              </span>
              <span className={`font-mono ${isActive ? 'text-accent' : 'text-mutedForeground'}`}>{d.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
                style={{
                  width: mounted ? `${(d.count / max) * 100}%` : '0%',
                  opacity: active === null || isActive ? 1 : 0.4,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PieChart({ data }) {
  const mounted = useMounted()
  const [active, setActive] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 80, cy = 80, rOuter = 72, rInner = 46
  let acc = 0
  const segs = data.map((d, i) => {
    const start = total ? (acc / total) * 360 : 0
    acc += d.value
    const end = total ? (acc / total) * 360 : 0
    return { ...d, i, start, end, color: CHART_COLORS[i % CHART_COLORS.length], pct: total ? (d.value / total) * 100 : 0 }
  })
  const nonZero = segs.filter((s) => s.value > 0)
  const focus = active != null ? segs[active] : null
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg
        viewBox="0 0 160 160"
        className="h-40 w-40 shrink-0"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'scale(1)' : 'scale(0.92)', transition: 'opacity .5s, transform .5s' }}
      >
        {nonZero.length === 1 ? (
          <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke={nonZero[0].color} strokeWidth={rOuter - rInner} />
        ) : (
          nonZero.map((s) => (
            <path
              key={s.i}
              d={donutArc(cx, cy, rOuter, rInner, s.start, s.end)}
              fill={s.color}
              onMouseEnter={() => setActive(s.i)}
              onMouseLeave={() => setActive(null)}
              style={{ opacity: active === null || active === s.i ? 1 : 0.35, cursor: 'pointer', transition: 'opacity .2s' }}
            />
          ))
        )}
        <text x={cx} y={cy - 3} textAnchor="middle" className="fill-current text-foreground" style={{ fontSize: 22, fontWeight: 600 }}>
          {focus ? focus.value : total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-current text-mutedForeground" style={{ fontSize: 9, letterSpacing: 1 }}>
          {focus ? `${Math.round(focus.pct)}% ${focus.label}` : 'TOTAL'}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segs.map((s) => (
          <li
            key={s.label}
            onMouseEnter={() => setActive(s.i)}
            onMouseLeave={() => setActive(null)}
            className="-mx-2 flex cursor-default items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-white/[0.04]"
            style={{ opacity: active === null || active === s.i ? 1 : 0.5 }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-foreground">{s.label}</span>
            <span className="font-mono text-mutedForeground">{s.value}</span>
            <span className="font-mono text-[11px] text-mutedForeground">({Math.round(s.pct)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LineChart({ data }) {
  const mounted = useMounted()
  const [hover, setHover] = useState(null)
  if (!data.length) return null
  const w = 560, h = 210, padX = 34, padY = 26
  const max = Math.max(...data.flatMap((d) => [d.swaps, d.disputes]), 1)
  const xAt = (i) => padX + (i / Math.max(data.length - 1, 1)) * (w - padX * 2)
  const yAt = (v) => h - padY - (v / max) * (h - padY * 2)
  const line = (key) => data.map((d, i) => `${xAt(i)},${yAt(d[key])}`).join(' ')
  const area = (key) =>
    `${xAt(0)},${h - padY} ` + data.map((d, i) => `${xAt(i)},${yAt(d[key])}`).join(' ') + ` ${xAt(data.length - 1)},${h - padY}`
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: h - padY - f * (h - padY * 2), v: Math.round(max * f) }))
  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    const step = (w - padX * 2) / Math.max(data.length - 1, 1)
    setHover(Math.max(0, Math.min(data.length - 1, Math.round((x - padX) / step))))
  }
  const drawStyle = { strokeDasharray: 1, strokeDashoffset: mounted ? 0 : 1, transition: 'stroke-dashoffset 1s ease-out' }
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="swapFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5e6ad2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g, i) => (
          <g key={i} className="text-mutedForeground">
            <line x1={padX} y1={g.y} x2={w - padX} y2={g.y} stroke="currentColor" strokeOpacity="0.1" />
            <text x={6} y={g.y + 3} className="fill-current" style={{ fontSize: 9, opacity: 0.7 }}>{g.v}</text>
          </g>
        ))}
        <polygon points={area('swaps')} fill="url(#swapFill)" style={{ opacity: mounted ? 1 : 0, transition: 'opacity .8s' }} />
        <polyline fill="none" stroke="#5e6ad2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" points={line('swaps')} style={drawStyle} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" points={line('disputes')} style={drawStyle} />
        {hover != null && (
          <line x1={xAt(hover)} y1={padY} x2={xAt(hover)} y2={h - padY} stroke="currentColor" strokeOpacity="0.18" className="text-mutedForeground" />
        )}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xAt(i)} cy={yAt(d.swaps)} r={hover === i ? 4.5 : 2.5} fill="#5e6ad2" style={{ transition: 'r .15s' }} />
            <circle cx={xAt(i)} cy={yAt(d.disputes)} r={hover === i ? 4.5 : 2.5} fill="#f59e0b" style={{ transition: 'r .15s' }} />
          </g>
        ))}
      </svg>
      <div className="mt-1 h-5 text-center text-xs">
        {hover != null ? (
          <span className="text-mutedForeground">
            <span className="font-medium text-foreground">{data[hover].month}</span> — <span className="text-accent">Swaps {data[hover].swaps}</span> · <span className="text-amber-400">Disputes {data[hover].disputes}</span>
          </span>
        ) : (
          <span className="text-mutedForeground">Hover the chart to inspect each month</span>
        )}
      </div>
      <div className="mt-1 flex justify-between px-8 font-mono text-[10px] uppercase tracking-widest text-mutedForeground">
        {data.map((d) => <span key={d.month}>{d.month}</span>)}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-mutedForeground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Swaps</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Disputes</span>
      </div>
    </div>
  )
}

function KpiTile({ label, value, sub, accent }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mutedForeground">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mutedForeground">{sub}</p>}
    </div>
  )
}

function DeleteModal({ user, confirmText, setConfirmText, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050506]/80 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md border-red-500/30 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold tracking-tight">⚠️ Delete User Account Permanently?</h2>
        <p className="mt-3 text-sm leading-relaxed text-mutedForeground">
          Are you sure you want to delete <span className="font-medium text-foreground">{user.name}</span>&apos;s account?
          This will permanently remove their profile, skills, and data. This action cannot be undone.
        </p>
        <label className="mt-5 block text-xs font-medium text-mutedForeground">
          Type DELETE to confirm.
        </label>
        <input
          className="input-field mt-2"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoFocus
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onCancel} className="btn-outline flex-1">
            ❌ Cancel
          </button>
          <button
            type="button"
            disabled={confirmText !== 'DELETE' || loading}
            onClick={onConfirm}
            className="flex-1 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/25 disabled:opacity-40"
          >
            {loading ? 'Deleting…' : '🗑️ Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-mutedForeground">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent" aria-hidden />
      <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
    </div>
  )
}

export default function Admin() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  // Each module lives at its own URL (/admin/users, /admin/reports, …) so the
  // browser Back button returns to the module list instead of the login page.
  const { section } = useParams()
  const view = MODULES.some((m) => m.id === section) ? section : 'home'
  const setView = (id) => navigate(id && id !== 'home' ? `/admin/${id}` : '/admin')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [disputes, setDisputes] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [userTotal, setUserTotal] = useState(0)
  // Monotonic id so only the most recent user-search response is applied.
  const searchReqId = useRef(0)

  // Loads the core modules. The user list is owned by the search effect
  // (avoids a duplicate /admin/users fetch + a race on mount), and analytics
  // is loaded separately so its slower AI-backed response never holds up or
  // blanks the rest of the panel.
  const refresh = async () => {
    setAnalyticsLoading(true)
    api.adminAnalytics()
      .then((a) => setAnalytics(a))
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false))
    try {
      const [s, r, d] = await Promise.all([
        api.adminStats(),
        api.adminReports(),
        api.adminDisputes(),
      ])
      setStats(s)
      setReports(r.reports || [])
      setDisputes(d.disputes || [])
      setError('')
    } catch (err) {
      setError(err?.userMessage || err?.response?.data?.error || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // Server-side user search (600+ users) — debounced, with an AbortController
  // plus a request-id guard so out-of-order responses can't overwrite newer
  // results (typing "burhan" no longer shows a stale full list).
  useEffect(() => {
    const reqId = ++searchReqId.current
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setUsersLoading(true)
      api.adminUsers(userQuery.trim() || undefined, { signal: controller.signal })
        .then((u) => {
          if (reqId !== searchReqId.current) return
          setUsers(u.users || [])
          setUserTotal(u.total ?? (u.users?.length || 0))
        })
        .catch((err) => {
          if (reqId !== searchReqId.current) return
          if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return
          setError(err?.userMessage || err?.response?.data?.error || 'Could not load users')
        })
        .finally(() => {
          if (reqId === searchReqId.current) setUsersLoading(false)
        })
    }, userQuery ? 300 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [userQuery])

  const nonAdminUsers = useMemo(() => users.filter((u) => u.role !== 'admin'), [users])

  const handleLogout = () => {
    logout()
    navigate('/auth?mode=admin')
  }

  const setStatus = async (u, status) => {
    try {
      const res = await api.adminUpdateUserStatus(u.id, status)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...res.user } : x)))
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update status')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || confirmText !== 'DELETE') return
    setBusy(true)
    try {
      await api.adminDeleteUser(deleteTarget.id)
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      setUserTotal((t) => Math.max(0, t - 1))
      setDeleteTarget(null)
      setConfirmText('')
      setError('')
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not delete user')
    } finally {
      setBusy(false)
    }
  }

  const reportAction = async (reportId, action, reportedUser) => {
    if (action === 'delete_user') {
      if (reportedUser) {
        setDeleteTarget(reportedUser)
        setConfirmText('')
      }
      return
    }
    try {
      await api.adminUpdateReport(reportId, { action })
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Report action failed')
    }
  }

  const disputeAction = async (id, action) => {
    try {
      await api.adminUpdateDispute(id, { action })
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Dispute action failed')
    }
  }

  return (
    <div className="dash-shell relative min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-backgroundBase/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <SkillSwapLogo size="sm" />
              <span className="font-semibold tracking-tight">Skillswap Admin</span>
            </Link>
            {view !== 'home' && (
              <button type="button" onClick={() => setView('home')} className="btn-ghost text-xs">
                ← Modules
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mutedForeground sm:inline">{user?.email}</span>
            <button type="button" onClick={handleLogout} className="btn-outline px-4 py-2 text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); refresh() }}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading admin data…" />
        ) : (
        <>
        {view === 'home' && (
          <>
            <h1 className="page-title">Welcome back, Admin! 👋</h1>
            <p className="page-subtitle">Moderate users, resolve disputes, and keep Skillswap healthy.</p>
            {stats && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Users', stats.total_users],
                  ['Active', stats.active_users],
                  ['Open reports', stats.open_reports ?? 0],
                  ['Open disputes', stats.open_disputes],
                ].map(([l, v]) => (
                  <div key={l} className="card p-5 text-center">
                    <p className="stat-value">{v}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-mutedForeground">{l}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setView(m.id)}
                  className="card card-hover-invert p-6 text-left transition hover:-translate-y-0.5"
                >
                  <span className="text-2xl" aria-hidden>{m.icon}</span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">{m.title}</h2>
                  <p className="mt-2 text-sm text-mutedForeground">{m.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'users' && (
          <>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Verify, approve, suspend, or permanently delete accounts.</p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <input
                className="input-field max-w-sm flex-1"
                placeholder="Search users by name or email…"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">
                {usersLoading ? 'Searching…' : `${userTotal} user(s)`}
              </span>
            </div>
            <div className="card mt-4 overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nonAdminUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-mutedForeground">
                        {usersLoading
                          ? 'Searching…'
                          : userQuery
                            ? `No users match “${userQuery}”.`
                            : 'No users yet.'}
                      </td>
                    </tr>
                  )}
                  {nonAdminUsers.map((u) => (
                    <tr key={u.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-mutedForeground">{u.email}</td>
                      <td className="px-4 py-3 text-xs text-mutedForeground">
                        {(u.skills || []).slice(0, 3).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadge(u.status)}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-mutedForeground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setStatus(u, 'verified')}>Verify</button>
                          <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setStatus(u, 'active')}>Approve</button>
                          <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setStatus(u, 'suspended')}>Suspend</button>
                          <button
                            type="button"
                            className="rounded-md border border-red-500/30 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                            onClick={() => { setDeleteTarget(u); setConfirmText('') }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === 'reports' && (
          <>
            <h1 className="page-title">User Reports &amp; Moderation</h1>
            <p className="page-subtitle">Review reports of spam, harassment, or inappropriate user conduct.</p>
            <div className="mt-8 space-y-4">
              {reports.length === 0 && (
                <div className="card p-8 text-center text-mutedForeground">No user reports submitted yet.</div>
              )}
              {reports.map((r) => (
                <div key={r.id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        user={r.reported_user}
                        className="h-10 w-10 shrink-0 rounded-full border border-accent/30 bg-accent/15 font-display text-sm text-accent"
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          Reported User: <span className="text-foreground">{r.reported_user?.name || 'Deleted User'}</span>
                          {r.reported_user?.email ? ` (${r.reported_user.email})` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-mutedForeground">
                          Reported by <span className="text-foreground">{r.reporter?.name || 'Unknown'}</span> ·{' '}
                          {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.reported_user?.status && (
                        <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadge(r.reported_user.status)}`}>
                          User: {r.reported_user.status}
                        </span>
                      )}
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadge(r.status)}`}>
                        Report: {r.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-mutedForeground">
                      Reason: <span className="font-semibold text-amber-300">{r.reason}</span>
                    </p>
                    {r.details && (
                      <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-foreground">
                        {r.details}
                      </p>
                    )}
                  </div>

                  {r.status === 'open' && (
                    <div className="mt-5 flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        className="btn-outline px-3 py-2 text-xs"
                        onClick={() => reportAction(r.id, 'dismiss')}
                      >
                        Dismiss Report
                      </button>
                      <button
                        type="button"
                        className="btn-outline px-3 py-2 text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => reportAction(r.id, 'suspend_user')}
                      >
                        Suspend User
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                        onClick={() => reportAction(r.id, 'delete_user', r.reported_user)}
                      >
                        Delete User
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'disputes' && (
          <>
            <h1 className="page-title">Dispute Resolution</h1>
            <p className="page-subtitle">Open disputes and fraud reports between skill partners.</p>
            <div className="mt-8 space-y-4">
              {disputes.length === 0 && (
                <div className="card p-8 text-center text-mutedForeground">No disputes right now.</div>
              )}
              {disputes.map((d) => (
                <div key={d.id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {d.user_a?.name || 'User A'} ↔ {d.user_b?.name || 'User B'}
                      </p>
                      <p className="mt-1 text-sm text-mutedForeground">Skill: <span className="text-accent">{d.skill}</span></p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-foreground">{d.complaint}</p>
                  {d.status === 'open' && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => alert('Chat/proof viewer coming soon — open Messenger for related users.')}>
                        View Chat/Proof
                      </button>
                      <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => disputeAction(d.id, 'warn')}>
                        Issue Warning
                      </button>
                      <button type="button" className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10" onClick={() => disputeAction(d.id, 'ban')}>
                        Ban Offender
                      </button>
                      <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => disputeAction(d.id, 'resolve')}>
                        Resolve &amp; Close
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'analytics' && (
          <>
            <h1 className="page-title">Analytics &amp; Insights</h1>
            <p className="page-subtitle">Platform demand, user health, and swap outcomes.</p>
            {analyticsLoading ? (
              <Spinner label="Crunching analytics…" />
            ) : analytics ? (
              (() => {
                const pie = analytics.users_pie || []
                const totalUsers = pie.reduce((s, d) => s + d.value, 0)
                const activeUsers = pie.find((d) => d.label === 'Active')?.value || 0
                const svd = analytics.swaps_vs_disputes || []
                const swaps = svd.find((x) => /swap/i.test(x.label))?.value || 0
                const disputes = svd.find((x) => /dispute/i.test(x.label))?.value || 0
                const activeRate = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0
                const disputeRate = swaps + disputes ? Math.round((disputes / (swaps + disputes)) * 100) : 0
                const topSkill = (analytics.demand || [])[0]
                return (
                  <div className="mt-8 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <KpiTile label="Total users" value={totalUsers} sub={`${activeRate}% active`} />
                      <KpiTile label="Completed swaps" value={swaps} accent />
                      <KpiTile label="Dispute rate" value={`${disputeRate}%`} sub={`${disputes} open/total disputes`} />
                      <KpiTile label="Top skill" value={topSkill?.skill || '—'} sub={topSkill ? `${topSkill.count} learners` : ''} />
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="card p-6">
                        <h3 className="mb-4 font-semibold">Most in-demand skills</h3>
                        <BarChart data={analytics.demand || []} />
                      </div>
                      <div className="card p-6">
                        <h3 className="mb-4 font-semibold">Active vs inactive / banned</h3>
                        <PieChart data={pie} />
                      </div>
                      <div className="card p-6 lg:col-span-2">
                        <h3 className="mb-1 font-semibold">Successful swaps vs disputes</h3>
                        <p className="mb-4 text-xs text-mutedForeground">Monthly trend over the last 6 months.</p>
                        <LineChart data={analytics.timeline || []} />
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="card mt-8 p-8 text-center text-mutedForeground">
                Couldn&apos;t load analytics.{' '}
                <button type="button" onClick={() => refresh()} className="text-accent underline">
                  Retry
                </button>
              </div>
            )}
          </>
        )}
        </>
        )}
      </main>

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          onCancel={() => { setDeleteTarget(null); setConfirmText('') }}
          onConfirm={confirmDelete}
          loading={busy}
        />
      )}
    </div>
  )
}
