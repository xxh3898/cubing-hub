import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredAccessToken } from '../authStorage.js'
import { clearRefreshCookie, getMe, refreshSession } from '../api.js'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.js'

vi.mock('../api.js', () => ({
  clearRefreshCookie: vi.fn(),
  getMe: vi.fn(),
  refreshSession: vi.fn(),
}))

function AuthStateProbe() {
  const { currentUser, hasAuthToken, isAuthenticated, isAuthLoading } = useAuth()

  return (
    <div>
      <span data-testid="has-auth-token">{String(hasAuthToken)}</span>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="is-auth-loading">{String(isAuthLoading)}</span>
      <span data-testid="nickname">{currentUser?.nickname ?? 'none'}</span>
      <span data-testid="role">{currentUser?.role ?? 'none'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearStoredAccessToken()
    vi.clearAllMocks()
  })

  it('should_restore_current_user_when_refresh_and_me_requests_succeed_on_bootstrap', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockResolvedValue({
      data: {
        nickname: 'CubeMaster',
        role: 'ROLE_ADMIN',
      },
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('true')

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('CubeMaster')
      expect(screen.getByTestId('role')).toHaveTextContent('ROLE_ADMIN')
    })

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(getMe).toHaveBeenCalledTimes(1)
  })

  it('should_clear_auth_state_when_refresh_request_fails_on_bootstrap', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('유효하지 않거나 만료된 리프레시 토큰입니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(clearRefreshCookie).mockResolvedValue({
      message: 'refresh_token 쿠키를 정리했습니다.',
      data: null,
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
      expect(screen.getByTestId('role')).toHaveTextContent('none')
    })

    expect(getMe).not.toHaveBeenCalled()
    expect(clearRefreshCookie).toHaveBeenCalledTimes(1)
  })

  it('should_skip_refresh_cookie_cleanup_when_refresh_cookie_is_missing_on_bootstrap', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    expect(clearRefreshCookie).not.toHaveBeenCalled()
  })

  it('should_clear_auth_state_when_refresh_cookie_cleanup_fails_on_bootstrap', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('Network Error'), {
      status: null,
      isNetworkError: true,
    }))
    vi.mocked(clearRefreshCookie).mockRejectedValue(new Error('cleanup failed'))

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    expect(clearRefreshCookie).toHaveBeenCalledTimes(1)
  })
})
