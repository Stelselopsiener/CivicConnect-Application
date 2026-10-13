import { beforeEach, describe, expect, it, vi } from 'vitest'
const { post, demoPost } = vi.hoisted(() => ({ post: vi.fn(), demoPost: vi.fn() }))
vi.mock('../http/httpTransport', () => ({ httpTransport: { post } }))
vi.mock('../mock/mockTransport', () => ({ mockTransport: { post: demoPost } }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  let saved = {}
  vi.stubGlobal('window', { localStorage: {
    getItem: (key) => saved[key] ?? null,
    setItem: (key, value) => { saved[key] = value },
    removeItem: (key) => { delete saved[key] },
  } })
  post.mockResolvedValue({ message: 'Request received' })
})

describe('live authentication routing', () => {
  it('uses real API by default when the frontend environment setting is absent', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', undefined)
    const { env } = await import('../../config/env')
    expect(env.useMockApi).toBe(false)
  })
  it('sends signup to HTTP even if request-demo mode is explicitly enabled', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    const { authGateway } = await import('../index')
    await authGateway.register({ name: ' Test ', email: ' TEST@example.org ', password: 'abcdefgh' })
    expect(post).toHaveBeenCalledWith('/auth/register', { name: 'Test', email: 'test@example.org', password: 'abcdefgh' })
    expect(demoPost).not.toHaveBeenCalled()
  })
  it('sends email-scoped verification and resend to HTTP', async () => {
    const { authGateway } = await import('../index')
    await authGateway.verifyEmail('TEST@example.org', '000042')
    await authGateway.resendVerification('TEST@example.org')
    expect(post).toHaveBeenCalledWith('/auth/verify-email', { email: 'test@example.org', code: '000042' })
    expect(post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'test@example.org' })
    expect(demoPost).not.toHaveBeenCalled()
  })
  it('discards a stored demo session on startup', async () => {
    window.localStorage.setItem('civicconnect.token', 'old.fake.demo')
    await import('../index')
    expect(window.localStorage.getItem('civicconnect.token')).toBeNull()
  })
  it('preserves an existing non-demo session token on startup', async () => {
    window.localStorage.setItem('civicconnect.token', 'header.payload.signature')
    await import('../index')
    expect(window.localStorage.getItem('civicconnect.token')).toBe('header.payload.signature')
  })
})
