const TOKEN_KEY = 'skillswap_token'
const LEGACY_KEY = 'skillswap_user_id'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_KEY)
}

export function handleUnauthorized() {
  clearToken()
  if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
    window.location.assign('/auth')
  }
}

export { TOKEN_KEY }
