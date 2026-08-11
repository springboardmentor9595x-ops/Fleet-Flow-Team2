import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data)
        } catch (error) {
          console.error('Authentication check failed:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          setUser(null)
        }
      }
      setLoading(false)
    }

    checkTokenValidity()
  }, [])

  const login = (userData, token, refreshToken) => {
    if (token) {
      localStorage.setItem('token', token)
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Refresh user profile failed:', error)
    }
  }

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
      loading,
    }),
    [user, loading],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030408] flex items-center justify-center select-none font-mono">
        <div className="text-white/50 text-xs tracking-widest animate-pulse">
          VERIFYING ACCESS LEVEL CLEARANCE...
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
