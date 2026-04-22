import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createFeedback, retryFeedbackNotification } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import FeedbackPage from './FeedbackPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createFeedback: vi.fn(),
  retryFeedbackNotification: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
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
      message: '피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다.',
      data: {
        id: 1,
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 1,
        notificationRetryAvailable: false,
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
      expect(toast.success).toHaveBeenCalledWith('피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다.')
    })

    expect(screen.getByText('Discord 알림 전송 완료')).toBeInTheDocument()
    expect(screen.getByText('피드백 ID #1')).toBeInTheDocument()
    expect(screen.getByText('알림 시도 1회')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discord 알림 재시도' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('회신 이메일')).toHaveValue('member@cubinghub.com')
    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(screen.getByLabelText('내용')).toHaveValue('')
    expect(screen.getByLabelText('피드백 종류')).toHaveValue('BUG')
  })

  it('should_show_retry_button_when_feedback_is_saved_but_discord_notification_fails', async () => {
    vi.mocked(createFeedback).mockResolvedValue({
      message: '피드백이 저장되었지만 Discord 운영 알림 전송에 실패했습니다. 다시 시도해주세요.',
      data: {
        id: 7,
        notificationStatus: 'FAILED',
        notificationAttemptCount: 1,
        notificationRetryAvailable: true,
      },
    })

    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '버그 제보' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '재현 경로입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('피드백이 저장되었지만 Discord 운영 알림 전송에 실패했습니다. 다시 시도해주세요.')
    })

    expect(screen.getByText('Discord 알림 전송 실패')).toBeInTheDocument()
    expect(screen.getByText('피드백 ID #7')).toBeInTheDocument()
    expect(screen.getByText('알림 시도 1회')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discord 알림 재시도' })).toBeInTheDocument()
  })

  it('should_retry_feedback_notification_when_retry_button_is_clicked', async () => {
    vi.mocked(createFeedback).mockResolvedValue({
      message: '피드백이 저장되었지만 Discord 운영 알림 전송에 실패했습니다. 다시 시도해주세요.',
      data: {
        id: 9,
        notificationStatus: 'FAILED',
        notificationAttemptCount: 1,
        notificationRetryAvailable: true,
      },
    })
    vi.mocked(retryFeedbackNotification).mockResolvedValue({
      message: 'Discord 운영 알림 재전송을 완료했습니다.',
      data: {
        id: 9,
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 2,
        notificationRetryAvailable: false,
      },
    })

    renderFeedbackPage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '버그 제보' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '재현 경로입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '제출하기' }))

    expect(await screen.findByRole('button', { name: 'Discord 알림 재시도' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discord 알림 재시도' }))

    await waitFor(() => {
      expect(retryFeedbackNotification).toHaveBeenCalledWith(9)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Discord 운영 알림 재전송을 완료했습니다.')
    })

    expect(screen.getByText('Discord 알림 전송 완료')).toBeInTheDocument()
    expect(screen.getByText('알림 시도 2회')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discord 알림 재시도' })).not.toBeInTheDocument()
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
      message: '피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다.',
      data: {
        id: 1,
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 1,
        notificationRetryAvailable: false,
      },
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('피드백이 접수되었고 Discord 운영 알림 전송을 완료했습니다.')
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
})
