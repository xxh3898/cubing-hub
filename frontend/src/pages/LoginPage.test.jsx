import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { clearRefreshCookie, login } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import LoginPage from './LoginPage.jsx'

const mockNavigate = vi.fn()
const mockSetAccessToken = vi.fn()

vi.mock('../api.js', () => ({
  clearRefreshCookie: vi.fn(),
  login: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage(initialEntry = '/login') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      setAccessToken: mockSetAccessToken,
    })
  })

  it('should_show_retry_message_when_network_error_is_recovered_by_refresh_cookie_cleanup', async () => {
    vi.mocked(login).mockRejectedValue(Object.assign(new Error('Network Error'), {
      isNetworkError: true,
    }))
    vi.mocked(clearRefreshCookie).mockResolvedValue({
      message: 'refresh_token 쿠키를 정리했습니다.',
      data: null,
    })

    renderLoginPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(clearRefreshCookie).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('세션이 만료되었습니다. 다시 로그인해주세요.')).toBeInTheDocument()
    expect(mockSetAccessToken).not.toHaveBeenCalled()
  })

  it('should_show_original_error_when_refresh_cookie_cleanup_fails_after_network_error', async () => {
    vi.mocked(login).mockRejectedValue(Object.assign(new Error('Network Error'), {
      isNetworkError: true,
    }))
    vi.mocked(clearRefreshCookie).mockRejectedValue(new Error('cleanup failed'))

    renderLoginPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('Network Error')).toBeInTheDocument()
  })

  it('should_apply_input_length_limits_to_login_fields', () => {
    renderLoginPage()

    expect(screen.getByLabelText('이메일')).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('maxLength', '64')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('minLength', '8')
  })

  it('should_prefill_email_and_render_password_reset_link_when_redirect_state_exists', async () => {
    renderLoginPage({
      pathname: '/login',
      state: {
        notice: '비밀번호를 변경했습니다. 다시 로그인해주세요.',
        email: 'member@cubinghub.com',
      },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('이메일')).toHaveValue('member@cubinghub.com')
    })

    expect(screen.getByText('비밀번호를 변경했습니다. 다시 로그인해주세요.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '비밀번호 재설정' })).toHaveAttribute('href', '/reset-password')
  })
})
