import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getQna } from '../api.js'
import QnaPage, { formatFeedbackType, toPreview } from './QnaPage.jsx'

vi.mock('../api.js', () => ({
  getQna: vi.fn(),
}))

function createQnaPageResponse({
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

function renderQnaPage() {
  render(
    <MemoryRouter>
      <QnaPage />
    </MemoryRouter>,
  )
}

describe('QnaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_render_qna_cards_when_request_succeeds', async () => {
    vi.mocked(getQna).mockResolvedValue(
      createQnaPageResponse({
        items: [
          {
            id: 1,
            type: 'BUG',
            title: '로그인 문제',
            content: '로그인 버튼을 눌러도 이동하지 않습니다.',
            answer: '캐시를 비우고 다시 시도해주세요.',
            questionerLabel: '질문자 1',
            answererLabel: '운영팀',
            createdAt: '2026-04-24T10:10:00',
            publishedAt: '2026-04-24T12:30:00',
          },
        ],
      }),
    )

    renderQnaPage()

    expect(screen.getByText('공개 질문 목록을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('로그인 문제')).toBeInTheDocument()
    const summary = screen.getByLabelText('Q&A 요약')

    expect(within(summary).getByText('1')).toBeInTheDocument()
    expect(within(summary).getByText('공개 답변')).toBeInTheDocument()
    expect(screen.getAllByText('운영팀')).toHaveLength(2)
    expect(screen.getByText('캐시를 비우고 다시 시도해주세요.')).toBeInTheDocument()
    expect(getQna).toHaveBeenCalledWith({
      page: 1,
      size: 8,
    })
  })

  it('should_format_qna_preview_and_feedback_type_helpers', () => {
    expect(toPreview('', 120)).toBe('')
    expect(formatFeedbackType('BUG')).toBe('버그')
    expect(formatFeedbackType('OTHER')).toBe('기타')
  })

  it('should_retry_loading_when_retry_button_is_clicked_after_error', async () => {
    vi.mocked(getQna)
      .mockRejectedValueOnce(new Error('공개 질문 목록 조회 실패'))
      .mockResolvedValueOnce(
        createQnaPageResponse({
          items: [
            {
              id: 2,
              type: 'FEATURE',
              title: '재시도 성공 질문',
              content: '재시도 후에는 정상 응답입니다.',
              answer: '해당 기능을 검토 중입니다.',
              questionerLabel: '질문자 2',
              answererLabel: '운영자',
              createdAt: '2026-04-24T09:00:00',
              publishedAt: '2026-04-24T13:00:00',
            },
          ],
        }),
      )

    renderQnaPage()

    expect(await screen.findByText('공개 질문 목록 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('재시도 성공 질문')).toBeInTheDocument()
    expect(getQna).toHaveBeenCalledTimes(2)
  })

  it('should_render_empty_message_when_no_published_qna_exists', async () => {
    vi.mocked(getQna).mockResolvedValue(
      createQnaPageResponse({
        items: [],
      }),
    )

    renderQnaPage()

    expect(await screen.findByText('아직 공개된 질문과 답변이 없습니다.')).toBeInTheDocument()
  })

  it('should_render_truncated_preview_and_unknown_type_when_long_unknown_feedback_is_loaded', async () => {
    vi.mocked(getQna).mockResolvedValue(
      createQnaPageResponse({
        items: [
          {
            id: 9,
            type: 'ETC',
            title: '긴 질문',
            content: '가'.repeat(130),
            answer: '나'.repeat(150),
            questionerLabel: '질문자 9',
            answererLabel: '운영팀',
            createdAt: '2026-04-24T10:10:00',
            publishedAt: '2026-04-24T12:30:00',
          },
        ],
      }),
    )

    renderQnaPage()

    expect(await screen.findByText('긴 질문')).toBeInTheDocument()
    expect(screen.getByText('기타')).toBeInTheDocument()
    expect(screen.getByText(`${'가'.repeat(120)}...`)).toBeInTheDocument()
    expect(screen.getByText(`${'나'.repeat(140)}...`)).toBeInTheDocument()
  })

  it('should_normalize_current_page_when_loaded_page_exceeds_total_pages', async () => {
    vi.mocked(getQna)
      .mockResolvedValueOnce(
        createQnaPageResponse({
          items: [
            {
              id: 1,
              type: 'FEATURE',
              title: '첫 페이지 질문',
              content: '첫 페이지 본문',
              answer: '첫 페이지 답변',
              questionerLabel: '질문자 1',
              answererLabel: '운영팀',
              createdAt: '2026-04-24T10:10:00',
              publishedAt: '2026-04-24T12:30:00',
            },
          ],
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createQnaPageResponse({
          items: [
            {
              id: 2,
              type: 'UX',
              title: '둘째 페이지 질문',
              content: '둘째 페이지 본문',
              answer: '둘째 페이지 답변',
              questionerLabel: '질문자 2',
              answererLabel: '운영팀',
              createdAt: '2026-04-24T10:10:00',
              publishedAt: '2026-04-24T12:30:00',
            },
          ],
          page: 2,
          totalPages: 1,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createQnaPageResponse({
          items: [
            {
              id: 3,
              type: 'UX',
              title: '보정된 페이지 질문',
              content: '',
              answer: '',
              questionerLabel: '질문자 3',
              answererLabel: '운영팀',
              createdAt: '2026-04-24T10:10:00',
              publishedAt: '2026-04-24T12:30:00',
            },
          ],
          page: 1,
          totalPages: 1,
        }),
      )

    renderQnaPage()

    expect(await screen.findByText('첫 페이지 질문')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('보정된 페이지 질문')).toBeInTheDocument()
    expect(screen.getByText('사용성')).toBeInTheDocument()
    expect(getQna).toHaveBeenNthCalledWith(2, {
      page: 2,
      size: 8,
    })

    await waitFor(() => {
      expect(getQna).toHaveBeenNthCalledWith(3, {
        page: 1,
        size: 8,
      })
    })
  })

  it('should_ignore_pending_qna_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getQna).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = render(
      <MemoryRouter>
        <QnaPage />
      </MemoryRouter>,
    )

    unmount()
    resolveRequest(createQnaPageResponse({
      items: [
        {
          id: 10,
          type: 'BUG',
          title: '늦게 온 질문',
          content: '질문 본문',
          answer: '답변 본문',
          questionerLabel: '질문자',
          answererLabel: '운영팀',
          createdAt: '2026-04-24T10:10:00',
          publishedAt: '2026-04-24T12:30:00',
        },
      ],
    }))

    await waitFor(() => {
      expect(getQna).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_qna_error_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getQna).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = render(
      <MemoryRouter>
        <QnaPage />
      </MemoryRouter>,
    )

    unmount()
    rejectRequest(new Error('late qna failure'))

    await waitFor(() => {
      expect(getQna).toHaveBeenCalledTimes(1)
    })
  })
})
