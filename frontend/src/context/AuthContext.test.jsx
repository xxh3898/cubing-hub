import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '../authStorage.js'
import { clearRefreshCookie, getMe, refreshSession } from '../api.js'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.js'

vi.mock('../api.js', () => ({
  clearRefreshCookie: vi.fn(),
  getMe: vi.fn(),
  refreshSession: vi.fn(),
}))

function AuthStateProbe() {
  const { clearAccessToken, currentUser, hasAuthToken, isAuthenticated, isAuthLoading, setAccessToken, updateCurrentUser } = useAuth()
  const [actionError, setActionError] = useState('none')

  const handleSetAccessToken = async (nextToken) => {
    try {
      await setAccessToken(nextToken)
      setActionError('none')
    } catch (error) {
      setActionError(error.message)
    }
  }

  return (
    <div>
      <span data-testid="has-auth-token">{String(hasAuthToken)}</span>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="is-auth-loading">{String(isAuthLoading)}</span>
      <span data-testid="nickname">{currentUser?.nickname ?? 'none'}</span>
      <span data-testid="role">{currentUser?.role ?? 'none'}</span>
      <span data-testid="action-error">{actionError}</span>
      <button type="button" onClick={() => updateCurrentUser({ nickname: 'SpeedMaster' })}>
        닉네임 갱신
      </button>
      <button type="button" onClick={() => updateCurrentUser(null)}>
        빈 사용자 갱신
      </button>
      <button type="button" onClick={() => handleSetAccessToken('manual-token')}>
        토큰 설정
      </button>
      <button type="button" onClick={() => handleSetAccessToken(null)}>
        빈 토큰 설정
      </button>
      <button type="button" onClick={clearAccessToken}>
        세션 정리
      </button>
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

  it('should_merge_current_user_without_refetch_when_update_current_user_is_called', async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId('nickname')).toHaveTextContent('CubeMaster')
    })

    fireEvent.click(screen.getByRole('button', { name: '닉네임 갱신' }))

    expect(screen.getByTestId('nickname')).toHaveTextContent('SpeedMaster')
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

  it('should_preserve_existing_stored_token_when_bootstrap_refresh_fails_before_new_token_is_stored', async () => {
    setStoredAccessToken('existing-token')
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('일시적인 오류'), {
      status: 500,
      isNetworkError: false,
    }))

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    expect(getStoredAccessToken()).toBe('existing-token')
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

  it('should_cleanup_refresh_cookie_when_refresh_request_returns_401_on_bootstrap', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('인증이 만료되었습니다.'), {
      status: 401,
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
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    expect(clearRefreshCookie).toHaveBeenCalledTimes(1)
  })

  it('should_keep_existing_stored_token_when_bootstrap_refresh_succeeds_with_preloaded_token', async () => {
    setStoredAccessToken('existing-token')
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockResolvedValue({
      data: {
        nickname: 'CubeMaster',
        role: 'ROLE_USER',
      },
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('CubeMaster')
    })

    expect(getStoredAccessToken()).toBe('existing-token')
  })

  it('should_treat_null_bootstrap_profile_payload_as_signed_out_user', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockResolvedValue({
      data: null,
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
    })
  })

  it('should_clear_auth_state_when_bootstrap_refresh_response_does_not_contain_access_token', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      data: {},
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    expect(getMe).not.toHaveBeenCalled()
  })

  it('should_clear_existing_stored_token_when_profile_request_fails_after_refresh_with_preloaded_token', async () => {
    setStoredAccessToken('existing-token')
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockRejectedValue(new Error('사용자 조회 실패'))

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
    })

    expect(getStoredAccessToken()).toBeNull()
  })

  it('should_set_current_user_when_manual_access_token_is_applied_successfully', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockResolvedValue({
      data: {
        nickname: 'ManualUser',
        role: 'ROLE_ADMIN',
      },
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('nickname')).toHaveTextContent('ManualUser')
      expect(screen.getByTestId('role')).toHaveTextContent('ROLE_ADMIN')
      expect(screen.getByTestId('action-error')).toHaveTextContent('none')
    })

    expect(getStoredAccessToken()).toBe('manual-token')
  })

  it('should_allow_manual_access_token_without_user_payload', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockResolvedValue({
      data: null,
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
      expect(screen.getByTestId('action-error')).toHaveTextContent('none')
    })
  })

  it('should_clear_stored_token_and_surface_error_when_manual_access_token_sync_fails', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockRejectedValue(new Error('사용자 조회 실패'))

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
      expect(screen.getByTestId('action-error')).toHaveTextContent('사용자 조회 실패')
    })

    expect(getStoredAccessToken()).toBeNull()
  })

  it('should_clear_session_when_manual_access_token_is_empty_or_clear_button_is_clicked', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockResolvedValue({
      data: {
        nickname: 'ManualUser',
        role: 'ROLE_USER',
      },
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByRole('button', { name: '빈 토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByRole('button', { name: '세션 정리' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
    })
  })

  it('should_ignore_null_updates_when_update_current_user_is_called_without_payload_or_user', async () => {
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
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '빈 사용자 갱신' }))

    expect(screen.getByTestId('nickname')).toHaveTextContent('none')
  })

  it('should_ignore_update_payload_when_current_user_is_missing', async () => {
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
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '닉네임 갱신' }))

    expect(screen.getByTestId('nickname')).toHaveTextContent('none')
  })

  it('should_ignore_bootstrap_success_when_provider_is_unmounted_before_refresh_resolves', async () => {
    let resolveRefresh
    vi.mocked(refreshSession).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )

    const { unmount } = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    unmount()
    resolveRefresh({
      data: {
        accessToken: 'bootstrap-token',
      },
    })

    await waitFor(() => {
      expect(refreshSession).toHaveBeenCalledTimes(1)
    })
    expect(getMe).not.toHaveBeenCalled()
  })

  it('should_ignore_bootstrap_profile_response_when_provider_is_unmounted_before_profile_sync_resolves', async () => {
    let resolveProfile
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        }),
    )

    const { unmount } = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getMe).toHaveBeenCalledTimes(1)
    })

    unmount()
    resolveProfile({
      data: {
        nickname: 'LateUser',
        role: 'ROLE_USER',
      },
    })

    await waitFor(() => {
      expect(refreshSession).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_bootstrap_profile_error_when_provider_is_unmounted_before_profile_sync_rejects', async () => {
    let rejectProfile
    vi.mocked(refreshSession).mockResolvedValue({
      data: {
        accessToken: 'bootstrap-token',
      },
    })
    vi.mocked(getMe).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectProfile = reject
        }),
    )

    const { unmount } = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getMe).toHaveBeenCalledTimes(1)
    })

    unmount()
    rejectProfile(new Error('late profile failure'))

    await waitFor(() => {
      expect(refreshSession).toHaveBeenCalledTimes(1)
    })
  })
})
