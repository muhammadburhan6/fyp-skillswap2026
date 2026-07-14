import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'
import { clearToken, getToken, setToken } from '../lib/authToken'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (token) {
      api.getMe()
        .then((d) => setUser(d.user))
        .catch(() => clearToken())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (form) => {
    const data = await api.register(form)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  const refreshUser = async () => {
    const data = await api.getMe()
    setUser(data.user)
    return data.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
