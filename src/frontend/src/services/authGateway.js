/**
 * Auth gateway: the User-module endpoints of PED §12.2 and §11.3 (D13 email confirmation).
 *
 *   POST /auth/register             { name, email, password }  -> 201, generic "check your email"
 *   POST /auth/verify-email         { token }                  -> 200
 *   POST /auth/resend-verification  { email }                  -> 200, generic
 *   POST /auth/login                { email, password }        -> 200 { token, user? }
 *                                                                 401 INVALID_CREDENTIALS
 *                                                                 403 EMAIL_NOT_VERIFIED
 *
 * Written once against a `transport` (Strategy): the same code runs on HTTP and on demo data.
 */
import { toSessionUser } from './adapters/userAdapter'
import { AppError, ERROR_CODE } from './AppError'
import { clearToken, decodeJwt, readSession, saveToken } from './session'

export function createAuthGateway(transport) {
  return {
    async register({ name, email, password }) {
      return transport.post('/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password })
    },

    async verifyEmail(token) {
      return transport.post('/auth/verify-email', { token })
    },

    async resendVerification(email) {
      return transport.post('/auth/resend-verification', { email: email.trim().toLowerCase() })
    },

    async signIn({ email, password }) {
      const body = await transport.post('/auth/login', { email: email.trim().toLowerCase(), password })
      const user = toSessionUser(body?.user, decodeJwt(body?.token ?? ''))
      if (!body?.token || !user?.role) {
        throw new AppError({ code: ERROR_CODE.UNAUTHENTICATED, message: 'Sign-in did not return a valid session.' })
      }
      saveToken(body.token)
      return user
    },

    /** Rebuilds the user from the stored JWT on page load. No network call. */
    currentUser() {
      return toSessionUser(null, readSession())
    },

    signOut() {
      clearToken()
    },
  }
}
