import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
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

function CommunityDetailStub() {
  const { id } = useParams()

  return <p>{`상세 페이지 ${id}`}</p>
}

function renderCommunityPage() {
  render(
    <MemoryRouter initialEntries={['/community']}>
      <Routes>
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:id" element={<CommunityDetailStub />} />
      </Routes>
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
    expect(screen.getByLabelText('제목/본문 검색')).toHaveAttribute('maxLength', '100')
    expect(screen.getByLabelText('작성자 검색')).toHaveAttribute('maxLength', '50')
  })

  it('should_navigate_to_post_detail_when_post_row_is_clicked', async () => {
    vi.mocked(getPosts).mockResolvedValue(
      createPostPageResponse({
        items: [
          { id: 1, category: 'FREE', title: '큐브 연습법', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' },
        ],
      }),
    )

    renderCommunityPage()

    const rowLink = await screen.findByRole('link', { name: '큐브 연습법 상세 보기' })

    fireEvent.click(rowLink)

    expect(await screen.findByText('상세 페이지 1')).toBeInTheDocument()
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

  it('should_navigate_when_post_row_is_activated_with_supported_keys_only', async () => {
    vi.mocked(getPosts).mockResolvedValue(
      createPostPageResponse({
        items: [
          { id: 3, category: 'FREE', title: '키보드 이동 글', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' },
        ],
      }),
    )

    renderCommunityPage()

    const rowLink = await screen.findByRole('link', { name: '키보드 이동 글 상세 보기' })

    fireEvent.keyDown(rowLink, { key: 'ArrowDown' })
    expect(screen.queryByText('상세 페이지 3')).not.toBeInTheDocument()

    fireEvent.keyDown(rowLink, { key: ' ' })
    expect(await screen.findByText('상세 페이지 3')).toBeInTheDocument()
  })

  it('should_normalize_page_when_loaded_page_exceeds_total_pages', async () => {
    vi.mocked(getPosts)
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 1, category: 'FREE', title: '첫 페이지 글', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
          totalElements: 9,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 9, category: 'NOTICE', title: '보정 전 글', authorNickname: 'Admin', viewCount: 15, createdAt: '2026-04-15T11:00:00' }],
          page: 2,
          totalElements: 9,
          totalPages: 1,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createPostPageResponse({
          items: [{ id: 7, category: 'NOTICE', title: '보정된 글', authorNickname: 'Admin', viewCount: 18, createdAt: '2026-04-15T12:00:00' }],
          page: 1,
          totalElements: 1,
          totalPages: 1,
        }),
      )

    renderCommunityPage()

    expect(await screen.findByText('첫 페이지 글')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('보정된 글')).toBeInTheDocument()
    expect(screen.getAllByText('공지').length).toBeGreaterThanOrEqual(1)
  })

  it('should_ignore_pending_post_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getPosts).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = render(
      <MemoryRouter initialEntries={['/community']}>
        <CommunityPage />
      </MemoryRouter>,
    )

    unmount()
    resolveRequest(createPostPageResponse({
      items: [{ id: 4, category: 'FREE', title: '늦게 온 글', authorNickname: 'Alpha', viewCount: 12, createdAt: '2026-04-15T10:00:00' }],
    }))

    await waitFor(() => {
      expect(getPosts).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_failed_post_request_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getPosts).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = render(
      <MemoryRouter initialEntries={['/community']}>
        <CommunityPage />
      </MemoryRouter>,
    )

    unmount()
    rejectRequest(new Error('늦게 온 실패'))

    await waitFor(() => {
      expect(getPosts).toHaveBeenCalledTimes(1)
    })
  })
})
