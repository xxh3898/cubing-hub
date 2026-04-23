import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createComment, deleteComment, getComments, getPost } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import CommunityDetailPage from './CommunityDetailPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  deletePost: vi.fn(),
  getComments: vi.fn(),
  getPost: vi.fn(),
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

function renderCommunityDetailPage(path = '/community/5') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/community/:id" element={<CommunityDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function createPostDetailResponse(overrides = {}) {
  return {
    data: {
      id: 5,
      category: 'FREE',
      title: '상세 제목',
      content: '첫 줄\n둘째 줄',
      authorNickname: 'Tester',
      viewCount: 12,
      createdAt: '2026-04-15T10:00:00',
      updatedAt: '2026-04-15T10:00:00',
      ...overrides,
    },
  }
}

function createCommentsPageResponse({
  items,
  page = 1,
  size = 5,
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

describe('CommunityDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('should_render_post_detail_and_comment_items_when_requests_succeed', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [
          { id: 2, authorNickname: 'OtherUser', content: '둘째 댓글', createdAt: '2026-04-15T11:00:00' },
          { id: 1, authorNickname: 'Tester', content: '첫 댓글', createdAt: '2026-04-15T10:30:00' },
        ],
      }),
    )

    renderCommunityDetailPage()

    expect(screen.getByText('게시글을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()
    expect(await screen.findByText('둘째 댓글')).toBeInTheDocument()
    expect(screen.getByText('댓글 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute('href', '/community/5/edit')

    expect(getComments).toHaveBeenCalledWith(5, { page: 1, size: 5 })
    expect(screen.getAllByRole('button', { name: '댓글 삭제' })).toHaveLength(1)
  })

  it('should_hide_edit_button_when_current_user_cannot_edit_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'OtherUser',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [],
        totalElements: 0,
        totalPages: 0,
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
  })

  it('should_submit_comment_and_reload_first_page_when_authenticated_user_creates_comment', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments)
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [{ id: 1, authorNickname: 'Tester', content: '기존 댓글', createdAt: '2026-04-15T10:30:00' }],
        }),
      )
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [
            { id: 2, authorNickname: 'Tester', content: '새 댓글', createdAt: '2026-04-15T11:00:00' },
            { id: 1, authorNickname: 'Tester', content: '기존 댓글', createdAt: '2026-04-15T10:30:00' },
          ],
        }),
      )
    vi.mocked(createComment).mockResolvedValue({
      data: {
        id: 2,
      },
    })

    renderCommunityDetailPage()

    expect(await screen.findByText('기존 댓글')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('댓글을 작성해주세요.'), { target: { value: '새 댓글' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith(5, { content: '새 댓글' })
    })
    expect(await screen.findByText('새 댓글')).toBeInTheDocument()
    expect(getComments).toHaveBeenLastCalledWith(5, { page: 1, size: 5 })
  })

  it('should_delete_comment_when_author_confirms', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments)
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [{ id: 1, authorNickname: 'Tester', content: '삭제 대상 댓글', createdAt: '2026-04-15T10:30:00' }],
        }),
      )
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [],
          totalElements: 0,
          totalPages: 0,
        }),
      )
    vi.mocked(deleteComment).mockResolvedValue({
      message: '댓글이 삭제되었습니다.',
    })

    renderCommunityDetailPage()

    expect(await screen.findByText('삭제 대상 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }))

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith(5, 1)
    })
    expect(await screen.findByText('아직 댓글이 없습니다. 첫 댓글을 남겨보세요!')).toBeInTheDocument()
  })

  it('should_render_login_cta_when_current_user_is_missing', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [],
        totalElements: 0,
        totalPages: 0,
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()
    expect(screen.getByText('댓글 작성은 로그인 후 이용할 수 있습니다.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인하러 가기' })).toBeInTheDocument()
  })

  it('should_request_next_comment_page_when_pagination_button_is_clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments)
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [{ id: 5, authorNickname: 'Tester', content: '첫 페이지 댓글', createdAt: '2026-04-15T10:30:00' }],
          totalElements: 6,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [{ id: 1, authorNickname: 'OtherUser', content: '둘째 페이지 댓글', createdAt: '2026-04-15T09:30:00' }],
          page: 2,
          totalElements: 6,
          totalPages: 2,
          hasNext: false,
          hasPrevious: true,
        }),
      )

    renderCommunityDetailPage()

    expect(await screen.findByText('첫 페이지 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('둘째 페이지 댓글')).toBeInTheDocument()
    expect(getComments).toHaveBeenLastCalledWith(5, { page: 2, size: 5 })
  })
})
