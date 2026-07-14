import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SkillSwapLogo from '../landing/SkillSwapLogo'
import { useAuthStore } from '../../store/useAuthStore'
import api from '../../lib/api'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/discover', label: 'Matches' },
  { to: '/messenger', label: 'Chat', badge: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/progress', label: 'Progress' },
  { to: '/discover', label: 'Community' },
]

function initials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function notificationLabel(n) {
  const map = {
    match_request: 'New match request',
    match_accepted: 'Your match was accepted',
    session_booked: 'A session was booked',
    session_reminder: 'Upcoming session reminder',
    message: 'New message',
  }
  return map[n.type] || n.type || 'Notification'
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const ref = useRef(null)

  const unread = items.filter((n) => !n.read).length

  const load = () => {
    api.getNotifications()
      .then((d) => setItems(d.notifications || []))
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markOne = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api.markNotificationRead(id)
    } catch {
      load()
    }
  }

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsRead()
    } catch {
      load()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-400 px-1 text-[10px] font-bold text-[#0a0e17]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#121826] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs font-medium text-sky-400 hover:text-sky-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && markOne(n.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                <span className={`flex-1 text-sm ${n.read ? 'text-slate-400' : 'text-white'}`}>
                  {notificationLabel(n)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function navActive(label, pathname) {
  if (label === 'Dashboard') return pathname === '/dashboard'
  if (label === 'Matches') return pathname === '/discover' || pathname === '/matches'
  if (label === 'Chat') return pathname === '/messenger' || pathname === '/chat'
  if (label === 'Calendar') return pathname === '/calendar' || pathname === '/exchange'
  if (label === 'Progress') return pathname === '/progress'
  if (label === 'Community') return pathname === '/discover'
  return false
}

export default function AppShell({ children, title, subtitle }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const points = user?.points_balance ?? 200

  return (
    <div className="dash-shell flex min-h-screen bg-[#0a0e17] text-white">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/5 bg-[#080b12] px-4 py-6">
        <Link to="/dashboard" className="mb-10 flex items-center gap-2 px-2">
          <SkillSwapLogo size="sm" />
        </Link>

        <nav className="space-y-1">
          {navLinks.map((link) => {
            const active = navActive(link.label, location.pathname)
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`relative flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-sky-400 text-[#0a0e17]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-sky-400" />
                )}
              </Link>
            )
          })}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`block rounded-full px-4 py-2.5 text-sm font-medium ${
                location.pathname === '/admin' ? 'bg-sky-400 text-[#0a0e17]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-white/5 px-8 py-4">
          <Link
            to="/wallet"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur-md transition hover:bg-white/10"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/20 text-sky-300">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
            </span>
            <span className="font-semibold text-white">{points} SP</span>
            <span className="text-slate-400">+</span>
          </Link>

          <NotificationBell />

          <div className="group relative">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition hover:bg-white/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">
                {initials(user?.name)}
              </span>
              <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
            <div className="invisible absolute right-0 top-full z-20 mt-2 w-36 rounded-xl border border-white/10 bg-[#121826] py-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
              <Link to="/profile" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                Profile
              </Link>
              <Link to="/settings" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="dash-main relative flex-1 overflow-auto p-8">
          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="page-title">{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
