import axios from 'axios'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../authStorage.js'

export function resolveApiBaseUrl(env = import.meta.env) {
  const configuredBaseUrl = env.VITE_API_BASE_URL?.trim()

  if (!env.PROD) {
    return configuredBaseUrl || 'http://localhost:8080'
  }

  if (!configuredBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required for production builds.')
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBaseUrl)) {
    throw new Error('VITE_API_BASE_URL must not point to localhost in production builds.')
  }

  return configuredBaseUrl
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise = null

function clearContentTypeHeader(headers) {
  if (!headers) {
    return
  }

  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type')
    headers.delete('content-type')
    return
  }

  delete headers['Content-Type']
  delete headers['content-type']
}

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
          throw new Error('인증 정보를 갱신하지 못했습니다. 다시 로그인해주세요.')
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
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers = config.headers ?? {}
    clearContentTypeHeader(config.headers)
  }

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
