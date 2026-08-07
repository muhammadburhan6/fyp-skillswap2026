import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SkillSwapLogo from '../landing/SkillSwapLogo'
import { useAuthStore } from '../../store/useAuthStore'
import api from '../../lib/api'
import ChatbotWidget from '../ai/ChatbotWidget'
import Avatar from '../ui/Avatar'


const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/discover', label: 'Matches' },
  { to: '/messenger', label: 'Chat', badge: true },
  { to: '/calendar', label: 'Sessions' },
  { to: '/materials', label: 'Materials' },
  { to: '/progress', label: 'Progress' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/skill-ai', label: 'AI Skill Insights' },
]

const visibleNavLinks = navLinks

function parsePayload(n) {
  if (!n?.payload) return {}
  if (typeof n.payload === 'object') return n.payload
  try {
    return JSON.parse(n.payload)
  } catch {
    return {}
  }
}

function notificationLabel(n) {
  const p = parsePayload(n)
  if (n.type === 'message') {
    return p.from_name ? `Message from ${p.from_name}` : 'New message'
  }
  if (n.type === 'paid_session_booked') {
    const who = p.learner_name ? ` by ${p.learner_name}` : ''
    const skill = p.skill ? ` · ${p.skill}` : ''
    const amt = typeof p.paid_usd === 'number' ? ` · $${p.paid_usd.toFixed(2)}` : ''
    return `Paid session booked${who}${skill}${amt}`
  }
  if (n.type === 'paid_session_confirmed') {
    const who = p.teacher_name ? ` with ${p.teacher_name}` : ''
    const skill = p.skill ? ` · ${p.skill}` : ''
    const amt = typeof p.paid_usd === 'number' ? ` · $${p.paid_usd.toFixed(2)}` : ''
    return `Paid session confirmed${who}${skill}${amt}`
  }
  if (n.type === 'account_warning') {
    if (p.status === 'banned') return 'Your account has been banned'
    if (p.status === 'suspended') return 'Your account has been suspended'
    if (p.dispute_id) return 'Warning from a dispute review'
    return 'Account notice from the moderation team'
  }
  const map = {
    match_request: 'New match request',
    match_accepted: 'Your match was accepted',
    match_declined: 'Your match request was declined',
    points_granted: 'Bonus Skill Points added by admin',
    session_booked: 'A session was booked',
    session_completed: 'A session was completed',
    session_reminder: 'Upcoming session reminder',
    material_published: 'New teaching material available',
    new_review: 'Someone left you a review',
  }
  return map[n.type] || n.type || 'Notification'
}

// A short sentence under the title so each notification says what it's about.
function notificationDescription(n) {
  const p = parsePayload(n)
  if (n.type === 'account_warning') {
    if (p.reason) return p.reason
    if (p.status === 'banned') return 'Your account was banned after a moderation review. Contact support if you believe this is a mistake.'
    if (p.status === 'suspended') return 'Your account is temporarily suspended while the team reviews recent activity.'
    if (p.dispute_id) return 'An admin reviewed a dispute involving your account.'
    return 'The moderation team posted an update about your account.'
  }
  const map = {
    match_request: p.from_name ? `${p.from_name} wants to swap skills with you.` : 'Someone wants to swap skills with you.',
    match_accepted: 'You can now message each other and schedule a session.',
    match_declined: 'Browse other partners in Matches to find a new swap.',
    points_granted: typeof p.amount === 'number' ? `${p.amount} Skill Points were added to your wallet.` : 'New Skill Points were added to your wallet.',
    session_booked: 'Check your calendar for the details.',
    session_completed: 'Leave a review for your partner from the calendar.',
    session_reminder: 'Your session is coming up soon — see the calendar.',
    material_published: 'A partner shared new learning material with you.',
    new_review: p.rating ? `They rated you ${p.rating}★. Open your profile to read it.` : 'Open your profile to read it.',
    message: 'Open the messenger to reply.',
    paid_session_booked: 'View the booking on your calendar.',
    paid_session_confirmed: 'View the booking on your calendar.',
  }
  return map[n.type] || null
}

