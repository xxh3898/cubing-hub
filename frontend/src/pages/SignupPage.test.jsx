import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { confirmEmailVerification, requestEmailVerification, signUp } from '../api.js'
import SignupPage, { getVerificationConfirmError, getVerificationRequestError } from './SignupPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  confirmEmailVerification: vi.fn(),
  requestEmailVerification: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderSignupPage() {
  render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  )
}

function renderSignupPageWithReturnTo(returnTo) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/signup', state: { from: returnTo } }]}>
      <SignupPage />
    </MemoryRouter>,
  )
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_request_email_verification_code_when_email_is_entered', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({
      message: '인증번호를 이메일로 전송했습니다.',
      data: null,
    })

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))

    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledWith({ email: 'member@cubinghub.com' })
    })

    expect(await screen.findByText('인증번호를 전송했습니다. 이메일을 확인해주세요.')).toBeInTheDocument()
  })

  it('should_validate_verification_requests_before_network_calls', () => {
    expect(getVerificationRequestError('')).toBe('이메일을 입력해주세요.')
    expect(getVerificationRequestError('member@cubinghub.com')).toBeNull()
    expect(getVerificationConfirmError('', '')).toBe('이메일과 인증번호를 모두 입력해주세요.')
    expect(getVerificationConfirmError('member@cubinghub.com', '')).toBe('이메일과 인증번호를 모두 입력해주세요.')
    expect(getVerificationConfirmError('member@cubinghub.com', '123456')).toBeNull()
  })

  it('should_submit_signup_when_email_verification_is_confirmed', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(signUp).mockResolvedValue({ message: 'ok', data: null })

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))
    await waitFor(() => {
      expect(confirmEmailVerification).toHaveBeenCalledWith({
        email: 'member@cubinghub.com',
        code: '123456',
      })
    })

    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'CubeMaster' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123!' } })
    fireEvent.click(screen.getByRole('button', { name: '가입 완료' }))

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'member@cubinghub.com',
        password: 'password123!',
        nickname: 'CubeMaster',
        mainEvent: 'WCA_333',
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        from: '/',
        notice: '회원가입이 완료되었습니다. 로그인해주세요.',
        email: 'member@cubinghub.com',
      },
    })
  })

  it('should_preserve_requested_return_path_when_signup_redirects_to_login', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(signUp).mockResolvedValue({ message: 'ok', data: null })

    renderSignupPageWithReturnTo('/community/5')

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))
    await screen.findByText('이메일 인증이 완료되었습니다.')

    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'CubeMaster' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123!' } })
    fireEvent.click(screen.getByRole('button', { name: '가입 완료' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          from: '/community/5',
          notice: '회원가입이 완료되었습니다. 로그인해주세요.',
          email: 'member@cubinghub.com',
        },
      })
    })
  })

  it('should_reset_verified_state_when_email_changes_after_confirmation', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'ok', data: null })

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))
    expect(await screen.findByText('이메일 인증이 완료되었습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가입 완료' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'other@cubinghub.com' } })

    expect(screen.queryByText('이메일 인증이 완료되었습니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가입 완료' })).toBeDisabled()
  })

  it('should_apply_input_length_limits_to_signup_fields', () => {
    renderSignupPage()

    expect(screen.getByLabelText('이메일')).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText('인증번호')).toHaveAttribute('maxLength', '6')
    expect(screen.getByLabelText('닉네임')).toHaveAttribute('maxLength', '50')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('maxLength', '64')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('minLength', '8')
    expect(screen.getByLabelText('비밀번호 확인')).toHaveAttribute('maxLength', '64')
  })

  it('should_show_error_message_when_verification_request_fails', async () => {
    vi.mocked(requestEmailVerification).mockRejectedValue(new Error('인증번호 전송 실패'))

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))

    expect(await screen.findByText('인증번호 전송 실패')).toBeInTheDocument()
  })

  it('should_show_error_message_when_verification_confirmation_fails', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockRejectedValue(new Error('인증번호 확인 실패'))

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))

    expect(await screen.findByText('인증번호 확인 실패')).toBeInTheDocument()
  })

  it('should_show_validation_message_when_signup_form_is_submitted_with_missing_fields', async () => {
    renderSignupPage()

    fireEvent.submit(screen.getByRole('button', { name: '가입 완료' }).closest('form'))

    expect(await screen.findByText('모든 입력란을 채워주세요.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('should_show_validation_message_when_signup_is_submitted_without_email_verification', async () => {
    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'CubeMaster' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123!' } })
    fireEvent.submit(screen.getByRole('button', { name: '가입 완료' }).closest('form'))

    expect(await screen.findByText('이메일 인증이 필요합니다.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('should_show_validation_message_when_signup_passwords_do_not_match', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'ok', data: null })

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))
    await screen.findByText('이메일 인증이 완료되었습니다.')

    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'CubeMaster' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'differentPassword!' } })
    fireEvent.submit(screen.getByRole('button', { name: '가입 완료' }).closest('form'))

    expect(await screen.findByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('should_show_error_message_when_signup_request_fails', async () => {
    vi.mocked(requestEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(confirmEmailVerification).mockResolvedValue({ message: 'ok', data: null })
    vi.mocked(signUp).mockRejectedValue(new Error('회원가입 실패'))

    renderSignupPage()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'member@cubinghub.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByLabelText('인증번호'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }))
    await screen.findByText('이메일 인증이 완료되었습니다.')

    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: 'CubeMaster' } })
    fireEvent.change(screen.getByLabelText('주 종목'), { target: { value: 'WCA_222' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'password123!' } })
    fireEvent.click(screen.getByRole('button', { name: '가입 완료' }))

    expect(await screen.findByText('회원가입 실패')).toBeInTheDocument()
    expect(signUp).toHaveBeenCalledWith({
      email: 'member@cubinghub.com',
      password: 'password123!',
      nickname: 'CubeMaster',
      mainEvent: 'WCA_222',
    })
  })

})
