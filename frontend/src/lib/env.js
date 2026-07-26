// Detects whether the app is running on a local development host.
// Used to gate localhost-only features (e.g. the AI Skill Insights page).
export function isLocalhost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0'
}
