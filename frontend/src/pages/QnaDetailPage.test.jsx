import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getQnaDetail } from '../api.js'
import QnaDetailPage, { formatDateTime, formatFeedbackType } from './QnaDetailPage.jsx'

vi.mock('../api.js', () => ({
  getQnaDetail: vi.fn(),
}))

function renderQnaDetailPage(path = '/qna/1') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/qna/:id" element={<QnaDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('QnaDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_format_qna_detail_helpers', () => {
    expect(formatDateTime('2026-04-24T12:30:00')).toBe('2026년 4월 24일 오후 12시 30분')
    expect(formatFeedbackType('FEATURE')).toBe('기능')
    expect(formatFeedbackType('OTHER')).toBe('기타')
  })

  it('should_render_qna_detail_when_request_succeeds', async () => {
    vi.mocked(getQnaDetail).mockResolvedValue({
      data: {
        id: 1,
        type: 'BUG',
        title: '로그인 상세 질문',
        questionerLabel: '질문자 1',
        publishedAt: '2026-04-24T12:30:00',
        createdAt: '2026-04-24T10:10:00',
        content: '첫 줄 질문\n둘째 줄 질문',
        answererLabel: '운영팀',
        answeredAt: '2026-04-24T13:30:00',
        answer: '첫 줄 답변\n둘째 줄 답변',
      },
    })

    renderQnaDetailPage('/qna/1')

    expect(screen.getByText('질문 상세를 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('로그인 상세 질문')).toBeInTheDocument()
    expect(screen.getByText('첫 줄 질문')).toBeInTheDocument()
    expect(screen.getByText('첫 줄 답변')).toBeInTheDocument()
    expect(getQnaDetail).toHaveBeenCalledWith(1)
  })

  it('should_render_ux_type_when_ux_question_is_loaded', async () => {
    vi.mocked(getQnaDetail).mockResolvedValue({
      data: {
        id: 2,
        type: 'UX',
        title: '사용성 질문',
        questionerLabel: '질문자 2',
        publishedAt: '2026-04-24T12:30:00',
        createdAt: '2026-04-24T10:10:00',
        content: '질문 내용',
        answererLabel: '운영팀',
        answeredAt: '2026-04-24T13:30:00',
        answer: '답변 내용',
      },
    })

    renderQnaDetailPage('/qna/2')

    expect(await screen.findByText('사용성 질문')).toBeInTheDocument()
    expect(screen.getByText('사용성')).toBeInTheDocument()
  })

  it('should_render_not_found_message_when_response_data_is_null', async () => {
    vi.mocked(getQnaDetail).mockResolvedValue({ data: null })

    renderQnaDetailPage('/qna/3')

    expect(await screen.findByText('질문을 찾을 수 없습니다.')).toBeInTheDocument()
  })

  it('should_render_error_message_when_request_fails', async () => {
    vi.mocked(getQnaDetail).mockRejectedValue(new Error('질문 상세 조회 실패'))

    renderQnaDetailPage('/qna/1')

    expect(await screen.findByText('질문 상세 조회 실패')).toBeInTheDocument()
  })

  it('should_render_not_found_message_when_route_param_is_invalid', async () => {
    renderQnaDetailPage('/qna/not-a-number')

    expect(await screen.findByText('질문을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getQnaDetail).not.toHaveBeenCalled()
  })

  it('should_render_feature_type_when_feature_question_is_loaded', async () => {
    vi.mocked(getQnaDetail).mockResolvedValue({
      data: {
        id: 4,
        type: 'FEATURE',
        title: '기능 질문',
        questionerLabel: '질문자 4',
        publishedAt: '2026-04-24T12:30:00',
        createdAt: '2026-04-24T10:10:00',
        content: '기능 질문 내용',
        answererLabel: '운영팀',
        answeredAt: '2026-04-24T13:30:00',
        answer: '기능 답변 내용',
      },
    })

    renderQnaDetailPage('/qna/4')

    expect(await screen.findByText('기능 질문')).toBeInTheDocument()
    expect(screen.getByText('기능')).toBeInTheDocument()
  })

  it('should_render_other_type_when_unknown_question_type_is_loaded', async () => {
    vi.mocked(getQnaDetail).mockResolvedValue({
      data: {
        id: 5,
        type: 'OTHER',
        title: '기타 질문',
        questionerLabel: '질문자 5',
        publishedAt: '2026-04-24T12:30:00',
        createdAt: '2026-04-24T10:10:00',
        content: '기타 질문 내용',
        answererLabel: '운영팀',
        answeredAt: '2026-04-24T13:30:00',
        answer: '기타 답변 내용',
      },
    })

    renderQnaDetailPage('/qna/5')

    expect(await screen.findByText('기타 질문')).toBeInTheDocument()
    expect(screen.getByText('기타')).toBeInTheDocument()
  })

  it('should_ignore_pending_qna_detail_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getQnaDetail).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = render(
      <MemoryRouter initialEntries={['/qna/6']}>
        <Routes>
          <Route path="/qna/:id" element={<QnaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    unmount()
    resolveRequest({
      data: {
        id: 6,
        type: 'BUG',
        title: '늦게 온 질문',
        questionerLabel: '질문자',
        publishedAt: '2026-04-24T12:30:00',
        createdAt: '2026-04-24T10:10:00',
        content: '질문 내용',
        answererLabel: '운영팀',
        answeredAt: '2026-04-24T13:30:00',
        answer: '답변 내용',
      },
    })

    await waitFor(() => {
      expect(getQnaDetail).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_qna_detail_error_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getQnaDetail).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = render(
      <MemoryRouter initialEntries={['/qna/7']}>
        <Routes>
          <Route path="/qna/:id" element={<QnaDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    unmount()
    rejectRequest(new Error('late qna detail failure'))

    await waitFor(() => {
      expect(getQnaDetail).toHaveBeenCalledTimes(1)
    })
  })
})
