import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getHome } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import HomePage, {
  DashboardCard,
  formatDateOnly,
  formatDateTime,
  formatEventLabel,
  formatNullableTime,
  formatPostCategoryLabel,
  formatRecordTime,
} from './HomePage.jsx'

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

  it('should_format_home_labels_and_record_fallback_values', () => {
    expect(formatEventLabel('WCA_333')).toBe('3x3x3')
    expect(formatEventLabel('MEGA')).toBe('MEGA')
    expect(formatPostCategoryLabel('NOTICE')).toBe('공지')
    expect(formatPostCategoryLabel('FREE')).toBe('자유')
    expect(formatPostCategoryLabel('QNA')).toBe('QNA')
    expect(formatDateTime('2026-04-15T00:07:00')).toBe('2026년 4월 15일 오전 12시 7분')
    expect(formatDateTime('2026-04-15T15:07:00')).toBe('2026년 4월 15일 오후 3시 7분')
    expect(formatDateOnly('2026-04-15T15:07:00')).toBe('2026년 4월 15일')
    expect(formatNullableTime(null)).toBe('-')
    expect(formatRecordTime(null)).toBe('-')
  })

  it('should_render_dashboard_card_without_detail_text', () => {
    render(<DashboardCard label="라벨" value="값" />)

    expect(screen.getByText('라벨')).toBeInTheDocument()
    expect(screen.getByText('값')).toBeInTheDocument()
    expect(screen.queryByText('상세')).not.toBeInTheDocument()
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

  it('should_skip_home_request_when_auth_state_is_still_loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthLoading: true,
    })

    renderHomePage()

    expect(screen.getByText('홈 화면을 불러오는 중입니다.')).toBeInTheDocument()
    expect(getHome).not.toHaveBeenCalled()
  })

  it('should_render_guest_fallback_values_when_home_payload_contains_sparse_guest_data', async () => {
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'MEGA',
          scramble: null,
        },
        summary: null,
        recentRecords: [],
        recentPosts: [
          {
            id: 21,
            category: 'NOTICE',
            title: '공지 글',
            authorNickname: 'Admin',
            createdAt: null,
          },
          {
            id: 22,
            category: 'QNA',
            title: '질문 글',
            authorNickname: 'Beta',
            createdAt: '2026-04-18T09:00:00',
          },
        ],
      },
    })

    renderHomePage()

    expect(await screen.findByText('공지 글')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'MEGA' })).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.getByText('공지')).toBeInTheDocument()
    expect(screen.getByText('QNA')).toBeInTheDocument()
    expect(screen.getByText('Admin · -')).toBeInTheDocument()
  })

  it('should_render_authenticated_empty_record_state_with_nullable_summary_values', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthLoading: false,
    })
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R U R'",
        },
        summary: {
          nickname: 'Tester',
          mainEvent: '3x3x3',
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
        recentRecords: [],
        recentPosts: [],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Tester')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('아직 저장된 기록이 없습니다. 첫 기록을 만들어보세요.')).toBeInTheDocument()
  })

  it('should_fallback_to_empty_recent_records_when_authenticated_payload_omits_record_list', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthLoading: false,
    })
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R U R'",
        },
        summary: {
          nickname: 'Tester',
          mainEvent: '3x3x3',
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
        recentRecords: null,
        recentPosts: [],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Tester')).toBeInTheDocument()
    expect(screen.getByText('아직 저장된 기록이 없습니다. 첫 기록을 만들어보세요.')).toBeInTheDocument()
  })

  it('should_fallback_to_empty_recent_posts_when_guest_payload_omits_post_list', async () => {
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R U R'",
        },
        summary: null,
        recentRecords: [],
        recentPosts: null,
      },
    })

    renderHomePage()

    expect(await screen.findByText('큐빙 허브 시작하기')).toBeInTheDocument()
    expect(screen.getByText('아직 게시글이 없습니다. 첫 글을 남겨보세요.')).toBeInTheDocument()
  })

  it('should_render_authenticated_record_variants_when_recent_record_contains_dnf_and_fallback_values', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthLoading: false,
    })
    vi.mocked(getHome).mockResolvedValue({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R U R'",
        },
        summary: {
          nickname: 'Tester',
          mainEvent: '3x3x3',
          totalSolveCount: 2,
          personalBestTimeMs: 9000,
          averageTimeMs: 9500,
        },
        recentRecords: [
          {
            id: 1,
            eventType: 'CLOCK',
            timeMs: 15000,
            effectiveTimeMs: null,
            penalty: 'DNF',
            scramble: 'clock scramble',
            createdAt: null,
          },
          {
            id: 2,
            eventType: 'MEGA',
            timeMs: 12345,
            effectiveTimeMs: undefined,
            penalty: 'NONE',
            scramble: 'mega scramble',
            createdAt: '2026-04-18T09:00:00',
          },
        ],
        recentPosts: [],
      },
    })

    renderHomePage()

    expect(await screen.findByText('DNF')).toBeInTheDocument()
    expect(screen.getByText('12.345초')).toBeInTheDocument()
    expect(screen.getByText('CLOCK')).toBeInTheDocument()
    expect(screen.getByText('MEGA')).toBeInTheDocument()
  })

  it('should_ignore_pending_home_request_when_component_is_unmounted', async () => {
    let resolveRequest
    vi.mocked(getHome).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )

    const { unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    unmount()
    resolveRequest({
      data: {
        todayScramble: {
          eventType: 'WCA_333',
          scramble: "R U R'",
        },
        summary: null,
        recentPosts: [],
      },
    })

    await waitFor(() => {
      expect(getHome).toHaveBeenCalledTimes(1)
    })
  })
})
