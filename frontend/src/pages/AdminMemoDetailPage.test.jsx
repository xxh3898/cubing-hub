import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { deleteAdminMemo, getAdminMemo, updateAdminMemo } from '../api.js'
import AdminMemoDetailPage, { formatDateTime } from './AdminMemoDetailPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  deleteAdminMemo: vi.fn(),
  getAdminMemo: vi.fn(),
  updateAdminMemo: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderAdminMemoDetailPage(path = '/admin/memos/7') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/memos/:id" element={<AdminMemoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminMemoDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_format_admin_memo_detail_dates', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatDateTime('2026-04-24T09:00:00')).toBe('2026년 4월 24일 오전 9시')
  })

  it('should_render_error_message_when_route_param_is_invalid', async () => {
    renderAdminMemoDetailPage('/admin/memos/not-a-number')

    expect(await screen.findByText('관리자 메모를 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getAdminMemo).not.toHaveBeenCalled()
  })

  it('should_save_admin_memo_when_form_is_submitted', async () => {
    const initialDetail = {
      id: 7,
      question: '기존 질문',
      answer: '',
      answerStatus: 'UNANSWERED',
      createdAt: '2026-04-24T09:00:00',
      updatedAt: '2026-04-24T09:00:00',
      answeredAt: null,
    }
    const updatedDetail = {
      ...initialDetail,
      question: '수정된 질문',
      answer: '정리된 답변',
      answerStatus: 'ANSWERED',
      updatedAt: '2026-04-24T10:00:00',
      answeredAt: '2026-04-24T10:00:00',
    }

    vi.mocked(getAdminMemo).mockResolvedValue({ data: initialDetail })
    vi.mocked(updateAdminMemo).mockResolvedValue({ data: updatedDetail })

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '수정된 질문' } })
    fireEvent.change(screen.getByLabelText('답변'), { target: { value: '정리된 답변' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(updateAdminMemo).toHaveBeenCalledWith(7, {
        question: '수정된 질문',
        answer: '정리된 답변',
      })
    })

    expect(await screen.findByText('관리자 메모를 저장했습니다.')).toBeInTheDocument()
  })

  it('should_delete_admin_memo_and_navigate_when_delete_is_confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '삭제할 질문',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })
    vi.mocked(deleteAdminMemo).mockResolvedValue({})

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteAdminMemo).toHaveBeenCalledWith(7)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
    confirmSpy.mockRestore()
  })

  it('should_render_error_message_when_detail_request_fails', async () => {
    vi.mocked(getAdminMemo).mockRejectedValue(new Error('관리자 메모 조회 실패'))

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 조회 실패')).toBeInTheDocument()
  })

  it('should_render_nothing_when_detail_response_is_null', async () => {
    vi.mocked(getAdminMemo).mockResolvedValue({ data: null })

    const { container } = renderAdminMemoDetailPage('/admin/memos/7')

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('should_show_validation_message_when_question_is_blank', async () => {
    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '기존 질문',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('질문을 입력해주세요.')).toBeInTheDocument()
    expect(updateAdminMemo).not.toHaveBeenCalled()
  })

  it('should_show_error_message_when_save_request_fails', async () => {
    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '기존 질문',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })
    vi.mocked(updateAdminMemo).mockRejectedValue(new Error('관리자 메모 저장 실패'))

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '수정된 질문' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('관리자 메모 저장 실패')).toBeInTheDocument()
  })

  it('should_not_delete_admin_memo_when_delete_is_not_confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '삭제 취소 질문',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(deleteAdminMemo).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('should_show_error_message_when_delete_request_fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '삭제 실패 질문',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })
    vi.mocked(deleteAdminMemo).mockRejectedValue(new Error('관리자 메모 삭제 실패'))

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('관리자 메모 삭제 실패')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('should_reset_null_answer_to_empty_string_when_save_succeeds', async () => {
    vi.mocked(getAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '기존 질문',
        answer: null,
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })
    vi.mocked(updateAdminMemo).mockResolvedValue({
      data: {
        id: 7,
        question: '기존 질문',
        answer: null,
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T10:00:00',
        answeredAt: null,
      },
    })

    renderAdminMemoDetailPage('/admin/memos/7')

    expect(await screen.findByText('관리자 메모 상세')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(updateAdminMemo).toHaveBeenCalledWith(7, {
        question: '기존 질문',
        answer: '',
      })
    })

    expect(screen.getByLabelText('답변')).toHaveValue('')
  })

  it('should_ignore_pending_memo_detail_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getAdminMemo).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = renderAdminMemoDetailPage('/admin/memos/7')

    unmount()
    resolveRequest({
      data: {
        id: 7,
        question: '늦게 온 메모',
        answer: '',
        answerStatus: 'UNANSWERED',
        createdAt: '2026-04-24T09:00:00',
        updatedAt: '2026-04-24T09:00:00',
        answeredAt: null,
      },
    })

    await waitFor(() => {
      expect(getAdminMemo).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_memo_detail_error_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getAdminMemo).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = renderAdminMemoDetailPage('/admin/memos/7')

    unmount()
    rejectRequest(new Error('late memo detail failure'))

    await waitFor(() => {
      expect(getAdminMemo).toHaveBeenCalledTimes(1)
    })
  })
})
