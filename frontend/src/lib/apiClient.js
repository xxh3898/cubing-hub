import axios from 'axios'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../authStorage.js'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

function shouldSkipRefresh(config) {
  const requestUrl = config?.url ?? ''

  return (
    config?._skipAuthRefresh ||
    config?._retry ||
    requestUrl === '/api/auth/login' ||
    requestUrl === '/api/auth/signup' ||
    requestUrl === '/api/auth/refresh'
  )
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient.post('/api/auth/refresh', null, {
      _skipAuthRefresh: true,
    })
      .then((response) => {
        const nextAccessToken = response.data?.data?.accessToken

        if (!nextAccessToken) {
          throw new Error('토큰 재발급 응답에 access token이 없습니다.')
        }

        setStoredAccessToken(nextAccessToken)
        return nextAccessToken
      })
      .catch((error) => {
        clearStoredAccessToken()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken()

  if (accessToken) {
    config.headers = config.headers ?? {}
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest || error.response?.status !== 401 || shouldSkipRefresh(originalRequest)) {
      if (originalRequest?.url === '/api/auth/refresh' && error.response?.status === 401) {
        clearStoredAccessToken()
      }

      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const nextAccessToken = await refreshAccessToken()
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

export default apiClient
