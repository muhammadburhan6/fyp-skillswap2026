import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SkillSwapLogo from '../components/landing/SkillSwapLogo'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'

const MODULES = [
  { id: 'users', title: 'User Management', desc: 'Verify, suspend, or permanently delete accounts.', icon: '👥' },
  { id: 'disputes', title: 'Dispute Resolution', desc: 'Review fraud reports and close open disputes.', icon: '⚖️' },
  { id: 'skills', title: 'Skill Verification & Moderation', desc: 'Approve new skills and remove flagged content.', icon: '✅' },
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

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.skill}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{d.skill}</span>
            <span className="font-mono text-mutedForeground">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const colors = ['#5e6ad2', '#f59e0b', '#ef4444']
  let acc = 0
  const stops = data.map((d, i) => {
    const start = (acc / total) * 100
    acc += d.value
    const end = (acc / total) * 100
    return `${colors[i % colors.length]} ${start}% ${end}%`
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        className="h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
            {d.label}: <span className="font-mono text-mutedForeground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LineChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.swaps, d.disputes]), 1)
  const w = 320
  const h = 120
  const pad = 8
  const toPoints = (key) =>
    data
      .map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2)
        const y = h - pad - (d[key] / max) * (h - pad * 2)
        return `${x},${y}`
      })
      .join(' ')
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md">
        <polyline fill="none" stroke="#5e6ad2" strokeWidth="2.5" points={toPoints('swaps')} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" points={toPoints('disputes')} />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-mutedForeground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Swaps</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Disputes</span>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-mutedForeground">
        {data.map((d) => <span key={d.month}>{d.month}</span>)}
      </div>
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

export default function Admin() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [view, setView] = useState('home')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [disputes, setDisputes] = useState([])
  const [moderation, setModeration] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [userQuery, setUserQuery] = useState('')

  const refresh = async () => {
    try {
      const [s, u, d, m, a] = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
        api.adminDisputes(),
        api.adminModeration(),
        api.adminAnalytics(),
      ])
      setStats(s)
      setUsers(u.users || [])
      setDisputes(d.disputes || [])
      setModeration(m.items || [])
      setAnalytics(a)
      setError('')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load admin data')
    }
  }

  useEffect(() => { refresh() }, [])

  // Server-side user search (611+ users) — debounced.
  useEffect(() => {
    const timer = setTimeout(() => {
      api.adminUsers(userQuery.trim() || undefined)
        .then((u) => setUsers(u.users || []))
        .catch(() => {})
    }, userQuery ? 300 : 0)
    return () => clearTimeout(timer)
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

  const disputeAction = async (id, action) => {
    try {
      await api.adminUpdateDispute(id, { action })
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Dispute action failed')
    }
  }

  const modAction = async (id, action, reason = '') => {
    try {
      await api.adminUpdateModeration(id, { action, reason })
      setRejectId(null)
      setRejectReason('')
      refresh()
    } catch (err) {
      setError(err?.response?.data?.error || 'Moderation action failed')
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
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        {view === 'home' && (
          <>
            <h1 className="page-title">Welcome back, Admin! 👋</h1>
            <p className="page-subtitle">Moderate users, resolve disputes, and keep Skillswap healthy.</p>
            {stats && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Users', stats.total_users],
                  ['Active', stats.active_users],
                  ['Open disputes', stats.open_disputes],
                  ['Pending skills', stats.pending_skills],
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
                {nonAdminUsers.length} user(s)
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

        {view === 'skills' && (
          <>
            <h1 className="page-title">Skill Verification &amp; Moderation</h1>
            <p className="page-subtitle">Queue of newly submitted skills and flagged content.</p>
            <div className="mt-8 space-y-4">
              {moderation.length === 0 && (
                <div className="card p-8 text-center text-mutedForeground">Moderation queue is empty.</div>
              )}
              {moderation.map((item) => (
                <div key={item.id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{item.skill_name}</h3>
                      <p className="mt-1 text-sm text-mutedForeground">
                        by {item.user?.name || 'Unknown'} · {item.category}
                        {item.flagged ? ' · Flagged' : ''}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.status === 'pending' && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => modAction(item.id, 'approve')}>
                        Approve Skill
                      </button>
                      <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => { setRejectId(item.id); setRejectReason('') }}>
                        Reject Skill
                      </button>
                      <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => modAction(item.id, 'remove')}>
                        Remove Inappropriate Content
                      </button>
                      <button type="button" className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10" onClick={() => modAction(item.id, 'shadowban')}>
                        Shadowban User
                      </button>
                    </div>
                  )}
                  {rejectId === item.id && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <label className="text-xs text-mutedForeground">Rejection reason (required)</label>
                      <input className="input-field mt-2" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this skill rejected?" />
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="btn-ghost text-xs" onClick={() => setRejectId(null)}>Cancel</button>
                        <button
                          type="button"
                          className="btn-primary px-3 py-2 text-xs"
                          disabled={!rejectReason.trim()}
                          onClick={() => modAction(item.id, 'reject', rejectReason.trim())}
                        >
                          Confirm reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'analytics' && analytics && (
          <>
            <h1 className="page-title">Analytics &amp; Insights</h1>
            <p className="page-subtitle">Platform demand, user health, and swap outcomes.</p>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="mb-4 font-semibold">Most in-demand skills</h3>
                <BarChart data={analytics.demand || []} />
              </div>
              <div className="card p-6">
                <h3 className="mb-4 font-semibold">Active vs inactive / banned</h3>
                <PieChart data={analytics.users_pie || []} />
              </div>
              <div className="card p-6 lg:col-span-2">
                <h3 className="mb-4 font-semibold">Successful swaps vs disputes</h3>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  {(analytics.swaps_vs_disputes || []).map((x) => (
                    <span key={x.label} className="badge">{x.label}: {x.value}</span>
                  ))}
                </div>
                <LineChart data={analytics.timeline || []} />
              </div>
            </div>
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
