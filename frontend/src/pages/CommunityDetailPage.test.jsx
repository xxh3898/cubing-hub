import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createComment, deleteComment, getComments, getPost } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import CommunityDetailPage, { formatCategoryLabel, formatCommunityDate } from './CommunityDetailPage.jsx'

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
  return render(
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
      attachments: [],
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
    expect(document.querySelector('.community-post-actions')).not.toBeNull()

    expect(getComments).toHaveBeenCalledWith(5, { page: 1, size: 5 })
    expect(screen.getAllByRole('button', { name: '댓글 삭제' })).toHaveLength(1)
  })

  it('should_format_category_and_date_helpers', () => {
    expect(formatCategoryLabel('NOTICE')).toBe('공지')
    expect(formatCategoryLabel('FREE')).toBe('자유')
    expect(formatCommunityDate('2026-04-15T10:05:00')).toBe('2026년 4월 15일 10:05')
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

  it('should_render_attachment_gallery_when_post_has_attachments', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse({
      attachments: [
        {
          id: 10,
          imageUrl: 'https://cdn.example.com/community/posts/cube.jpg',
          originalFileName: 'cube.jpg',
          displayOrder: 0,
        },
      ],
    }))
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [],
        totalElements: 0,
        totalPages: 0,
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByAltText('cube.jpg')).toHaveAttribute('src', 'https://cdn.example.com/community/posts/cube.jpg')
    expect(screen.getByText('cube.jpg')).toBeInTheDocument()
  })

  it('should_render_not_found_message_when_route_param_is_invalid', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
    })

    renderCommunityDetailPage('/community/not-a-number')

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getPost).not.toHaveBeenCalled()
    expect(getComments).not.toHaveBeenCalled()
  })

  it('should_render_default_not_found_message_when_post_payload_is_null', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
    })
    vi.mocked(getPost).mockResolvedValue({ data: null })
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))

    renderCommunityDetailPage()

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
  })

  it('should_render_post_error_message_when_post_request_fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockRejectedValue(new Error('게시글 조회 실패'))
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))

    renderCommunityDetailPage()

    expect(await screen.findByText('게시글 조회 실패')).toBeInTheDocument()
  })

  it('should_delete_post_when_author_confirms', async () => {
    const { deletePost } = await import('../api.js')

    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))
    vi.mocked(deletePost).mockResolvedValue({})

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deletePost).toHaveBeenCalledWith(5)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/community', { replace: true })
  })

  it('should_show_delete_error_message_when_post_delete_fails', async () => {
    const { deletePost } = await import('../api.js')

    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))
    vi.mocked(deletePost).mockRejectedValue(new Error('게시글 삭제 실패'))

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('게시글 삭제 실패')).toBeInTheDocument()
  })

  it('should_retry_comment_loading_when_comment_request_fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse({ category: 'NOTICE' }))
    vi.mocked(getComments)
      .mockRejectedValueOnce(new Error('댓글 조회 실패'))
      .mockResolvedValueOnce(
        createCommentsPageResponse({
          items: [{ id: 3, authorNickname: 'Tester', content: '복구된 댓글', createdAt: '2026-04-15T10:30:00' }],
        }),
      )

    renderCommunityDetailPage()

    expect(await screen.findByText('댓글 조회 실패')).toBeInTheDocument()
    expect(screen.getByText('공지')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('복구된 댓글')).toBeInTheDocument()
  })

  it('should_normalize_comment_page_when_requested_page_exceeds_total_pages', async () => {
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
          items: [{ id: 6, authorNickname: 'Tester', content: '정규화 전 댓글', createdAt: '2026-04-15T09:30:00' }],
          page: 2,
          totalElements: 6,
          totalPages: 1,
          hasPrevious: true,
        }),
      )

    renderCommunityDetailPage()

    expect(await screen.findByText('첫 페이지 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    })
    expect(screen.queryByText('정규화 전 댓글')).not.toBeInTheDocument()
  })

  it('should_render_guest_comment_list_without_delete_buttons', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [{ id: 1, authorNickname: 'OtherUser', content: '게스트 댓글', createdAt: '2026-04-15T10:30:00' }],
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByText('게스트 댓글')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '댓글 삭제' })).not.toBeInTheDocument()
  })

  it('should_fallback_to_comment_pagination_flags_when_server_omits_has_previous_and_has_next', async () => {
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
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 4, authorNickname: 'OtherUser', content: '둘째 페이지 댓글', createdAt: '2026-04-15T09:30:00' }],
          page: 2,
          size: 5,
          totalElements: 6,
          totalPages: 2,
        },
      })

    renderCommunityDetailPage()

    expect(await screen.findByText('첫 페이지 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('둘째 페이지 댓글')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('should_show_validation_and_request_error_when_comment_submission_fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))
    vi.mocked(createComment).mockRejectedValue(new Error('댓글 등록 실패'))

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('댓글을 작성해주세요.'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    expect(await screen.findByText('댓글 내용을 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('댓글을 작성해주세요.'), { target: { value: '등록 실패 댓글' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByText('댓글 등록 실패')).toBeInTheDocument()
  })

  it('should_show_comment_delete_error_message_when_delete_request_fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [{ id: 1, authorNickname: 'OtherUser', content: '삭제 실패 댓글', createdAt: '2026-04-15T10:30:00' }],
      }),
    )
    vi.mocked(deleteComment).mockRejectedValue(new Error('댓글 삭제 실패'))

    renderCommunityDetailPage()

    expect(await screen.findByText('삭제 실패 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }))

    expect(await screen.findByText('댓글 삭제 실패')).toBeInTheDocument()
  })

  it('should_ignore_pending_post_failure_when_component_is_unmounted', async () => {
    let rejectPost
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectPost = reject
        }),
    )
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))

    const { unmount } = renderCommunityDetailPage()

    unmount()
    rejectPost(new Error('late post failure'))

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledTimes(1)
      expect(getComments).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_comment_success_when_component_is_unmounted', async () => {
    let resolveComments
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveComments = resolve
        }),
    )

    const { unmount } = renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()

    unmount()
    resolveComments(createCommentsPageResponse({ items: [] }))

    await waitFor(() => {
      expect(getComments).toHaveBeenCalledTimes(1)
    })
  })

  it('should_not_delete_post_when_delete_confirmation_is_cancelled', async () => {
    const { deletePost } = await import('../api.js')
    vi.stubGlobal('confirm', vi.fn(() => false))
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(createCommentsPageResponse({ items: [] }))

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(deletePost).not.toHaveBeenCalled()
  })

  it('should_not_delete_comment_when_delete_confirmation_is_cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(getComments).mockResolvedValue(
      createCommentsPageResponse({
        items: [{ id: 1, authorNickname: 'Tester', content: '삭제 대상 댓글', createdAt: '2026-04-15T10:30:00' }],
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByText('삭제 대상 댓글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }))

    expect(deleteComment).not.toHaveBeenCalled()
  })

  it('should_ignore_pending_post_and_comment_requests_when_component_is_unmounted', async () => {
    let resolvePost
    let rejectComments
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
    })
    vi.mocked(getPost).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )
    vi.mocked(getComments).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectComments = reject
        }),
    )

    const { unmount } = renderCommunityDetailPage()

    unmount()
    resolvePost(createPostDetailResponse())
    rejectComments(new Error('늦게 온 댓글 실패'))

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledTimes(1)
      expect(getComments).toHaveBeenCalledTimes(1)
    })
  })
})
