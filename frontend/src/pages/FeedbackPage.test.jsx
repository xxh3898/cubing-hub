import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createFeedback } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import FeedbackPage from './FeedbackPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createFeedback: vi.fn(),
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
      message: '피드백이 접수되었습니다.',
      data: {
        id: 1,
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

    expect(await screen.findByText('피드백이 접수되었습니다.')).toBeInTheDocument()
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

    expect(await screen.findByText('피드백 저장 실패')).toBeInTheDocument()
  })
})
