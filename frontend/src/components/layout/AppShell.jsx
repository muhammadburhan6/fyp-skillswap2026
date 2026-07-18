import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SkillSwapLogo from '../landing/SkillSwapLogo'
import { useAuthStore } from '../../store/useAuthStore'
import api from '../../lib/api'
import ChatbotWidget from '../ai/ChatbotWidget'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/discover', label: 'Matches' },
  { to: '/messenger', label: 'Chat', badge: true },
  { to: '/progress', label: 'Progress' },
  { to: '/wallet', label: 'Wallet' },
]

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function notificationLabel(n) {
  const map = {
    match_request: 'New match request',
    match_accepted: 'Your match was accepted',
    match_declined: 'Your match request was declined',
    points_granted: 'Bonus Skill Points added by admin',
    account_warning: 'Account notice from moderation team',
    session_booked: 'A session was booked',
    session_completed: 'A session was completed',
    session_reminder: 'Upcoming session reminder',
    message: 'New message',
  }
  return map[n.type] || n.type || 'Notification'
}

// Where each notification type should take the user when clicked.
const NOTIFICATION_ROUTES = {
  message: '/messenger',
  match_request: '/discover',
  match_accepted: '/messenger',
  match_declined: '/discover',
  session_booked: '/calendar',
  session_completed: '/calendar',
  session_reminder: '/calendar',
  points_granted: '/wallet',
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const ref = useRef(null)
  const navigate = useNavigate()
  const unread = items.filter((n) => !n.read).length

  const load = () => {
    api.getNotifications().then((d) => setItems(d.notifications || [])).catch(() => {})
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
    try { await api.markNotificationRead(id) } catch { load() }
  }

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try { await api.markAllNotificationsRead() } catch { load() }
  }

  const openNotification = (n) => {
    if (!n.read) markOne(n.id)
    setOpen(false)
    const to = NOTIFICATION_ROUTES[n.type]
    if (to) navigate(to)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] transition duration-200 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] text-white shadow-accent-glow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/[0.06] bg-backgroundElevated shadow-card-hover backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-accent hover:text-accentBright">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-mutedForeground">No notifications</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition duration-200 hover:bg-white/[0.05] ${n.read ? 'opacity-60' : ''}`}
              >
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                <span className="flex-1 text-sm">{notificationLabel(n)}</span>
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
  if (label === 'Progress') return pathname === '/progress'
  if (label === 'Wallet') return pathname === '/wallet'
  return false
}

function SidebarNav({ links, pathname, onNavigate }) {
  const { user } = useAuthStore()

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const active = navActive(link.label, pathname)
        return (
          <Link
            key={link.label}
            to={link.to}
            onClick={onNavigate}
            className={`relative flex items-center ${
              active ? 'nav-link-active' : 'nav-link'
            }`}
          >
            {link.label}
            {link.badge && !active && (
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />
            )}
          </Link>
        )
      })}
      {user?.role === 'admin' && (
        <Link
          to="/admin"
          onClick={onNavigate}
          className={pathname === '/admin' ? 'nav-link-active block' : 'nav-link block'}
        >
          Admin
        </Link>
      )}
    </nav>
  )
}

export default function AppShell({ children, title, subtitle }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const points = user?.points_balance ?? 200

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="dash-shell relative flex min-h-screen">
      {sidebarOpen && (
        <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-[#050506]/80 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] bg-backgroundElevated/95 px-4 py-6 backdrop-blur-xl transition-transform duration-300 ease-expo lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/dashboard" className="mb-10 flex items-center gap-3 px-2" onClick={closeSidebar}>
          <SkillSwapLogo size="sm" />
          <span className="text-xl font-semibold tracking-tight">Skill/Swap</span>
        </Link>
        <SidebarNav links={navLinks} pathname={location.pathname} onNavigate={closeSidebar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-backgroundBase/80 px-4 py-3 backdrop-blur-xl sm:justify-end sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] lg:hidden"
            aria-label="Open menu"
          >
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
            <Link
              to="/wallet"
              className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-xs text-[#c7cbf5] transition duration-200 hover:bg-accent/20 sm:px-4"
            >
              <span className="font-semibold">{points} SP</span>
            </Link>
            <NotificationBell />
            <div className="group relative">
              <Link to="/profile" className="flex max-w-[160px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition duration-200 hover:bg-white/[0.05] sm:max-w-none sm:gap-3 sm:pr-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/20 font-mono text-xs text-[#c7cbf5]">
                  {initials(user?.name)}
                </span>
                <span className="hidden truncate text-sm sm:inline">{user?.name || 'User'}</span>
              </Link>
              <div className="invisible absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-white/[0.06] bg-backgroundElevated py-1 opacity-0 shadow-card transition duration-200 group-hover:visible group-hover:opacity-100">
                <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-white/[0.05]">Profile</Link>
                <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-white/[0.05]">Settings</Link>
                <button type="button" onClick={logout} className="block w-full px-4 py-2 text-left text-sm hover:bg-white/[0.05]">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="dash-main relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="page-container">
            {(title || subtitle) && (
              <div className="mb-8 border-b border-white/[0.06] pb-6 sm:mb-10">
                {title && <h1 className="page-title">{title}</h1>}
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <ChatbotWidget />
    </div>
  )
}
