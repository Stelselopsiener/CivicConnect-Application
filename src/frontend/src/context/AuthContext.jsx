/**
 * Session state — DESIGN PATTERN: Provider (React Context).
 *
 * One component owns "who is signed in"; any screen reads it with useAuth() instead of having
 * the user passed down through every layer. Sign-in, sign-out and session expiry all change
 * state here and nowhere else.
 */
import { useCallback, useMemo, useState } from 'react'
import { authGateway } from '../services'
import { EVENT } from '../services/events/eventBus'
import { useEventBus } from '../hooks/useEventBus'
import { AuthContext } from './authContextObject'


const SESSION_EVENTS = [EVENT.SESSION_EXPIRED]

export function AuthProvider({ children }) {
  // Rebuilt from the stored JWT, so a page reload keeps the user signed in until it expires.
  const [user, setUser] = useState(() => authGateway.currentUser())
  const [sessionExpired, setSessionExpired] = useState(false)
  // True after a deliberate sign-out, so the next person to sign in on this device starts on
  // their own home page and is not sent to the previous user's last screen.
  const [signedOut, setSignedOut] = useState(false)

  const signIn = useCallback(async (credentials) => {
    const signedIn = await authGateway.signIn(credentials)
    setSessionExpired(false)
    setSignedOut(false)
    setUser(signedIn)
    return signedIn
  }, [])

  const signOut = useCallback(() => {
    authGateway.signOut()
    setSignedOut(true)
    setUser(null)
  }, [])

  // Observer: the HTTP facade announces a rejected token; the provider reacts.
  useEventBus(SESSION_EVENTS, () => {
    setUser(null)
    setSessionExpired(true)
  })

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), sessionExpired, signedOut, signIn, signOut }),
    [user, sessionExpired, signedOut, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
