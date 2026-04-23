import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { confirmEmailVerification, requestEmailVerification, signUp } from '../api.js'
import SignupPage from './SignupPage.jsx'

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
    fireEvent.click(screen.getByRole('button', { name: '가입완료' }))

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
        notice: '이메일 인증 후 회원가입이 완료되었습니다. 로그인해주세요.',
        email: 'member@cubinghub.com',
      },
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
    expect(screen.getByRole('button', { name: '가입완료' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'other@cubinghub.com' } })

    expect(screen.queryByText('이메일 인증이 완료되었습니다.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가입완료' })).toBeDisabled()
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
})
