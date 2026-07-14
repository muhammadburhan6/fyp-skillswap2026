import { getToken, handleUnauthorized } from '../lib/authToken'

const API = '/api'

function headers() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new Error(data.error || 'Request failed')
  }
  return data
}

export const api = {
  health: () => request('/health'),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/users/me'),
  updateMe: (data) =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  onboarding: (data) =>
    request('/users/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  dashboard: () => request('/dashboard/'),
  discoverMatches: () => request('/matches/discover'),
  myMatches: () => request('/matches/my'),
  acceptMatch: (target_user_id, skill) =>
    request('/matches/accept', { method: 'POST', body: JSON.stringify({ target_user_id, skill }) }),
  getSessions: () => request('/sessions/'),
  createSession: (data) =>
    request('/sessions/', { method: 'POST', body: JSON.stringify(data) }),
  completeSession: (id) =>
    request(`/sessions/${id}/complete`, { method: 'POST' }),
  getChats: () => request('/chat/'),
  getMessages: (chatId) => request(`/chat/${chatId}/messages`),
  sendMessage: (chatId, text) =>
    request(`/chat/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  getTokens: () => request('/tokens/daily'),
  getProgress: () => request('/progress/'),
  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  distributeTokens: (amount) =>
    request('/admin/tokens/distribute', { method: 'POST', body: JSON.stringify({ amount }) }),
  aiChat: (message) =>
    request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
}
