import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getHome } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import HomePage from './HomePage.jsx'

vi.mock('../api.js', () => ({
  getHome: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthLoading: false,
    })
  })

  it('should_render_guest_home_with_recent_posts_when_user_is_not_authenticated', async () => {
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R2 U F2 D' R2 U2",
        },
        summary: null,
        recentRecords: [],
        recentPosts: [
          {
            id: 11,
            category: 'FREE',
            title: '최신 글',
            authorNickname: 'Alpha',
            viewCount: 3,
            createdAt: '2026-04-15T10:00:00',
          },
        ],
      },
    })

    renderHomePage()

    expect(screen.getByText('홈 화면을 불러오는 중입니다.')).toBeInTheDocument()
    expect(await screen.findByText('큐빙 허브 시작하기')).toBeInTheDocument()
    expect(screen.getByText('최신 글')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
  })

  it('should_render_authenticated_home_summary_and_recent_records_when_user_is_authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthLoading: false,
    })
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R2 U F2 D' R2 U2",
        },
        summary: {
          nickname: 'Tester',
          mainEvent: '3x3x3',
          totalSolveCount: 12,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
        recentRecords: [
          {
            id: 1,
            eventType: 'WCA_333',
            timeMs: 9344,
            effectiveTimeMs: 9344,
            penalty: 'NONE',
            scramble: "L U2 F2 R2 U'",
            createdAt: '2026-04-15T10:00:00',
          },
        ],
        recentPosts: [
          {
            id: 11,
            category: 'FREE',
            title: '최신 글',
            authorNickname: 'Alpha',
            viewCount: 3,
            createdAt: '2026-04-15T10:00:00',
          },
        ],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Tester')).toBeInTheDocument()
    expect(screen.getByText('12회')).toBeInTheDocument()
    expect(screen.getAllByText('9.344초')).toHaveLength(2)
    expect(screen.getByText("L U2 F2 R2 U'")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '전체 기록 보기' })).toBeInTheDocument()
  })

  it('should_retry_home_request_when_retry_button_is_clicked', async () => {
    vi.mocked(getHome)
      .mockRejectedValueOnce(new Error('홈 조회 실패'))
      .mockResolvedValueOnce({
        data: {
          todayScramble: {
            eventType: 'WCA_333',
            scramble: 'R U R\'',
          },
          summary: null,
          recentRecords: [],
          recentPosts: [],
        },
      })

    renderHomePage()

    expect(await screen.findByText('홈 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    await waitFor(() => {
      expect(getHome).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('큐빙 허브 시작하기')).toBeInTheDocument()
  })
})
