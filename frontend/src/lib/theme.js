// Theme (dark / light) preference, persisted in localStorage and applied as
// a `data-theme` attribute on <html>. The dark theme is the default.
//
// IMPORTANT: the light theme only applies to the logged-in app (pages inside
// AppShell). Public/marketing/auth pages are dark-only by design, so we force
// dark there regardless of the saved preference.
const KEY = 'skillswap_theme'

// Route prefixes for the in-app experience that honours the theme preference.
const THEMED_PREFIXES = [
  '/dashboard', '/discover', '/matches', '/messenger', '/chat', '/calendar',
  '/exchange', '/wallet', '/profile', '/progress', '/materials', '/settings',
  '/admin', '/skill-ai',
]

export function isThemedRoute(pathname = '') {
  return THEMED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Set the DOM attribute only (no persistence).
function setDomTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
  }
}

// Save the preference AND apply it. Used by the Settings toggle (always on a
// themed route, so the change is visible immediately).
export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  setDomTheme(t)
  return t
}

// Apply the right theme for the current route: saved preference on app pages,
// forced dark everywhere else. Does NOT change the saved preference.
export function applyThemeForRoute(pathname = '') {
  setDomTheme(isThemedRoute(pathname) ? getStoredTheme() : 'dark')
}

// Called once at startup (before React renders) to avoid a flash.
export function initTheme() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  applyThemeForRoute(path)
}
