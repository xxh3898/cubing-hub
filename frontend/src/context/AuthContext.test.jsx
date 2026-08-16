import { useState } from 'react'
import MockAdapter from 'axios-mock-adapter'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '../authStorage.js'
import { clearRefreshCookie, getMe, refreshSession } from '../api.js'
import apiClient from '../lib/apiClient.js'
import { clearPendingTimerSolve, loadPendingTimerSolve, PENDING_TIMER_SOLVE_SCHEMA_VERSION, savePendingTimerSolve } from '../lib/pendingTimerSolveStorage.js'
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

  const handleSetAndClearAccessToken = async () => {
    try {
      await setAccessToken('manual-token')
      clearAccessToken()
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
      <button type="button" onClick={handleSetAndClearAccessToken}>
        토큰 설정 후 즉시 정리
      </button>
      <button type="button" onClick={clearAccessToken}>
        세션 정리
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  let requestMock = null

  beforeEach(() => {
    clearStoredAccessToken()
    window.sessionStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    requestMock?.restore()
    requestMock = null
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

  it('should_clear_the_current_users_pending_timer_solve_before_another_account_can_sign_in', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe)
      .mockResolvedValueOnce({
        data: {
          userId: 41,
          nickname: 'AccountA',
          role: 'ROLE_USER',
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 42,
          nickname: 'AccountB',
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
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountA')
    })

    savePendingTimerSolve({
      schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
      userId: 41,
      eventType: 'WCA_333',
      timeMs: 1235,
      penalty: 'NONE',
      scramble: "R U R' U'",
      inputMethod: 'KEYBOARD',
      clientSubmissionId: 'd9428888-122b-4d3e-a58e-790c4e5f97ad',
      savedAt: '2026-08-10T13:00:00.000Z',
    })

    fireEvent.click(screen.getByRole('button', { name: '빈 토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })

    expect(loadPendingTimerSolve(41).snapshot).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountB')
    })

    expect(loadPendingTimerSolve(42).snapshot).toBeNull()
    clearPendingTimerSolve(41)
  })

  it('should_clear_the_confirmed_users_pending_solve_when_session_clear_follows_sign_in_immediately', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockResolvedValue({
      data: {
        userId: 41,
        nickname: 'AccountA',
        role: 'ROLE_USER',
      },
    })
    savePendingTimerSolve({
      schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
      userId: 41,
      eventType: 'WCA_333',
      timeMs: 1235,
      penalty: 'NONE',
      scramble: "R U R' U'",
      inputMethod: 'KEYBOARD',
      clientSubmissionId: 'd9428888-122b-4d3e-a58e-790c4e5f97ad',
      savedAt: '2026-08-10T13:00:00.000Z',
    })

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정 후 즉시 정리' }))

    await waitFor(() => {
      expect(screen.getByTestId('has-auth-token')).toHaveTextContent('false')
      expect(screen.getByTestId('nickname')).toHaveTextContent('none')
      expect(screen.getByTestId('is-auth-loading')).toHaveTextContent('false')
    })
    expect(loadPendingTimerSolve(41).snapshot).toBeNull()
  })

  it('should_preserve_the_current_users_pending_solve_when_a_record_401_refresh_fails_and_allow_the_same_account_to_sign_in_again', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe).mockResolvedValue({
      data: {
        userId: 41,
        nickname: 'AccountA',
        role: 'ROLE_USER',
      },
    })
    requestMock = new MockAdapter(apiClient)
    requestMock.onPost('/api/records').replyOnce(401)
    requestMock.onPost('/api/auth/refresh').networkErrorOnce()

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
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountA')
    })

    const pendingSnapshot = {
      schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
      userId: 41,
      eventType: 'WCA_333',
      timeMs: 1235,
      penalty: 'NONE',
      scramble: "R U R' U'",
      inputMethod: 'KEYBOARD',
      clientSubmissionId: 'd9428888-122b-4d3e-a58e-790c4e5f97ad',
      savedAt: '2026-08-10T13:00:00.000Z',
    }
    savePendingTimerSolve(pendingSnapshot)

    await expect(apiClient.post('/api/records', { timeMs: 1235 })).rejects.toThrow('Network Error')

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })
    expect(loadPendingTimerSolve(41).snapshot).toEqual(pendingSnapshot)

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountA')
    })
    expect(loadPendingTimerSolve(41).snapshot).toEqual(pendingSnapshot)

    clearPendingTimerSolve(41)
  })

  it('should_clear_the_previous_users_pending_solve_when_another_account_signs_in_after_passive_auth_loss', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe)
      .mockResolvedValueOnce({
        data: {
          userId: 41,
          nickname: 'AccountA',
          role: 'ROLE_USER',
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 42,
          nickname: 'AccountB',
          role: 'ROLE_USER',
        },
      })
    requestMock = new MockAdapter(apiClient)
    requestMock.onPost('/api/records').replyOnce(401)
    requestMock.onPost('/api/auth/refresh').networkErrorOnce()

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
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountA')
    })

    const pendingSnapshot = {
      schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
      userId: 41,
      eventType: 'WCA_333',
      timeMs: 1235,
      penalty: 'NONE',
      scramble: "R U R' U'",
      inputMethod: 'KEYBOARD',
      clientSubmissionId: 'd9428888-122b-4d3e-a58e-790c4e5f97ad',
      savedAt: '2026-08-10T13:00:00.000Z',
    }
    savePendingTimerSolve(pendingSnapshot)

    await expect(apiClient.post('/api/records', { timeMs: 1235 })).rejects.toThrow('Network Error')

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })
    expect(loadPendingTimerSolve(41).snapshot).toEqual(pendingSnapshot)

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountB')
    })
    expect(loadPendingTimerSolve(41).snapshot).toBeNull()
    expect(loadPendingTimerSolve(42).snapshot).toBeNull()
  })

  it('should_allow_an_account_switch_when_the_previous_user_has_no_pending_solve', async () => {
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error('refresh_token 쿠키가 필요합니다.'), {
      status: 400,
      isNetworkError: false,
    }))
    vi.mocked(getMe)
      .mockResolvedValueOnce({
        data: {
          userId: 41,
          nickname: 'AccountA',
          role: 'ROLE_USER',
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 42,
          nickname: 'AccountB',
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
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountA')
    })

    fireEvent.click(screen.getByRole('button', { name: '토큰 설정' }))

    await waitFor(() => {
      expect(screen.getByTestId('nickname')).toHaveTextContent('AccountB')
    })
    expect(loadPendingTimerSolve(41).snapshot).toBeNull()
    expect(loadPendingTimerSolve(42).snapshot).toBeNull()
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
