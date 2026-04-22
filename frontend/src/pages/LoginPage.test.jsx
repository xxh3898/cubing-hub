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

function renderLoginPage() {
  render(
    <MemoryRouter>
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

    expect(await screen.findByText('세션 쿠키를 정리했습니다. 다시 로그인해주세요.')).toBeInTheDocument()
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
})
