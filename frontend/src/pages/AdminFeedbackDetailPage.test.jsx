import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getAdminFeedback, updateAdminFeedbackAnswer, updateAdminFeedbackVisibility } from '../api.js'
import AdminFeedbackDetailPage, { formatDateTime, formatFeedbackType } from './AdminFeedbackDetailPage.jsx'

vi.mock('../api.js', () => ({
  getAdminFeedback: vi.fn(),
  updateAdminFeedbackAnswer: vi.fn(),
  updateAdminFeedbackVisibility: vi.fn(),
}))

function renderAdminFeedbackDetailPage(path = '/admin/feedbacks/5') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/feedbacks/:id" element={<AdminFeedbackDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminFeedbackDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_format_admin_feedback_detail_helpers', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatFeedbackType('UX')).toBe('사용성')
    expect(formatFeedbackType('OTHER')).toBe('기타')
  })

  it('should_render_error_message_when_route_param_is_invalid', async () => {
    renderAdminFeedbackDetailPage('/admin/feedbacks/not-a-number')

    expect(await screen.findByText('피드백을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getAdminFeedback).not.toHaveBeenCalled()
  })

  it('should_save_answer_and_visibility_when_form_is_submitted', async () => {
    const initialDetail = {
      id: 5,
      type: 'BUG',
      title: '로그인 오류',
      answered: false,
      visibility: 'PRIVATE',
      submitterNickname: 'CubeUser',
      replyEmail: 'reply@cubinghub.com',
      createdAt: '2026-04-24T10:00:00',
      notificationStatus: 'SUCCESS',
      notificationAttemptCount: 1,
      content: '로그인이 되지 않습니다.',
      answer: '',
      answeredAt: null,
      publishedAt: null,
    }
    const answeredDetail = {
      ...initialDetail,
      answered: true,
      answer: '캐시를 비우고 다시 로그인해주세요.',
      answeredAt: '2026-04-24T11:00:00',
    }
    const publishedDetail = {
      ...answeredDetail,
      visibility: 'PUBLIC',
      publishedAt: '2026-04-24T11:05:00',
    }

    vi.mocked(getAdminFeedback).mockResolvedValue({ data: initialDetail })
    vi.mocked(updateAdminFeedbackAnswer).mockResolvedValue({ data: answeredDetail })
    vi.mocked(updateAdminFeedbackVisibility).mockResolvedValue({ data: publishedDetail })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('로그인 오류')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('답변'), {
      target: { value: '캐시를 비우고 다시 로그인해주세요.' },
    })
    fireEvent.change(screen.getByLabelText('공개 여부'), {
      target: { value: 'PUBLIC' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    await waitFor(() => {
      expect(updateAdminFeedbackAnswer).toHaveBeenCalledWith(5, {
        answer: '캐시를 비우고 다시 로그인해주세요.',
      })
    })

    await waitFor(() => {
      expect(updateAdminFeedbackVisibility).toHaveBeenCalledWith(5, {
        visibility: 'PUBLIC',
      })
    })

    expect(await screen.findByText('답변과 공개 설정을 저장했습니다.')).toBeInTheDocument()
  })

  it('should_render_error_message_when_detail_request_fails', async () => {
    vi.mocked(getAdminFeedback).mockRejectedValue(new Error('피드백 상세 조회 실패'))

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('피드백 상세 조회 실패')).toBeInTheDocument()
  })

  it('should_render_nothing_when_detail_response_is_null', async () => {
    vi.mocked(getAdminFeedback).mockResolvedValue({ data: null })

    const { container } = renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('should_show_validation_message_when_answer_is_blank', async () => {
    vi.mocked(getAdminFeedback).mockResolvedValue({
      data: {
        id: 5,
        type: 'UX',
        title: '사용성 질문',
        answered: false,
        visibility: 'PRIVATE',
        submitterNickname: 'CubeUser',
        replyEmail: 'reply@cubinghub.com',
        createdAt: '2026-04-24T10:00:00',
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 1,
        content: '질문 내용',
        answer: '',
        answeredAt: null,
        publishedAt: null,
      },
    })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('사용성 질문')).toBeInTheDocument()
    expect(screen.getByText('사용성')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('답변'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    expect(await screen.findByText('답변을 입력해주세요.')).toBeInTheDocument()
    expect(updateAdminFeedbackAnswer).not.toHaveBeenCalled()
    expect(updateAdminFeedbackVisibility).not.toHaveBeenCalled()
  })

  it('should_save_visibility_without_answer_update_when_answer_is_unchanged', async () => {
    const initialDetail = {
      id: 5,
      type: 'OTHER',
      title: '기타 질문',
      answered: true,
      visibility: 'PRIVATE',
      submitterNickname: 'CubeUser',
      replyEmail: 'reply@cubinghub.com',
      createdAt: '2026-04-24T10:00:00',
      notificationStatus: 'SUCCESS',
      notificationAttemptCount: 1,
      content: '질문 내용',
      answer: '기존 답변',
      answeredAt: '2026-04-24T11:00:00',
      publishedAt: null,
    }
    const publishedDetail = {
      ...initialDetail,
      visibility: 'PUBLIC',
      publishedAt: '2026-04-24T12:00:00',
    }

    vi.mocked(getAdminFeedback).mockResolvedValue({ data: initialDetail })
    vi.mocked(updateAdminFeedbackVisibility).mockResolvedValue({ data: publishedDetail })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('기타 질문')).toBeInTheDocument()
    expect(screen.getByText('기타')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('공개 여부'), {
      target: { value: 'PUBLIC' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    await waitFor(() => {
      expect(updateAdminFeedbackVisibility).toHaveBeenCalledWith(5, {
        visibility: 'PUBLIC',
      })
    })

    expect(updateAdminFeedbackAnswer).not.toHaveBeenCalled()
  })

  it('should_save_answer_without_visibility_update_when_visibility_is_unchanged', async () => {
    const initialDetail = {
      id: 5,
      type: 'BUG',
      title: '답변만 수정하는 질문',
      answered: false,
      visibility: 'PRIVATE',
      submitterNickname: 'CubeUser',
      replyEmail: 'reply@cubinghub.com',
      createdAt: '2026-04-24T10:00:00',
      notificationStatus: 'SUCCESS',
      notificationAttemptCount: 1,
      content: '질문 내용',
      answer: '',
      answeredAt: null,
      publishedAt: null,
    }
    const answeredDetail = {
      ...initialDetail,
      answered: true,
      answer: '답변만 저장했습니다.',
      answeredAt: '2026-04-24T11:00:00',
    }

    vi.mocked(getAdminFeedback).mockResolvedValue({ data: initialDetail })
    vi.mocked(updateAdminFeedbackAnswer).mockResolvedValue({ data: answeredDetail })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('답변만 수정하는 질문')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('답변'), {
      target: { value: '답변만 저장했습니다.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    await waitFor(() => {
      expect(updateAdminFeedbackAnswer).toHaveBeenCalled()
    })
    expect(updateAdminFeedbackVisibility).not.toHaveBeenCalled()
  })

  it('should_fallback_to_empty_answer_strings_when_feedback_detail_payload_omits_answer', async () => {
    const initialDetail = {
      id: 5,
      type: 'BUG',
      title: '답변 누락 질문',
      answered: false,
      visibility: 'PRIVATE',
      submitterNickname: 'CubeUser',
      replyEmail: 'reply@cubinghub.com',
      createdAt: '2026-04-24T10:00:00',
      notificationStatus: 'SUCCESS',
      notificationAttemptCount: 1,
      content: '질문 내용',
      answer: null,
      answeredAt: null,
      publishedAt: null,
    }
    const answeredDetail = {
      ...initialDetail,
      answered: true,
      answer: null,
      answeredAt: '2026-04-24T11:00:00',
    }

    vi.mocked(getAdminFeedback).mockResolvedValue({ data: initialDetail })
    vi.mocked(updateAdminFeedbackAnswer).mockResolvedValue({ data: answeredDetail })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('답변 누락 질문')).toBeInTheDocument()
    expect(screen.getByLabelText('답변')).toHaveValue('')

    fireEvent.change(screen.getByLabelText('답변'), {
      target: { value: '저장할 답변' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    await waitFor(() => {
      expect(updateAdminFeedbackAnswer).toHaveBeenCalledWith(5, {
        answer: '저장할 답변',
      })
    })
    expect(screen.getByLabelText('답변')).toHaveValue('')
  })

  it('should_show_error_message_when_save_request_fails', async () => {
    vi.mocked(getAdminFeedback).mockResolvedValue({
      data: {
        id: 5,
        type: 'BUG',
        title: '저장 실패 질문',
        answered: false,
        visibility: 'PRIVATE',
        submitterNickname: 'CubeUser',
        replyEmail: 'reply@cubinghub.com',
        createdAt: '2026-04-24T10:00:00',
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 1,
        content: '질문 내용',
        answer: '',
        answeredAt: null,
        publishedAt: null,
      },
    })
    vi.mocked(updateAdminFeedbackAnswer).mockRejectedValue(new Error('답변 저장 실패'))

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('저장 실패 질문')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('답변'), {
      target: { value: '저장할 답변' },
    })
    fireEvent.click(screen.getByRole('button', { name: '답변 저장' }))

    expect(await screen.findByText('답변 저장 실패')).toBeInTheDocument()
  })

  it('should_render_feature_type_and_empty_dates_when_detail_contains_sparse_values', async () => {
    vi.mocked(getAdminFeedback).mockResolvedValue({
      data: {
        id: 5,
        type: 'FEATURE',
        title: '기능 질문',
        answered: false,
        visibility: 'PRIVATE',
        submitterNickname: 'CubeUser',
        replyEmail: 'reply@cubinghub.com',
        createdAt: null,
        notificationStatus: 'FAILED',
        notificationAttemptCount: 0,
        content: '질문 내용',
        answer: '',
        answeredAt: null,
        publishedAt: null,
      },
    })

    renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    expect(await screen.findByText('기능 질문')).toBeInTheDocument()
    expect(screen.getByText('기능')).toBeInTheDocument()
    expect(screen.getByText('접수일 -')).toBeInTheDocument()
    expect(screen.getByText('답변일 -')).toBeInTheDocument()
    expect(screen.getByText('공개일 -')).toBeInTheDocument()
  })

  it('should_ignore_pending_feedback_detail_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getAdminFeedback).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    unmount()
    resolveRequest({
      data: {
        id: 5,
        type: 'BUG',
        title: '늦게 온 피드백',
        answered: false,
        visibility: 'PRIVATE',
        submitterNickname: 'CubeUser',
        replyEmail: 'reply@cubinghub.com',
        createdAt: '2026-04-24T10:00:00',
        notificationStatus: 'SUCCESS',
        notificationAttemptCount: 1,
        content: '질문 내용',
        answer: '',
        answeredAt: null,
        publishedAt: null,
      },
    })

    await waitFor(() => {
      expect(getAdminFeedback).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_feedback_detail_error_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getAdminFeedback).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = renderAdminFeedbackDetailPage('/admin/feedbacks/5')

    unmount()
    rejectRequest(new Error('late feedback detail failure'))

    await waitFor(() => {
      expect(getAdminFeedback).toHaveBeenCalledTimes(1)
    })
  })
})
