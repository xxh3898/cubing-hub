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

let isRefreshing = false
let waitingQueue = []

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

function flushWaitingQueue(error, accessToken = null) {
  waitingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }

    resolve(accessToken)
  })

  waitingQueue = []
}

async function refreshAccessToken() {
  const response = await apiClient.post('/api/auth/refresh', null, {
    _skipAuthRefresh: true,
  })
  const nextAccessToken = response.data?.data?.accessToken

  if (!nextAccessToken) {
    throw new Error('토큰 재발급 응답에 access token이 없습니다.')
  }

  setStoredAccessToken(nextAccessToken)
  return nextAccessToken
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

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingQueue.push({
          resolve: (nextAccessToken) => {
            originalRequest.headers = originalRequest.headers ?? {}
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    isRefreshing = true

    try {
      const nextAccessToken = await refreshAccessToken()
      flushWaitingQueue(null, nextAccessToken)
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      clearStoredAccessToken()
      flushWaitingQueue(refreshError)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
