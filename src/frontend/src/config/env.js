/**
 * The one place that reads Vite environment variables.
 * Everything else imports `env`, so configuration can be found and tested in a single file.
 */
const raw = import.meta.env ?? {}

export const env = {
  // Demo data is the default until the Express API implements the PED §12.2 contract.
  // Set VITE_USE_MOCK_API=false to talk to the real API.
  useMockApi: raw.VITE_USE_MOCK_API !== 'false',
  apiBaseUrl: raw.VITE_API_BASE_URL || '/api/v1',
  release: raw.VITE_RELEASE || 'dev',
}
