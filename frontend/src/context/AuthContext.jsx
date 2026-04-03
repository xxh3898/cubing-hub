import { createContext, useMemo, useState } from 'react'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../authStorage.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState(() => getStoredAccessToken())

  const setAccessToken = (nextToken) => {
    setStoredAccessToken(nextToken)
    setAccessTokenState(nextToken)
  }

  const clearAccessToken = () => {
    clearStoredAccessToken()
    setAccessTokenState(null)
  }

  const value = useMemo(
    () => ({
      accessToken,
      isAuthenticated: Boolean(accessToken),
      setAccessToken,
      clearAccessToken,
    }),
    [accessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
