import { createContext, useEffect, useState } from 'react'
import { clearRefreshCookie, getMe, refreshSession } from '../api.js'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
  subscribeToAccessToken,
} from '../authStorage.js'

const AuthContext = createContext(null)

function shouldCleanupRefreshCookie(error) {
  if (error?.isNetworkError) {
    return true
  }

  if (error?.status === 401) {
    return true
  }

  return error?.status === 400 && error.message !== 'refresh_token 쿠키가 필요합니다.'
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState(() => getStoredAccessToken())
  const [currentUser, setCurrentUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSessionSyncing, setIsSessionSyncing] = useState(false)

  useEffect(() => {
    return subscribeToAccessToken((nextToken) => {
      setAccessTokenState(nextToken)

      if (!nextToken) {
        setCurrentUser(null)
        setIsSessionSyncing(false)
      }
    })
  }, [])

  useEffect(() => {
    let isCancelled = false
    let didStoreBootstrapToken = false

    const bootstrapSession = async () => {
      try {
        let response
        try {
          response = await refreshSession()
        } catch (error) {
          if (!isCancelled && shouldCleanupRefreshCookie(error)) {
            try {
              await clearRefreshCookie()
            } catch {
              // 쿠키 정리 실패는 세션 정리보다 우선하지 않는다.
            }
          }

          throw error
        }

        const nextAccessToken = response.data?.accessToken

        if (!nextAccessToken) {
          throw new Error('토큰 재발급 응답에 access token이 없습니다.')
        }

        if (isCancelled) {
          return
        }

        didStoreBootstrapToken = true
        if (!getStoredAccessToken()) {
          setStoredAccessToken(nextAccessToken)
        }

        const currentUserResponse = await getMe()

        if (isCancelled) {
          return
        }

        setCurrentUser(currentUserResponse.data ?? null)
      } catch {
        if (isCancelled) {
          return
        }

        if (didStoreBootstrapToken || !getStoredAccessToken()) {
          clearStoredAccessToken()
          setCurrentUser(null)
        }
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrapSession()

    return () => {
      isCancelled = true
    }
  }, [])

  const setAccessToken = async (nextToken) => {
    if (!nextToken) {
      clearAccessToken()
      return
    }

    setIsSessionSyncing(true)
    setStoredAccessToken(nextToken)

    try {
      const response = await getMe()
      setCurrentUser(response.data ?? null)
    } catch (error) {
      clearStoredAccessToken()
      setCurrentUser(null)
      throw error
    } finally {
      setIsSessionSyncing(false)
    }
  }

  const clearAccessToken = () => {
    setCurrentUser(null)
    setIsSessionSyncing(false)
    clearStoredAccessToken()
  }

  const isAuthLoading = isBootstrapping || isSessionSyncing

  const value = {
    accessToken,
    currentUser,
    hasAuthToken: Boolean(accessToken),
    isAuthenticated: Boolean(accessToken && currentUser),
    isAuthLoading,
    setAccessToken,
    clearAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
