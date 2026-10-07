/**
 * HTTP transport — DESIGN PATTERN: Facade.
 *
 * The only file in the frontend that knows axios exists (ADR "API client boundary"). It hides
 * the base URL (/api/v1, §12.4 versioning), the Bearer header, session expiry and error
 * normalisation behind three calls: get, post, patch. Each resolves to the response body and
 * rejects with AppError.
 */
import axios from 'axios'
import { env } from '../../config/env'
import { toAppError } from '../AppError'
import { clearToken, getToken } from '../session'
import { EVENT, eventBus } from '../events/eventBus'

const client = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000, // REQ-025: a request is processed, or fails visibly, within 10 seconds
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const appError = toAppError(error)
    // A 401 on anything but the sign-in call means the token is no longer accepted.
    if (appError.status === 401 && getToken() && !error.config?.url?.startsWith('/auth/')) {
      clearToken()
      eventBus.publish(EVENT.SESSION_EXPIRED)
    }
    return Promise.reject(appError)
  },
)

export const httpTransport = {
  get: (url, params) => client.get(url, { params }).then((response) => response.data),
  post: (url, body) => client.post(url, body).then((response) => response.data),
  patch: (url, body) => client.patch(url, body).then((response) => response.data),
}
