/**
 * The single error type the UI handles. Both transports (HTTP and demo) throw AppError, built
 * from the PED §12.4 envelope: { "error": { "code", "message", "details": [] } }.
 */
export class AppError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Something went wrong. Try again.', details = [] } = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = Array.isArray(details) ? details : []
  }

  is(code) {
    return this.code === code
  }
}

export const ERROR_CODE = Object.freeze({
  VALIDATION: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  NETWORK: 'NETWORK_ERROR',
})

const FALLBACK_MESSAGES = {
  400: 'Some of the information was not accepted. Check the form and try again.',
  401: 'Your session has ended. Sign in again.',
  403: 'Your account is not allowed to do that.',
  404: 'That record could not be found.',
  409: 'That change conflicts with the current state of the request. Reload and try again.',
  500: 'The server could not complete the request. Nothing was saved. Try again in a moment.',
}

/** Adapts an axios failure to AppError, tolerating servers that do not send the full envelope. */
export function toAppError(error) {
  if (error instanceof AppError) return error
  const response = error?.response
  if (!response) {
    return new AppError({
      code: ERROR_CODE.NETWORK,
      message: 'CivicConnect could not reach the server. Check your connection and try again.',
    })
  }
  const body = response.data ?? {}
  const envelope = typeof body.error === 'object' && body.error !== null ? body.error : {}
  const legacyMessage = typeof body.error === 'string' ? body.error : body.message
  return new AppError({
    status: response.status,
    code: envelope.code || `HTTP_${response.status}`,
    message: envelope.message || legacyMessage || FALLBACK_MESSAGES[response.status] || FALLBACK_MESSAGES[500],
    details: envelope.details,
  })
}
