import { createContext, useEffect, useState } from 'react'
import { getMe, refreshSession } from '../api.js'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
  subscribeToAccessToken,
} from '../authStorage.js'

const AuthContext = createContext(null)

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
        const response = await refreshSession()
        const nextAccessToken = response.data?.accessToken

        if (!nextAccessToken) {
          throw new Error('토큰 재발급 응답에 access token이 없습니다.')
        }

        if (isCancelled || getStoredAccessToken()) {
          return
        }

        didStoreBootstrapToken = true
        setStoredAccessToken(nextAccessToken)

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
