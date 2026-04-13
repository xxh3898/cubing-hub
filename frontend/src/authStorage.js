const ACCESS_TOKEN_KEY = 'cubinghub.accessToken'
const accessTokenListeners = new Set()

function notifyAccessTokenListeners(nextToken) {
  accessTokenListeners.forEach((listener) => {
    listener(nextToken)
  })
}

export function getStoredAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setStoredAccessToken(accessToken) {
  if (!accessToken) {
    clearStoredAccessToken()
    return
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  notifyAccessTokenListeners(accessToken)
}

export function clearStoredAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  notifyAccessTokenListeners(null)
}

export function subscribeToAccessToken(listener) {
  accessTokenListeners.add(listener)

  return () => {
    accessTokenListeners.delete(listener)
  }
}
