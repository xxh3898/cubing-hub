import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { confirmPasswordReset, requestPasswordReset } from '../api.js'
import ResetPasswordPage from './ResetPasswordPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  confirmPasswordReset: vi.fn(),
  requestPasswordReset: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderResetPasswordPage() {
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_request_password_reset_code_when_email_is_entered', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: '인증번호를 전송했습니다. 이메일을 확인해주세요.',
      data: null,
    })

    renderResetPasswordPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'member@cubinghub.com' })
    })

    expect(await screen.findByText('인증번호를 전송했습니다. 이메일을 확인해주세요.')).toBeInTheDocument()
  })

  it('should_redirect_to_login_when_password_reset_confirm_succeeds', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue({
      message: '비밀번호가 재설정되었습니다. 다시 로그인해주세요.',
      data: null,
    })

    renderResetPasswordPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'newPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        email: 'member@cubinghub.com',
        code: '123456',
        newPassword: 'newPassword123!',
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        notice: '비밀번호가 재설정되었습니다. 다시 로그인해주세요.',
        email: 'member@cubinghub.com',
      },
    })
  })
})
