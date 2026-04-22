import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getPosts } from '../api.js'
import CommunityPage from './CommunityPage.jsx'

vi.mock('../api.js', () => ({
  getPosts: vi.fn(),
}))

function createPostPageResponse({
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

function renderCommunityPage() {
  render(
    <MemoryRouter>
      <CommunityPage />
    </MemoryRouter>,
  )
}

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should_render_loading_and_post_items_when_request_succeeds', async () => {
    vi.mocked(getPosts).mockResolvedValue(
      createPostPageResponse({
        items: [
          { id: 1, category: 'FREE', title: '큐브 연습법', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' },
        ],
      }),
    )

    renderCommunityPage()

    expect(screen.getByText('게시글 목록을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('큐브 연습법')).toBeInTheDocument()

    expect(getPosts).toHaveBeenCalledWith({
      category: undefined,
      keyword: undefined,
      author: undefined,
      page: 1,
      size: 8,
    })
  })

  it('should_not_refetch_posts_repeatedly_when_search_filters_do_not_change', async () => {
    vi.mocked(getPosts).mockResolvedValue(
      createPostPageResponse({
        items: [
          { id: 1, category: 'FREE', title: '큐브 연습법', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' },
        ],
      }),
    )

    renderCommunityPage()

    expect(await screen.findByText('큐브 연습법')).toBeInTheDocument()

    await new Promise((resolve) => {
      setTimeout(resolve, 700)
    })

    expect(getPosts).toHaveBeenCalledTimes(1)
  })

  it('should_refetch_posts_after_debounce_when_category_and_search_filters_change', async () => {
    vi.mocked(getPosts)
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [
            { id: 1, category: 'FREE', title: '큐브 연습법', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [
            { id: 2, category: 'NOTICE', title: '공지 제목', authorNickname: 'Admin', viewCount: 30, createdAt: '2026-04-15T11:00:00' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [
            { id: 2, category: 'NOTICE', title: '공지 제목', authorNickname: 'Admin', viewCount: 30, createdAt: '2026-04-15T11:00:00' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [
            { id: 2, category: 'NOTICE', title: '공지 제목', authorNickname: 'Admin', viewCount: 30, createdAt: '2026-04-15T11:00:00' },
          ],
        }),
      )

    renderCommunityPage()

    expect(await screen.findByText('큐브 연습법')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '공지' }))
    expect(await screen.findByText('공지 제목')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목/본문 검색'), { target: { value: '공지' } })
    fireEvent.change(screen.getByLabelText('작성자 검색'), { target: { value: 'Admin' } })

    expect(getPosts).toHaveBeenCalledTimes(2)

    await new Promise((resolve) => {
      setTimeout(resolve, 250)
    })

    expect(getPosts).toHaveBeenCalledTimes(2)

    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    await waitFor(() => {
      expect(getPosts).toHaveBeenLastCalledWith({
        category: 'NOTICE',
        keyword: '공지',
        author: 'Admin',
        page: 1,
        size: 8,
      })
    })
  })

  it('should_only_request_last_filters_once_when_search_inputs_change_quickly', async () => {
    vi.mocked(getPosts)
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 1, category: 'FREE', title: '큐브 연습법', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 2, category: 'FREE', title: '큐브 대회 후기', authorNickname: 'AlphaAdmin', viewCount: 20, createdAt: '2026-04-15T11:00:00' }],
        }),
      )

    renderCommunityPage()

    expect(await screen.findByText('큐브 연습법')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목/본문 검색'), { target: { value: '큐' } })
    fireEvent.change(screen.getByLabelText('제목/본문 검색'), { target: { value: '큐브' } })
    fireEvent.change(screen.getByLabelText('작성자 검색'), { target: { value: 'Alpha' } })
    fireEvent.change(screen.getByLabelText('작성자 검색'), { target: { value: 'AlphaAdmin' } })

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })

    await waitFor(() => {
      expect(getPosts).toHaveBeenCalledTimes(2)
      expect(getPosts).toHaveBeenLastCalledWith({
        category: undefined,
        keyword: '큐브',
        author: 'AlphaAdmin',
        page: 1,
        size: 8,
      })
    })

    expect(await screen.findByText('큐브 대회 후기')).toBeInTheDocument()
  })

  it('should_reset_page_to_first_when_filter_changes', async () => {
    vi.mocked(getPosts)
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 1, category: 'FREE', title: '자유글 1', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
          totalElements: 10,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 9, category: 'FREE', title: '자유글 9', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
          page: 2,
          totalElements: 10,
          totalPages: 2,
          hasNext: false,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [],
          page: 1,
          totalElements: 0,
          totalPages: 0,
        }),
      )

    renderCommunityPage()

    expect(await screen.findByText('자유글 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(await screen.findByText('자유글 9')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목/본문 검색'), { target: { value: '없는 검색어' } })

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })

    await waitFor(() => {
      expect(getPosts).toHaveBeenLastCalledWith({
        category: undefined,
        keyword: '없는 검색어',
        author: undefined,
        page: 1,
        size: 8,
      })
    })

    expect(await screen.findByText('조건에 맞는 게시글이 없습니다.')).toBeInTheDocument()
  })

  it('should_retry_when_post_request_fails', async () => {
    vi.mocked(getPosts)
      .mockRejectedValueOnce(new Error('게시글 목록 조회 실패'))
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 1, category: 'FREE', title: '복구된 글', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
        }),
      )

    renderCommunityPage()

    expect(await screen.findByText('게시글 목록 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('복구된 글')).toBeInTheDocument()
    await waitFor(() => {
      expect(getPosts).toHaveBeenCalledTimes(2)
    })
  })
})
