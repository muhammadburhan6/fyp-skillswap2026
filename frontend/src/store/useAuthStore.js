import { create } from 'zustand'
import api from '../lib/api'
import { clearToken, getToken, setToken } from '../lib/authToken'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  loadUser: async () => {
    const token = getToken()
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const { user } = await api.getMe()
      set({ user, loading: false })
    } catch {
      clearToken()
      set({ user: null, loading: false })
    }
  },
  login: async (email, password) => {
    const data = await api.login(email, password)
    setToken(data.token)
    set({ user: data.user })
    return data.user
  },
  loginWithGoogle: async (idToken) => {
    const data = await api.googleLogin(idToken)
    setToken(data.token)
    set({ user: data.user })
    return data.user
  },
  register: async (form) => {
    const data = await api.register(form)
    setToken(data.token)
    set({ user: data.user })
    return data.user
  },
  logout: () => {
    clearToken()
    set({ user: null })
  },
}))