// The backend stores timestamps as naive UTC (no timezone suffix); mark them
// UTC so relative time is correct regardless of the viewer's timezone.
function parseServerDate(iso) {
  if (!iso) return null
  let s = String(iso)
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T')
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(s)) s += 'Z'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function notificationTimeAgo(iso) {
  const d = parseServerDate(iso)
  if (!d) return ''
  const then = d.getTime()
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

const NOTIFICATION_ROUTES = {
  message: '/messenger',
  match_request: '/discover',
  match_accepted: '/messenger',
  match_declined: '/discover',
  session_booked: '/calendar',
  session_completed: '/calendar',
  session_reminder: '/calendar',
  points_granted: '/wallet',
  material_published: '/materials',
  paid_session_booked: '/calendar',
  paid_session_confirmed: '/calendar',
  new_review: '/profile',
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
            {items.map((n) => {
              const desc = notificationDescription(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition duration-200 hover:bg-white/[0.05] ${n.read ? 'opacity-60' : ''}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-foreground">{notificationLabel(n)}</span>
                    {desc && <span className="mt-0.5 block text-xs leading-snug text-mutedForeground">{desc}</span>}
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-mutedForeground/80">{notificationTimeAgo(n.created_at)}</span>
                  </span>
                </button>
              )
            })}
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
  if (label === 'Sessions') return pathname === '/calendar' || pathname === '/exchange'
  if (label === 'Materials') return pathname === '/materials'
  if (label === 'Progress') return pathname === '/progress'
  if (label === 'Wallet') return pathname === '/wallet'
  if (label === 'AI Skill Insights') return pathname === '/skill-ai'
  return false
}

function SidebarNav({ links, pathname, onNavigate, unreadChat = 0 }) {
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
            className={`relative flex items-center ${active ? 'nav-link-active' : 'nav-link'}`}
          >
            {link.label}
            {link.badge && unreadChat > 0 && (
              <span className="absolute right-2.5 top-1/2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-semibold text-white shadow-accent-glow">
                {unreadChat > 99 ? '99+' : unreadChat}
              </span>
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
  const [unreadChat, setUnreadChat] = useState(0)
  const points = user?.points_balance ?? 200

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    let active = true
    const load = () => {
      api.getConversations()
        .then((d) => {
          if (!active) return
          const total = (d.conversations || []).reduce((sum, c) => sum + (c.unread || 0), 0)
          setUnreadChat(total)
        })
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [location.pathname])

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
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] backdrop-blur-xl transition-transform duration-300 ease-expo lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <Link to="/dashboard" className="mb-8 flex items-center gap-3 px-2" onClick={closeSidebar}>
            <SkillSwapLogo size="sm" />
            <span className="text-xl font-semibold tracking-tight">Skillswap</span>
          </Link>

          <SidebarNav links={visibleNavLinks} pathname={location.pathname} onNavigate={closeSidebar} unreadChat={unreadChat} />

          <div className="mt-1 space-y-1">
            <Link
              to="/settings"
              onClick={closeSidebar}
              className={location.pathname === '/settings' ? 'nav-link-active flex items-center' : 'nav-link flex items-center'}
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={logout}
              className="nav-link nav-link-logout flex w-full items-center text-left"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] lg:hidden"
            aria-label="Open menu"
          >
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
          </button>

          <div className="hidden min-w-0 flex-1 lg:block">
            {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4 lg:flex-none">
            <Link
              to="/wallet"
              className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-xs text-[#c7cbf5] transition duration-200 hover:bg-accent/20 sm:px-4"
            >
              <span className="font-semibold">{points} SP</span>
            </Link>
            <NotificationBell />
            <Link to="/profile" className="flex max-w-[160px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition duration-200 hover:bg-white/[0.05] sm:max-w-none sm:gap-3 sm:pr-3">
              <Avatar
                user={user}
                className="h-9 w-9 shrink-0 rounded-xl border border-accent/30 bg-accent/20 font-mono text-xs text-[#c7cbf5]"
              />
              <span className="hidden truncate text-sm sm:inline">{user?.name || 'User'}</span>
            </Link>
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
