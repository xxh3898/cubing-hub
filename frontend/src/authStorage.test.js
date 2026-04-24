import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
  subscribeToAccessToken,
} from './authStorage.js'

describe('authStorage', () => {
  beforeEach(() => {
    clearStoredAccessToken()
  })

  it('should_store_and_clear_access_token_when_token_changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToAccessToken(listener)

    setStoredAccessToken('fresh-token')
    expect(getStoredAccessToken()).toBe('fresh-token')

    setStoredAccessToken('')
    expect(getStoredAccessToken()).toBeNull()

    clearStoredAccessToken()
    expect(getStoredAccessToken()).toBeNull()

    expect(listener).toHaveBeenNthCalledWith(1, 'fresh-token')
    expect(listener).toHaveBeenNthCalledWith(2, null)
    expect(listener).toHaveBeenNthCalledWith(3, null)

    unsubscribe()
  })

  it('should_stop_notifying_listener_when_subscription_is_unsubscribed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToAccessToken(listener)

    unsubscribe()
    setStoredAccessToken('fresh-token')

    expect(listener).not.toHaveBeenCalled()
  })
})
