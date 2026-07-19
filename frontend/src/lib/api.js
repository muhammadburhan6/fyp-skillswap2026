import axios from 'axios'
import { getToken, handleUnauthorized } from './authToken'

// Always same-origin /api:
// - Local: Vite proxies → Flask (vite.config.js)
// - Production: Vercel rewrites → Railway (vercel.json)
const apiBase = '/api'

const api = axios.create({ baseURL: apiBase })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      handleUnauthorized()
    }
    return Promise.reject(error)
  },
)

export default {
  health: () => api.get('/health').then((r) => r.data),
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  googleLogin: (idToken) => api.post('/auth/google', { id_token: idToken }).then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }).then((r) => r.data),
  getMe: () => api.get('/users/me').then((r) => r.data),
  updateMe: (data) => api.put('/users/me', data).then((r) => r.data),
  onboarding: (data) => api.post('/users/onboarding', data).then((r) => r.data),
  dashboard: () => api.get('/dashboard/').then((r) => r.data),
  discoverMatches: (skill) => api.get('/matches/discover', { params: skill ? { skill } : {} }).then((r) => r.data),
  getRecommendations: () => api.get('/recommendations/').then((r) => r.data),
  requestMatch: (target_user_id) => api.post('/matches/request', { target_user_id }).then((r) => r.data),
  getMatchRequests: () => api.get('/matches/requests').then((r) => r.data),
  acceptMatch: (target_user_id, skill) => api.post('/matches/accept', { target_user_id, skill }).then((r) => r.data),
  declineMatch: (target_user_id) => api.post('/matches/decline', { target_user_id }).then((r) => r.data),
  adminDeleteUser: (userId) =>
    api.delete(`/admin/users/${userId}`, { data: { confirm: 'DELETE' } }).then((r) => r.data),
  adminUpdateUserStatus: (userId, status) =>
    api.patch(`/admin/users/${userId}/status`, { status }).then((r) => r.data),
  adminDisputes: () => api.get('/admin/disputes').then((r) => r.data),
  adminUpdateDispute: (id, data) => api.patch(`/admin/disputes/${id}`, data).then((r) => r.data),
  adminModeration: () => api.get('/admin/moderation').then((r) => r.data),
  adminUpdateModeration: (id, data) => api.patch(`/admin/moderation/${id}`, data).then((r) => r.data),
  adminAnalytics: () => api.get('/admin/analytics').then((r) => r.data),
  getSessions: () => api.get('/sessions/').then((r) => r.data),
  createSession: (data) => api.post('/sessions/', data).then((r) => r.data),
  updateSession: (id, data) => api.patch(`/sessions/${id}`, data).then((r) => r.data),
  getLearningPath: (id) => api.get(`/sessions/${id}/learning-path`).then((r) => r.data),
  generateLearningPath: (id, opts) => api.post(`/sessions/${id}/learning-path`, opts).then((r) => r.data),
  submitReview: (session_id, rating, comment) =>
    api.post('/reviews/', { session_id, rating, comment }).then((r) => r.data),
  getReviewsForUser: (userId) => api.get(`/reviews/user/${userId}`).then((r) => r.data),
  getConversations: () => api.get('/conversations/').then((r) => r.data),
  getMessages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
  sendMessage: (id, text) => api.post(`/conversations/${id}/messages`, { text }).then((r) => r.data),
  uploadChatFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/conversations/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }).then((r) => r.data)
  },
  getWallet: (userId) => api.get(`/wallet/${userId}`).then((r) => r.data),
  getTransactions: (userId) => api.get(`/wallet/${userId}/transactions`).then((r) => r.data),
  claimDailyBonus: () => api.post('/wallet/daily-bonus').then((r) => r.data),
  markWelcomeSeen: () => api.post('/wallet/welcome-seen').then((r) => r.data),
  getPointsCalendar: (year, month) =>
    api.get('/wallet/calendar', { params: { year, month } }).then((r) => r.data),
  getProgress: () => api.get('/progress/').then((r) => r.data),
  getNotifications: () => api.get('/notifications/').then((r) => r.data),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllNotificationsRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  adminStats: () => api.get('/admin/stats').then((r) => r.data),
  adminUsers: (q) => api.get('/admin/users', { params: q ? { q } : {} }).then((r) => r.data),
  aiChat: (message) => api.post('/ai/chat', { message }).then((r) => r.data),
  getSkillDemand: () => api.get('/ai/skill-demand').then((r) => r.data),
  subscribeNewsletter: (email) => api.post('/newsletter/subscribe', { email }).then((r) => r.data),
}
