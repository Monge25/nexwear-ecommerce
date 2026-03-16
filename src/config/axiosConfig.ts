import axios from 'axios'
import env from './environment'

const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: env.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor: attach token ───────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexwear_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('nexwear_refresh_token')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${env.API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })
          localStorage.setItem('nexwear_token', data.token)
          apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`
          return apiClient(originalRequest)
        } catch {
          localStorage.removeItem('nexwear_token')
          localStorage.removeItem('nexwear_refresh_token')
          window.location.href = '/auth/login'
        }
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
