import axios from 'axios'

/**
 * Single, shared axios instance for all calls to the CivicConnect Express API.
 *
 * Architecture note (see ADR: API Client Boundary):
 * All HTTP calls MUST go through this client rather than calling axios/fetch
 * directly in components or pages. This keeps the frontend's integration
 * boundary in one place, so the backend team can change the API base URL,
 * auth header scheme, or error contract in a single file.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the JWT (if present) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('civicconnect_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalise error handling and react to session expiry in one place.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.'

    if (status === 401) {
      localStorage.removeItem('civicconnect_token')
      localStorage.removeItem('civicconnect_user')
    }

    return Promise.reject({ status, message, original: error })
  }
)

export default apiClient
