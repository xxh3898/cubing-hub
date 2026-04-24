import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { confirmPasswordReset, requestPasswordReset } from '../api.js'
import ResetPasswordPage, { getResetCodeRequestError } from './ResetPasswordPage.jsx'

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

  it('should_validate_reset_code_request_before_network_call', () => {
    expect(getResetCodeRequestError('')).toBe('이메일을 입력해주세요.')
    expect(getResetCodeRequestError('member@cubinghub.com')).toBeNull()
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

  it('should_show_error_message_when_reset_code_request_fails', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new Error('인증번호 전송 실패'))

    renderResetPasswordPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))

    expect(await screen.findByText('인증번호 전송 실패')).toBeInTheDocument()
  })

  it('should_show_validation_message_when_reset_form_has_missing_fields', async () => {
    renderResetPasswordPage()

    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form'))

    expect(await screen.findByText('모든 입력란을 채워주세요.')).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('should_show_validation_message_when_reset_passwords_do_not_match', async () => {
    renderResetPasswordPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'otherPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('should_show_error_message_when_password_reset_request_fails', async () => {
    vi.mocked(confirmPasswordReset).mockRejectedValue(new Error('비밀번호 재설정 실패'))

    renderResetPasswordPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'newPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('비밀번호 재설정 실패')).toBeInTheDocument()
  })

})
