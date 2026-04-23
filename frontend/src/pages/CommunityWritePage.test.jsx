import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createPost, getPost, updatePost } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import CommunityWritePage from './CommunityWritePage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  createPost: vi.fn(),
  getPost: vi.fn(),
  updatePost: vi.fn(),
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

function renderCommunityWritePage(path = '/community/write') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/community/write" element={<CommunityWritePage />} />
        <Route path="/community/:id/edit" element={<CommunityWritePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CommunityWritePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_submit_post_and_redirect_to_detail_when_admin_creates_notice_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Admin',
        role: 'ROLE_ADMIN',
      },
    })
    vi.mocked(createPost).mockResolvedValue({
      data: {
        id: 33,
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('카테고리'), { target: { value: 'NOTICE' } })
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '공지 제목' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '공지 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => {
      expect(createPost).toHaveBeenCalledWith({
        category: 'NOTICE',
        title: '공지 제목',
        content: '공지 본문',
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith('/community/33', { replace: true })
  })

  it('should_hide_notice_option_when_current_user_is_not_admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    expect(screen.queryByRole('option', { name: '공지사항' })).not.toBeInTheDocument()
  })

  it('should_preload_post_and_submit_update_when_author_edits_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue({
      data: {
        id: 33,
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'Tester',
      },
    })
    vi.mocked(updatePost).mockResolvedValue({
      data: null,
    })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByDisplayValue('기존 제목')).toBeInTheDocument()
    expect(screen.getByDisplayValue('기존 본문')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '수정 제목' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '수정 본문' } })
    fireEvent.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updatePost).toHaveBeenCalledWith(33, {
        category: 'FREE',
        title: '수정 제목',
        content: '수정 본문',
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/community/33', { replace: true })
  })

  it('should_show_permission_error_when_current_user_cannot_edit_post', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })
    vi.mocked(getPost).mockResolvedValue({
      data: {
        id: 33,
        category: 'FREE',
        title: '기존 제목',
        content: '기존 본문',
        authorNickname: 'AnotherUser',
      },
    })

    renderCommunityWritePage('/community/33/edit')

    expect(await screen.findByText('게시글 수정/삭제 권한이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument()
    expect(updatePost).not.toHaveBeenCalled()
  })

  it('should_show_not_found_error_when_edit_post_id_is_invalid', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage('/community/not-a-number/edit')

    expect(await screen.findByText('게시글을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(getPost).not.toHaveBeenCalled()
  })

  it('should_show_validation_error_when_title_or_content_is_blank', async () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByText('제목과 내용을 모두 입력해주세요.')).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('should_apply_input_length_limits_to_post_form_fields', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        nickname: 'Tester',
        role: 'ROLE_USER',
      },
    })

    renderCommunityWritePage()

    expect(screen.getByLabelText('제목')).toHaveAttribute('maxLength', '100')
    expect(screen.getByLabelText('내용')).toHaveAttribute('maxLength', '2000')
  })
})
