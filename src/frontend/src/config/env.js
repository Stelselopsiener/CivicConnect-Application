const raw = import.meta.env ?? {}

export const env = {
  // Use the real API by default. Demo mode must be explicitly enabled.
  useMockApi: raw.VITE_USE_MOCK_API === 'true',
  apiBaseUrl: raw.VITE_API_BASE_URL || '/api/v1',
  release: raw.VITE_RELEASE || 'dev',
}
