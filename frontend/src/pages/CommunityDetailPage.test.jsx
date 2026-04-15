import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { deletePost, getPost } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import CommunityDetailPage from './CommunityDetailPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  deletePost: vi.fn(),
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

describe('CommunityDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('should_render_post_detail_and_delete_post_when_author_confirms', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue(createPostDetailResponse())
    vi.mocked(deletePost).mockResolvedValue({
      message: '게시글이 삭제되었습니다.',
    })

    renderCommunityDetailPage()

    expect(screen.getByText('게시글을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()
    expect(screen.getByText('댓글 기능은 다음 커밋에서 연동됩니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deletePost).toHaveBeenCalledWith(5)
    })
    expect(mockNavigate).toHaveBeenCalledWith('/community', { replace: true })
  })

  it('should_render_delete_button_when_admin_views_other_users_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Admin',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(getPost).mockResolvedValue(
      createPostDetailResponse({
        authorNickname: 'OtherUser',
      }),
    )

    renderCommunityDetailPage()

    expect(await screen.findByRole('heading', { name: '상세 제목' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('should_show_error_message_when_detail_request_fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockRejectedValue(new Error('게시글을 찾을 수 없습니다.'))

    renderCommunityDetailPage()

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '목록으로' })).toBeInTheDocument()
  })
})
