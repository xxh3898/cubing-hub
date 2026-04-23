import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function setupApiClientHarness() {
  vi.resetModules()

  const authStorage = await import('../authStorage.js')
  const { default: apiClient, refreshAccessToken } = await import('./apiClient.js')
  const mock = new MockAdapter(apiClient)

  authStorage.clearStoredAccessToken()

  return {
    apiClient,
    mock,
    refreshAccessToken,
    ...authStorage,
  }
}

afterEach(() => {
  vi.resetModules()
})

function getHeaderValue(headers, name) {
  if (!headers) {
    return undefined
  }

  if (typeof headers.get === 'function') {
    return headers.get(name)
  }

  return headers[name] ?? headers[name.toLowerCase()]
}

describe('apiClient auth refresh flow', () => {
  it('should_share_single_refresh_request_when_refresh_is_requested_concurrently', async () => {
    const { mock, getStoredAccessToken, refreshAccessToken } = await setupApiClientHarness()
    let refreshRequestCount = 0

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

    const [firstToken, secondToken] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ])

    expect(refreshRequestCount).toBe(1)
    expect(firstToken).toBe('fresh-token')
    expect(secondToken).toBe('fresh-token')
    expect(getStoredAccessToken()).toBe('fresh-token')

    mock.restore()
  })

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

  it('should_not_force_json_content_type_when_form_data_is_sent', async () => {
    const { apiClient, mock } = await setupApiClientHarness()
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify({ title: '이미지 글' })], { type: 'application/json' }))
    formData.append('images', new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' }))

    mock.onPost('/api/posts').reply((config) => [
      200,
      {
        contentType: getHeaderValue(config.headers, 'Content-Type') ?? null,
      },
    ])

    const response = await apiClient.post('/api/posts', formData)

    expect(response.data.contentType).not.toBe('application/json')

    mock.restore()
  })
})
