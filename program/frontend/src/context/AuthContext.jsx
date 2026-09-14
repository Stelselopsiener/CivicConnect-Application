import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { login as loginRequest, register as registerRequest, fetchCurrentUser } from '../services/authService'

export const AuthContext = createContext(null)

const TOKEN_KEY = 'civicconnect_token'
const USER_KEY = 'civicconnect_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  // On app load, if a token exists, verify it against the backend and
  // rehydrate the user rather than trusting stale localStorage data.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchCurrentUser()
      .then((freshUser) => {
        setUser(freshUser)
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const persistSession = (token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const login = useCallback(async (credentials) => {
    const { token, user: loggedInUser } = await loginRequest(credentials)
    persistSession(token, loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback(async (details) => {
    const { token, user: newUser } = await registerRequest(details)
    persistSession(token, newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
