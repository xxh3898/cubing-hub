import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createAdminMemo, getAdminFeedbacks, getAdminMemos } from '../api.js'
import AdminPage, { formatFeedbackType, toPreview } from './AdminPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createAdminMemo: vi.fn(),
  getAdminFeedbacks: vi.fn(),
  getAdminMemos: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function createFeedbackPageResponse({
  items,
  page = 1,
  size = 8,
  totalElements = items.length,
  totalPages = items.length === 0 ? 0 : 1,
  hasNext = false,
  hasPrevious = page > 1,
}) {
  return {
    data: {
      items,
      page,
      size,
      totalElements,
      totalPages,
      hasNext,
      hasPrevious,
    },
  }
}

function createMemoPageResponse({
  items,
  page = 1,
  size = 8,
  totalElements = items.length,
  totalPages = items.length === 0 ? 0 : 1,
  hasNext = false,
  hasPrevious = page > 1,
}) {
  return {
    data: {
      items,
      page,
      size,
      totalElements,
      totalPages,
      hasNext,
      hasPrevious,
    },
  }
}

function renderAdminPage() {
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_render_feedback_cards_when_requests_succeed', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(
      createFeedbackPageResponse({
        items: [
          {
            id: 1,
            type: 'UX',
            answered: true,
            visibility: 'PUBLIC',
            createdAt: '2026-04-24T10:00:00',
            title: '첫 피드백 질문',
            content: '가'.repeat(150),
            answer: '나'.repeat(130),
          },
          {
            id: 2,
            type: 'ETC',
            answered: false,
            visibility: 'PRIVATE',
            createdAt: '2026-04-24T10:10:00',
            title: '둘째 피드백 질문',
            content: '로그인이 되지 않습니다.',
            answer: '',
          },
        ],
      }),
    )
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))

    renderAdminPage()

    expect(screen.getByText('관리자 피드백 목록을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('첫 피드백 질문')).toBeInTheDocument()
    expect(screen.getByText('사용성')).toBeInTheDocument()
    expect(screen.getByText('기타')).toBeInTheDocument()
    expect(screen.getByText(`${'가'.repeat(130)}...`)).toBeInTheDocument()
    expect(screen.getByText(`답변: ${'나'.repeat(110)}...`)).toBeInTheDocument()
    expect(screen.getByText('아직 답변이 없습니다.')).toBeInTheDocument()
    expect(getAdminFeedbacks).toHaveBeenCalledWith({
      answered: undefined,
      visibility: undefined,
      page: 1,
      size: 8,
    })
    expect(getAdminMemos).toHaveBeenCalledWith({
      page: 1,
      size: 8,
    })
  })

  it('should_format_admin_preview_and_feedback_type_helpers', () => {
    expect(toPreview('', 90)).toBe('')
    expect(formatFeedbackType('BUG')).toBe('버그')
    expect(formatFeedbackType('ETC')).toBe('기타')
  })

  it('should_retry_feedback_loading_when_retry_button_is_clicked_after_error', async () => {
    vi.mocked(getAdminFeedbacks)
      .mockRejectedValueOnce(new Error('관리자 피드백 조회 실패'))
      .mockResolvedValueOnce(
        createFeedbackPageResponse({
          items: [
            {
              id: 2,
              type: 'FEATURE',
              answered: true,
              visibility: 'PUBLIC',
              createdAt: '2026-04-24T11:00:00',
              title: '재시도 후 노출된 피드백',
              content: '정상적으로 다시 불러왔습니다.',
              answer: '답변이 등록되었습니다.',
            },
          ],
        }),
      )
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))

    renderAdminPage()

    expect(await screen.findByText('관리자 피드백 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('재시도 후 노출된 피드백')).toBeInTheDocument()
    expect(getAdminFeedbacks).toHaveBeenCalledTimes(2)
  })

  it('should_create_admin_memo_and_navigate_when_form_is_submitted', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))
    vi.mocked(createAdminMemo).mockResolvedValue({
      data: {
        id: 19,
      },
    })

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '새로운 운영 질문' } })
    fireEvent.change(screen.getByLabelText('답변'), { target: { value: '정리된 답변입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '메모 만들기' }))

    await waitFor(() => {
      expect(createAdminMemo).toHaveBeenCalledWith({
        question: '새로운 운영 질문',
        answer: '정리된 답변입니다.',
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/admin/memos/19')
  })

  it('should_update_feedback_filters_and_reset_page_when_filters_change', async () => {
    vi.mocked(getAdminFeedbacks)
      .mockResolvedValueOnce(
        createFeedbackPageResponse({
          items: [
            {
              id: 1,
              type: 'BUG',
              answered: false,
              visibility: 'PRIVATE',
              createdAt: '2026-04-24T10:00:00',
              title: '첫 페이지 질문',
              content: '첫 페이지 본문',
              answer: '',
            },
          ],
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createFeedbackPageResponse({
          items: [
            {
              id: 8,
              type: 'FEATURE',
              answered: false,
              visibility: 'PRIVATE',
              createdAt: '2026-04-24T10:00:00',
              title: '둘째 페이지 질문',
              content: '둘째 페이지 본문',
              answer: '',
            },
          ],
          page: 2,
          totalPages: 2,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createFeedbackPageResponse({
          items: [
            {
              id: 10,
              type: 'FEATURE',
              answered: true,
              visibility: 'PRIVATE',
              createdAt: '2026-04-24T10:00:00',
              title: '답변 필터 질문',
              content: '답변 필터 본문',
              answer: '답변 완료',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createFeedbackPageResponse({
          items: [
            {
              id: 11,
              type: 'FEATURE',
              answered: true,
              visibility: 'PUBLIC',
              createdAt: '2026-04-24T10:00:00',
              title: '필터 적용 질문',
              content: '필터 적용 본문',
              answer: '답변 완료',
            },
          ],
        }),
      )
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))

    renderAdminPage()

    expect(await screen.findByText('첫 페이지 질문')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('둘째 페이지 질문')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('답변 여부'), {
      target: { value: 'ANSWERED' },
    })
    fireEvent.change(screen.getByLabelText('공개 여부'), {
      target: { value: 'PUBLIC' },
    })

    expect(await screen.findByText('필터 적용 질문')).toBeInTheDocument()
    expect(getAdminFeedbacks).toHaveBeenLastCalledWith({
      answered: true,
      visibility: 'PUBLIC',
      page: 1,
      size: 8,
    })
  })

  it('should_retry_memo_loading_when_retry_button_is_clicked_after_error', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos)
      .mockRejectedValueOnce(new Error('관리자 메모 조회 실패'))
      .mockResolvedValueOnce(
        createMemoPageResponse({
          items: [
            {
              id: 5,
              question: '가'.repeat(120),
              answer: '답변이 있습니다.',
              answerStatus: 'ANSWERED',
              updatedAt: '2026-04-24T12:00:00',
            },
          ],
        }),
      )

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))

    expect(await screen.findByText('관리자 메모 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText(`${'가'.repeat(90)}...`)).toBeInTheDocument()
    expect(getAdminMemos).toHaveBeenCalledTimes(2)
  })

  it('should_show_validation_message_when_new_memo_question_is_blank', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('답변'), { target: { value: '메모 답변' } })
    fireEvent.click(screen.getByRole('button', { name: '메모 만들기' }))

    expect(await screen.findByText('질문을 입력해주세요.')).toBeInTheDocument()
    expect(createAdminMemo).not.toHaveBeenCalled()
  })

  it('should_render_unanswered_memo_card_without_answer_text', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockResolvedValue(
      createMemoPageResponse({
        items: [
          {
            id: 7,
            question: '미답변 메모',
            answer: '',
            answerStatus: 'UNANSWERED',
            updatedAt: '2026-04-24T12:00:00',
          },
        ],
      }),
    )

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))

    expect(await screen.findByText('미답변 메모')).toBeInTheDocument()
    expect(screen.getByText('미답변')).toBeInTheDocument()
    expect(screen.getByText('아직 답변이 없습니다.')).toBeInTheDocument()
  })

  it('should_ignore_pending_feedback_and_memo_errors_when_component_is_unmounted', async () => {
    let rejectFeedbacks
    let rejectMemos
    vi.mocked(getAdminFeedbacks).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFeedbacks = reject
        }),
    )
    vi.mocked(getAdminMemos).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectMemos = reject
        }),
    )

    const { unmount } = render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )

    unmount()
    rejectFeedbacks(new Error('late feedback failure'))
    rejectMemos(new Error('late memo failure'))

    await waitFor(() => {
      expect(getAdminFeedbacks).toHaveBeenCalledTimes(1)
      expect(getAdminMemos).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_memo_success_when_component_is_unmounted', async () => {
    let resolveMemos
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMemos = resolve
        }),
    )

    const { unmount } = render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )

    unmount()
    resolveMemos(createMemoPageResponse({ items: [] }))

    await waitFor(() => {
      expect(getAdminMemos).toHaveBeenCalledTimes(1)
    })
  })

  it('should_show_error_message_when_memo_creation_fails', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))
    vi.mocked(createAdminMemo).mockRejectedValue(new Error('관리자 메모 생성 실패'))

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '새로운 운영 질문' } })
    fireEvent.change(screen.getByLabelText('답변'), { target: { value: '정리된 답변입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '메모 만들기' }))

    expect(await screen.findByText('관리자 메모 생성 실패')).toBeInTheDocument()
  })

  it('should_render_empty_message_when_memo_list_is_empty', async () => {
    vi.mocked(getAdminFeedbacks).mockResolvedValue(createFeedbackPageResponse({ items: [] }))
    vi.mocked(getAdminMemos).mockResolvedValue(createMemoPageResponse({ items: [] }))

    renderAdminPage()

    await screen.findByText('조건에 맞는 피드백이 없습니다.')

    fireEvent.click(screen.getByRole('button', { name: '관리자 메모' }))

    expect(await screen.findByText('등록된 관리자 메모가 없습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '피드백' }))
    expect(await screen.findByText('조건에 맞는 피드백이 없습니다.')).toBeInTheDocument()
  })
})
