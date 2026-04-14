import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function setupApiClientHarness() {
  vi.resetModules()

  const authStorage = await import('../authStorage.js')
  const { default: apiClient } = await import('./apiClient.js')
  const mock = new MockAdapter(apiClient)

  authStorage.clearStoredAccessToken()

  return {
    apiClient,
    mock,
    ...authStorage,
  }
}

afterEach(() => {
  vi.resetModules()
})

describe('apiClient auth refresh flow', () => {
  it('should_refresh_once_and_retry_waiting_requests_when_multiple_requests_receive_401', async () => {
    const { apiClient, mock, getStoredAccessToken, setStoredAccessToken } = await setupApiClientHarness()
    let protectedRequestCount = 0
    let refreshRequestCount = 0

    setStoredAccessToken('expired-token')

    mock.onGet('/api/protected').reply((config) => {
      protectedRequestCount += 1

      if (protectedRequestCount <= 2) {
        return [401]
      }

      return [
        200,
        {
          authorization: config.headers.Authorization,
        },
      ]
    })

    mock.onPost('/api/auth/refresh').reply(() => {
      refreshRequestCount += 1

      return [
        200,
        {
          data: {
            accessToken: 'fresh-token',
          },
        },
      ]
    })

    const [firstResponse, secondResponse] = await Promise.all([
      apiClient.get('/api/protected'),
      apiClient.get('/api/protected'),
    ])

    expect(refreshRequestCount).toBe(1)
    expect(protectedRequestCount).toBe(4)
    expect(getStoredAccessToken()).toBe('fresh-token')
    expect(firstResponse.data.authorization).toBe('Bearer fresh-token')
    expect(secondResponse.data.authorization).toBe('Bearer fresh-token')

    mock.restore()
  })

  it('should_clear_access_token_when_refresh_request_fails_after_protected_api_401', async () => {
    const { apiClient, mock, getStoredAccessToken, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('expired-token')

    mock.onGet('/api/protected').replyOnce(401)
    mock.onPost('/api/auth/refresh').replyOnce(401)

    await expect(apiClient.get('/api/protected')).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })

    expect(getStoredAccessToken()).toBeNull()

    mock.restore()
  })
})
