import axios from 'axios'
import { getToken, handleUnauthorized } from './authToken'

const api = axios.create({ baseURL: '/api' })

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
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }).then((r) => r.data),
  getMe: () => api.get('/users/me').then((r) => r.data),
  updateMe: (data) => api.put('/users/me', data).then((r) => r.data),
  onboarding: (data) => api.post('/users/onboarding', data).then((r) => r.data),
  dashboard: () => api.get('/dashboard/').then((r) => r.data),
  discoverMatches: () => api.get('/matches/discover').then((r) => r.data),
  getRecommendations: () => api.get('/recommendations/').then((r) => r.data),
  requestMatch: (target_user_id) => api.post('/matches/request', { target_user_id }).then((r) => r.data),
  acceptMatch: (target_user_id, skill) => api.post('/matches/accept', { target_user_id, skill }).then((r) => r.data),
  getSessions: () => api.get('/sessions/').then((r) => r.data),
  createSession: (data) => api.post('/sessions/', data).then((r) => r.data),
  updateSession: (id, data) => api.patch(`/sessions/${id}`, data).then((r) => r.data),
  getLearningPath: (id) => api.get(`/sessions/${id}/learning-path`).then((r) => r.data),
  generateLearningPath: (id, opts) => api.post(`/sessions/${id}/learning-path`, opts).then((r) => r.data),
  getConversations: () => api.get('/conversations/').then((r) => r.data),
  getMessages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
  sendMessage: (id, text) => api.post(`/conversations/${id}/messages`, { text }).then((r) => r.data),
  getWallet: (userId) => api.get(`/wallet/${userId}`).then((r) => r.data),
  getTransactions: (userId) => api.get(`/wallet/${userId}/transactions`).then((r) => r.data),
  getProgress: () => api.get('/progress/').then((r) => r.data),
  getNotifications: () => api.get('/notifications/').then((r) => r.data),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllNotificationsRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  adminStats: () => api.get('/admin/stats').then((r) => r.data),
  adminUsers: () => api.get('/admin/users').then((r) => r.data),
  aiChat: (message) => api.post('/ai/chat', { message }).then((r) => r.data),
  subscribeNewsletter: (email) => api.post('/newsletter/subscribe', { email }).then((r) => r.data),
}
