import { createContext, useEffect, useMemo, useState } from 'react'
import { getMe } from '../api.js'
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
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(getStoredAccessToken()))

  useEffect(() => {
    return subscribeToAccessToken((nextToken) => {
      setAccessTokenState(nextToken)

      if (!nextToken) {
        setCurrentUser(null)
        setIsAuthLoading(false)
        return
      }

      setIsAuthLoading(true)
    })
  }, [])

  useEffect(() => {
    let isCancelled = false

    if (!accessToken) {
      return () => {
        isCancelled = true
      }
    }

    const syncCurrentUser = async () => {
      try {
        const response = await getMe()

        if (isCancelled) {
          return
        }

        setCurrentUser(response.data ?? null)
        setIsAuthLoading(false)
      } catch {
        if (isCancelled) {
          return
        }

        setCurrentUser(null)
        setIsAuthLoading(false)
        clearStoredAccessToken()
      }
    }

    syncCurrentUser()

    return () => {
      isCancelled = true
    }
  }, [accessToken])

  const setAccessToken = (nextToken) => {
    setIsAuthLoading(Boolean(nextToken))
    setStoredAccessToken(nextToken)
  }

  const clearAccessToken = () => {
    setCurrentUser(null)
    setIsAuthLoading(false)
    clearStoredAccessToken()
  }

  const value = useMemo(
    () => ({
      accessToken,
      currentUser,
      hasAuthToken: Boolean(accessToken),
      isAuthenticated: Boolean(accessToken && currentUser),
      isAuthLoading,
      setAccessToken,
      clearAccessToken,
    }),
    [accessToken, currentUser, isAuthLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
