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
  it('should_remove_content_type_headers_from_plain_object_header_maps', async () => {
    const { clearContentTypeHeader } = await import('./apiClient.js')
    const headers = {
      'Content-Type': 'application/json',
      'content-type': 'application/json',
    }

    clearContentTypeHeader(headers)

    expect(headers).toEqual({})
  })

  it('should_ignore_missing_header_maps_when_content_type_headers_are_cleared', async () => {
    const { clearContentTypeHeader } = await import('./apiClient.js')

    expect(() => clearContentTypeHeader()).not.toThrow()
  })

  it('should_skip_refresh_for_retry_and_auth_endpoints', async () => {
    const { shouldSkipRefresh } = await import('./apiClient.js')

    expect(shouldSkipRefresh()).toBe(false)
    expect(shouldSkipRefresh({ _skipAuthRefresh: true, url: '/api/records' })).toBe(true)
    expect(shouldSkipRefresh({ _retry: true, url: '/api/records' })).toBe(true)
    expect(shouldSkipRefresh({ url: '/api/auth/login' })).toBe(true)
    expect(shouldSkipRefresh({ url: '/api/auth/signup' })).toBe(true)
    expect(shouldSkipRefresh({ url: '/api/auth/refresh' })).toBe(true)
    expect(shouldSkipRefresh({ url: '/api/records' })).toBe(false)
  })

  it('should_fallback_to_localhost_in_non_production_when_api_base_url_is_missing', async () => {
    const { resolveApiBaseUrl } = await import('./apiClient.js')

    expect(resolveApiBaseUrl({ PROD: false, VITE_API_BASE_URL: '' })).toBe('http://localhost:8080')
  })

  it('should_throw_when_api_base_url_is_missing_in_production', async () => {
    const { resolveApiBaseUrl } = await import('./apiClient.js')

    expect(() => resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: '' })).toThrow(
      'VITE_API_BASE_URL is required for production builds.',
    )
  })

  it('should_throw_when_api_base_url_points_to_localhost_in_production', async () => {
    const { resolveApiBaseUrl } = await import('./apiClient.js')

    expect(() => resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: 'http://localhost:8080' })).toThrow(
      'VITE_API_BASE_URL must not point to localhost in production builds.',
    )
  })

  it('should_use_configured_api_base_url_in_production', async () => {
    const { resolveApiBaseUrl } = await import('./apiClient.js')

    expect(resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: 'https://api.cubing-hub.com' })).toBe(
      'https://api.cubing-hub.com',
    )
  })

  it('should_trim_configured_api_base_url_when_non_production_env_uses_explicit_value', async () => {
    const { resolveApiBaseUrl } = await import('./apiClient.js')

    expect(resolveApiBaseUrl({ PROD: false, VITE_API_BASE_URL: ' https://dev-api.cubing-hub.com ' })).toBe(
      'https://dev-api.cubing-hub.com',
    )
  })

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

  it('should_clear_access_token_and_throw_when_refresh_response_has_no_access_token', async () => {
    const { mock, getStoredAccessToken, refreshAccessToken, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('expired-token')
    mock.onPost('/api/auth/refresh').replyOnce(200, {
      data: {},
    })

    await expect(refreshAccessToken()).rejects.toThrow('인증 정보를 갱신하지 못했습니다. 다시 로그인해주세요.')
    expect(getStoredAccessToken()).toBeNull()

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

  it('should_not_retry_login_request_when_login_request_returns_401', async () => {
    const { apiClient, mock, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('expired-token')
    mock.onPost('/api/auth/login').replyOnce(401)

    await expect(apiClient.post('/api/auth/login', { email: 'member@cubinghub.com' })).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })

    expect(mock.history.post.filter((request) => request.url === '/api/auth/refresh')).toHaveLength(0)

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

  it('should_create_header_maps_when_request_interceptor_handles_form_data_and_auth_tokens', async () => {
    const { apiClient, setStoredAccessToken } = await setupApiClientHarness()
    const formData = new FormData()

    formData.append('images', new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' }))
    setStoredAccessToken('stored-token')

    const requestHandler = apiClient.interceptors.request.handlers[0].fulfilled
    const config = requestHandler({
      url: '/api/posts',
      data: formData,
    })

    expect(getHeaderValue(config.headers, 'Content-Type')).toBeUndefined()
    expect(getHeaderValue(config.headers, 'Authorization')).toBe('Bearer stored-token')
  })

  it('should_create_header_map_when_request_has_access_token_and_no_existing_headers', async () => {
    const { apiClient, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('stored-token')

    const requestHandler = apiClient.interceptors.request.handlers[0].fulfilled
    const config = requestHandler({
      url: '/api/protected',
    })

    expect(getHeaderValue(config.headers, 'Authorization')).toBe('Bearer stored-token')
  })

  it('should_remove_existing_plain_object_content_type_headers_when_form_data_is_sent', async () => {
    const { apiClient, mock } = await setupApiClientHarness()
    const formData = new FormData()

    formData.append('images', new File(['image-data'], 'cube.jpg', { type: 'image/jpeg' }))
    mock.onPost('/api/posts').reply((config) => [
      200,
      {
        contentType: getHeaderValue(config.headers, 'Content-Type') ?? null,
      },
    ])

    const response = await apiClient.post('/api/posts', formData, {
      headers: {
        'Content-Type': 'application/json',
        'content-type': 'application/json',
      },
    })

    expect(response.data.contentType).not.toBe('application/json')

    mock.restore()
  })

  it('should_reject_refresh_requests_without_retry_when_request_config_is_missing', async () => {
    const { apiClient } = await setupApiClientHarness()

    await expect(
      apiClient.interceptors.response.handlers[0].rejected({
        response: { status: 401 },
      }),
    ).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })
  })

  it('should_retry_with_created_header_map_when_401_request_has_no_headers', async () => {
    const { apiClient, mock, getStoredAccessToken, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('expired-token')
    mock.onPost('/api/auth/refresh').replyOnce(200, {
      data: {
        accessToken: 'fresh-token',
      },
    })
    mock.onGet('/api/protected').reply((config) => [
      200,
      {
        authorization: getHeaderValue(config.headers, 'Authorization'),
      },
    ])

    const response = await apiClient.interceptors.response.handlers[0].rejected({
      config: {
        method: 'get',
        url: '/api/protected',
      },
      response: {
        status: 401,
      },
    })

    expect(getStoredAccessToken()).toBe('fresh-token')
    expect(response.data.authorization).toBe('Bearer fresh-token')

    mock.restore()
  })

  it('should_preserve_existing_authorization_header_when_request_explicitly_sets_it', async () => {
    const { apiClient, mock, setStoredAccessToken } = await setupApiClientHarness()

    setStoredAccessToken('stored-token')
    mock.onGet('/api/protected').reply((config) => [
      200,
      {
        authorization: getHeaderValue(config.headers, 'Authorization'),
      },
    ])

    const response = await apiClient.get('/api/protected', {
      headers: {
        Authorization: 'Bearer explicit-token',
      },
    })

    expect(response.data.authorization).toBe('Bearer explicit-token')

    mock.restore()
  })
})
