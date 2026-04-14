let accessToken = null
const accessTokenListeners = new Set()

function notifyAccessTokenListeners(nextToken) {
  accessTokenListeners.forEach((listener) => {
    listener(nextToken)
  })
}

export function getStoredAccessToken() {
  return accessToken
}

export function setStoredAccessToken(nextAccessToken) {
  if (!nextAccessToken) {
    clearStoredAccessToken()
    return
  }

  accessToken = nextAccessToken
  notifyAccessTokenListeners(nextAccessToken)
}

export function clearStoredAccessToken() {
  accessToken = null
  notifyAccessTokenListeners(null)
}

export function subscribeToAccessToken(listener) {
  accessTokenListeners.add(listener)

  return () => {
    accessTokenListeners.delete(listener)
  }
}
