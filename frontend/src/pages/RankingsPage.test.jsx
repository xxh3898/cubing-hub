import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRankings } from '../api.js'
import RankingsPage from './RankingsPage.jsx'

vi.mock('../api.js', () => ({
  getRankings: vi.fn(),
}))

function createRankingPageResponse({
  items,
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
    },
  }
}

describe('RankingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
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

    expect(getRankings).toHaveBeenCalledWith({
      eventType: 'WCA_333',
      nickname: undefined,
      page: 1,
      size: 25,
    })
  })

  it('should_refetch_rankings_when_search_query_changes', async () => {
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
})
