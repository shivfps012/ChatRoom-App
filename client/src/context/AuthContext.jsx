import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // On mount: validate stored token with /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    api.get('/api/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    try { await api.post('/api/auth/logout') } catch { /* ignore */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('roomId')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
