import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRankings } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import RankingsPage from './RankingsPage.jsx'

vi.mock('../api.js', () => ({
  getRankings: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

function createRankingPageResponse({
  items,
  myRanking = null,
  page = 1,
  size = 25,
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
      myRanking,
    },
  }
}

describe('RankingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    })
  })

  it('should_render_loading_and_ranking_items_when_request_succeeds', async () => {
    vi.mocked(getRankings).mockResolvedValue(
      createRankingPageResponse({
        items: [
          { rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 },
          { rank: 2, nickname: 'Beta', eventType: 'WCA_333', timeMs: 10100 },
        ],
        totalPages: 1,
      }),
    )

    render(<RankingsPage />)

    expect(screen.getByText('랭킹을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('9.800초')).toBeInTheDocument()
    expect(document.querySelector('.rankings-row')).not.toBeNull()
    expect(document.querySelector('.rankings-row-time')).not.toBeNull()

    expect(getRankings).toHaveBeenCalledWith({
      eventType: 'WCA_333',
      nickname: undefined,
      page: 1,
      size: 25,
    })
    expect(screen.getByLabelText('닉네임 검색')).toHaveAttribute('maxLength', '50')
  })

  it('should_render_podium_on_default_first_page_when_top_three_rankings_exist', async () => {
    vi.mocked(getRankings).mockResolvedValue(
      createRankingPageResponse({
        items: [
          { rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 },
          { rank: 2, nickname: 'Beta', eventType: 'WCA_333', timeMs: 10100 },
          { rank: 3, nickname: 'Gamma', eventType: 'WCA_333', timeMs: 10200 },
        ],
      }),
    )

    render(<RankingsPage />)

    expect(await screen.findByLabelText('상위 3위 랭킹')).toBeInTheDocument()
    expect(document.querySelector('.rankings-podium-card.rank-1')).not.toBeNull()
    expect(document.querySelector('.rankings-podium-card.rank-2')).not.toBeNull()
    expect(document.querySelector('.rankings-podium-card.rank-3')).not.toBeNull()
  })

  it('should_render_my_ranking_card_when_authenticated_response_contains_my_ranking', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    })
    vi.mocked(getRankings).mockResolvedValue(
      createRankingPageResponse({
        items: [
          { rank: 4, nickname: 'Delta', eventType: 'WCA_333', timeMs: 10800 },
        ],
        myRanking: { rank: 6, nickname: 'Tester', eventType: 'WCA_333', timeMs: 11200 },
      }),
    )

    render(<RankingsPage />)

    expect(await screen.findByText('내 순위: 6위')).toBeInTheDocument()
    expect(screen.getByText('11.200초')).toBeInTheDocument()
  })

  it('should_refetch_rankings_after_debounce_when_search_query_changes', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'AlphaCube', eventType: 'WCA_333', timeMs: 9750 }],
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('닉네임 검색'), { target: { value: 'cube' } })

    expect(getRankings).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => {
      setTimeout(resolve, 250)
    })

    expect(getRankings).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })

    await waitFor(() => {
      expect(getRankings).toHaveBeenLastCalledWith({
        eventType: 'WCA_333',
        nickname: 'cube',
        page: 1,
        size: 25,
      })
    })

    expect(await screen.findByText('AlphaCube')).toBeInTheDocument()
  })

  it('should_reset_page_to_first_when_event_changes', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
          totalElements: 30,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 26, nickname: 'Beta', eventType: 'WCA_333', timeMs: 10100 }],
          page: 2,
          totalElements: 30,
          totalPages: 2,
          hasNext: false,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [],
          page: 1,
          totalElements: 0,
          totalPages: 0,
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('Beta')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_222' } })

    await waitFor(() => {
      expect(getRankings).toHaveBeenLastCalledWith({
        eventType: 'WCA_222',
        nickname: undefined,
        page: 1,
        size: 25,
      })
    })

    expect(await screen.findByText('표시할 랭킹 데이터가 없습니다.')).toBeInTheDocument()
  })

  it('should_only_request_last_query_once_when_search_input_changes_quickly', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alphabet', eventType: 'WCA_333', timeMs: 9700 }],
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('닉네임 검색'), { target: { value: 'a' } })
    fireEvent.change(screen.getByLabelText('닉네임 검색'), { target: { value: 'al' } })
    fireEvent.change(screen.getByLabelText('닉네임 검색'), { target: { value: 'alphabet' } })

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })

    await waitFor(() => {
      expect(getRankings).toHaveBeenCalledTimes(2)
      expect(getRankings).toHaveBeenLastCalledWith({
        eventType: 'WCA_333',
        nickname: 'alphabet',
        page: 1,
        size: 25,
      })
    })

    expect(await screen.findByText('Alphabet')).toBeInTheDocument()
  })

  it('should_show_empty_state_when_ranking_result_is_empty', async () => {
    vi.mocked(getRankings).mockResolvedValue(
      createRankingPageResponse({
        items: [],
        totalElements: 0,
        totalPages: 0,
      }),
    )

    render(<RankingsPage />)

    expect(await screen.findByText('표시할 랭킹 데이터가 없습니다.')).toBeInTheDocument()
  })

  it('should_retry_when_ranking_request_fails', async () => {
    vi.mocked(getRankings)
      .mockRejectedValueOnce(new Error('랭킹 조회 실패'))
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Gamma', eventType: 'WCA_333', timeMs: 9900 }],
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('랭킹 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('Gamma')).toBeInTheDocument()
    await waitFor(() => {
      expect(getRankings).toHaveBeenCalledTimes(2)
    })
  })

  it('should_normalize_page_when_loaded_page_exceeds_total_pages', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
          totalElements: 30,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 26, nickname: 'Beta', eventType: 'CLOCK', timeMs: 10100 }],
          page: 2,
          totalElements: 26,
          totalPages: 1,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Normalized', eventType: 'CLOCK', timeMs: 10050 }],
          page: 1,
          totalElements: 1,
          totalPages: 1,
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('Normalized')).toBeInTheDocument()
    expect(screen.getByText('CLOCK')).toBeInTheDocument()
  })

  it('should_fallback_to_pagination_flags_when_server_omits_has_previous_and_has_next', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
          totalElements: 30,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce({
        data: {
          items: [{ rank: 26, nickname: 'Beta', eventType: 'WCA_333', timeMs: 10100 }],
          page: 2,
          size: 25,
          totalElements: 30,
          totalPages: 2,
        },
      })

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('Beta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('should_ignore_pending_ranking_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getRankings).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = render(<RankingsPage />)

    unmount()
    resolveRequest(createRankingPageResponse({
      items: [{ rank: 1, nickname: 'LateResult', eventType: 'WCA_333', timeMs: 9800 }],
    }))

    await waitFor(() => {
      expect(getRankings).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_ranking_error_when_component_is_unmounted', async () => {
    let rejectRequest
    vi.mocked(getRankings).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject
        }),
    )

    const { unmount } = render(<RankingsPage />)

    unmount()
    rejectRequest(new Error('late ranking failure'))

    await waitFor(() => {
      expect(getRankings).toHaveBeenCalledTimes(1)
    })
  })

  it('should_reset_page_to_first_when_search_query_changes_while_current_page_is_not_first', async () => {
    vi.mocked(getRankings)
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'Alpha', eventType: 'WCA_333', timeMs: 9800 }],
          totalElements: 30,
          totalPages: 2,
          hasNext: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 26, nickname: 'Beta', eventType: 'WCA_333', timeMs: 10100 }],
          page: 2,
          totalElements: 30,
          totalPages: 2,
          hasPrevious: true,
        }),
      )
      .mockResolvedValueOnce(
        createRankingPageResponse({
          items: [{ rank: 1, nickname: 'SearchReset', eventType: 'WCA_333', timeMs: 9750 }],
          page: 1,
          totalElements: 1,
          totalPages: 1,
        }),
      )

    render(<RankingsPage />)

    expect(await screen.findByText('Alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('Beta')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('닉네임 검색'), { target: { value: 'reset' } })

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })

    expect(await screen.findByText('SearchReset')).toBeInTheDocument()
    expect(getRankings).toHaveBeenLastCalledWith({
      eventType: 'WCA_333',
      nickname: 'reset',
      page: 1,
      size: 25,
    })
  })
})
