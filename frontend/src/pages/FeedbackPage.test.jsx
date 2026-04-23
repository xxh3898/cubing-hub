import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createFeedback } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import FeedbackPage from './FeedbackPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createFeedback: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

function renderFeedbackPage() {
  render(
    <MemoryRouter>
      <FeedbackPage />
    </MemoryRouter>,
  )
}

describe('FeedbackPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        email: 'member@cubinghub.com',
      },
    })
  })

  it('should_submit_feedback_and_reset_form_when_request_succeeds', async () => {
    vi.mocked(createFeedback).mockResolvedValue({
      message: '피드백이 접수되었습니다. 감사합니다!',
      data: {
        id: 7,
      },
    })

    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('피드백 종류'), { target: { value: 'FEATURE' } })
    fireEvent.change(screen.getByLabelText('회신 이메일'), { target: { value: 'reply@cubinghub.com' } })
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '기능 제안' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '이런 기능이 있으면 좋겠습니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith({
        type: 'FEATURE',
        replyEmail: 'reply@cubinghub.com',
        title: '기능 제안',
        content: '이런 기능이 있으면 좋겠습니다.',
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('피드백이 접수되었습니다. 감사합니다!')
    })

    expect(screen.queryByText(/Discord/)).not.toBeInTheDocument()
    expect(screen.queryByText(/알림 시도/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discord 알림 재시도' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('회신 이메일')).toHaveValue('member@cubinghub.com')
    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(screen.getByLabelText('내용')).toHaveValue('')
    expect(screen.getByLabelText('피드백 종류')).toHaveValue('BUG')
  })

  it('should_show_validation_message_when_title_or_content_is_blank', async () => {
    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('회신 이메일'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    expect(await screen.findByText('회신 이메일, 제목, 내용을 모두 입력해주세요.')).toBeInTheDocument()
    expect(createFeedback).not.toHaveBeenCalled()
  })

  it('should_show_validation_message_when_reply_email_format_is_invalid', async () => {
    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('회신 이메일'), { target: { value: 'invalid-email' } })
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '버그 제보' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '재현 경로입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    expect(await screen.findByText('올바른 이메일 주소를 입력해주세요.')).toBeInTheDocument()
    expect(createFeedback).not.toHaveBeenCalled()
  })

  it('should_show_error_message_when_feedback_request_fails', async () => {
    vi.mocked(createFeedback).mockRejectedValue(new Error('피드백 저장 실패'))

    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '버그 제보' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '재현 경로입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('피드백 저장 실패')
    })

    expect(screen.queryByText('피드백 저장 실패')).not.toBeInTheDocument()
  })

  it('should_disable_feedback_form_while_feedback_request_is_submitting', async () => {
    let resolveRequest
    vi.mocked(createFeedback).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '버그 제보' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '재현 경로입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    expect(screen.getByLabelText('피드백 종류')).toBeDisabled()
    expect(screen.getByLabelText('회신 이메일')).toBeDisabled()
    expect(screen.getByLabelText('제목')).toBeDisabled()
    expect(screen.getByLabelText('내용')).toBeDisabled()
    expect(screen.getByRole('button', { name: '제출 중...' })).toBeDisabled()

    resolveRequest({
      message: '피드백이 접수되었습니다. 감사합니다!',
      data: {
        id: 1,
      },
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('피드백이 접수되었습니다. 감사합니다!')
    })
  })

  it('should_clear_feedback_message_when_feedback_field_changes_after_validation_error', async () => {
    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('회신 이메일'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    expect(await screen.findByText('회신 이메일, 제목, 내용을 모두 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '내용 수정' } })

    expect(screen.queryByText('회신 이메일, 제목, 내용을 모두 입력해주세요.')).not.toBeInTheDocument()
  })

  it('should_apply_input_length_limits_to_feedback_fields', () => {
    renderFeedbackPage()

    expect(screen.getByLabelText('회신 이메일')).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText('제목')).toHaveAttribute('maxLength', '100')
    expect(screen.getByLabelText('내용')).toHaveAttribute('maxLength', '2000')
  })
})
