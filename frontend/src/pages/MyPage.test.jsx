import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import {
  changeMyPassword,
  deleteRecord,
  getMyGrowth,
  getMyGrowthPbProgression,
  getMyGrowthTrend,
  getMyProfile,
  getMyRecords,
  logout,
  updateMyProfile,
  updateRecordPenalty,
} from '../api.js'
import { useAuth } from '../context/useAuth.js'
import MyPage, {
  GrowthPeriodCard,
  GrowthPbProgressionTooltip,
  RecordTrendTooltip,
  GrowthTrendTooltip,
  buildPbProgressionChartData,
  buildGrowthTrendChartData,
  buildFirstPageFromRecentRecords,
  formatDateTime,
  formatGrowthDate,
  formatGrowthMetric,
  formatGrowthPeriodRange,
  formatPbProgressionAxisTick,
  formatTrendAxisTick,
  getConsistencyComparisonLabel,
  getNextPracticeAction,
  getDisplayRecordTime,
  getEventLabel,
  getGrowthStage,
  getPenaltyLabel,
  getRemainingSolveCount,
  previousCalendarDate,
  resolveEventType,
} from './MyPage.jsx'

const mockNavigate = vi.fn()
const mockClearAccessToken = vi.fn()
const mockUpdateCurrentUser = vi.fn()
const mockRechartsTooltip = vi.hoisted(() => vi.fn(() => null))
const mockRechartsLine = vi.hoisted(() => vi.fn(() => null))
const mockRechartsLineChart = vi.hoisted(() => vi.fn())

vi.mock('../api.js', () => ({
  changeMyPassword: vi.fn(),
  deleteRecord: vi.fn(),
  getMyGrowth: vi.fn(),
  getMyGrowthPbProgression: vi.fn(),
  getMyGrowthTrend: vi.fn(),
  getMyProfile: vi.fn(),
  getMyRecords: vi.fn(),
  logout: vi.fn(),
  updateMyProfile: vi.fn(),
  updateRecordPenalty: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
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

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  const ChartContainer = ({ children }) => <div>{children}</div>
  const ChartElement = () => null

  return {
    ...actual,
    Bar: ChartElement,
    BarChart: ChartContainer,
    CartesianGrid: ChartElement,
    Line: mockRechartsLine,
    LineChart: mockRechartsLineChart,
    ReferenceLine: ChartElement,
    ResponsiveContainer: ChartContainer,
    Tooltip: mockRechartsTooltip,
    XAxis: ChartElement,
    YAxis: ChartElement,
  }
})

function createRecord(overrides = {}) {
  return {
    id: 1,
    eventType: 'WCA_333',
    timeMs: 9344,
    effectiveTimeMs: 9344,
    penalty: 'NONE',
    createdAt: '2026-04-04T18:11:00',
    ...overrides,
  }
}

function createRecordsResponse(items, overrides = {}) {
  return {
    data: {
      items,
      page: 1,
      size: 10,
      totalElements: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      hasNext: false,
      hasPrevious: false,
      ...overrides,
    },
  }
}

function createGrowthSummaryResponse(overrides = {}) {
  return {
    data: {
      eventType: 'WCA_333',
      timeZone: 'Asia/Seoul',
      currentPb: { status: 'AVAILABLE', effectiveTimeMs: 9344 },
      recentAo5: { status: 'AVAILABLE', valueMs: 10200 },
      recentAo12: { status: 'AVAILABLE', valueMs: 10500 },
      performanceComparison: {
        status: 'AVAILABLE',
        direction: 'FASTER',
        recentPeriod: { fromDate: '2026-08-08', toDateExclusive: '2026-08-15', medianTimeMs: 10100, recordCount: 12, dnfCount: 1 },
        previousPeriod: { fromDate: '2026-08-01', toDateExclusive: '2026-08-08', medianTimeMs: 10800, recordCount: 10, dnfCount: 0 },
      },
      consistency: {
        status: 'AVAILABLE',
        current: { status: 'AVAILABLE', iqrMs: 850, dnfCount: 1, plusTwoCount: 2 },
        previous: { status: 'AVAILABLE', iqrMs: 1100, dnfCount: 0, plusTwoCount: 1 },
        direction: 'NARROWER',
        differenceMs: 250,
      },
      activity: { totalSolveCount: 12, last7DaysSolveCount: 7, previous7DaysSolveCount: 5, last30DaysSolveCount: 12, activeDaysLast30Days: 4, firstRecordedAt: '2026-08-01T09:00:00Z', latestRecordedAt: '2026-08-14T09:00:00Z' },
      ...overrides,
    },
  }
}

function createGrowthSummaryForSolveCount(totalSolveCount, overrides = {}) {
  const baseSummary = createGrowthSummaryResponse().data

  return createGrowthSummaryResponse({
    ...overrides,
    activity: {
      ...baseSummary.activity,
      totalSolveCount,
      ...overrides.activity,
    },
  })
}

function createGrowthTrendResponse(points = [], overrides = {}) {
  return {
    data: {
      eventType: 'WCA_333',
      period: '30D',
      timeZone: 'Asia/Seoul',
      todayPartial: false,
      toDate: points.at(-1)?.date,
      points,
      ...overrides,
    },
  }
}

function createPbProgressionResponse(content = [], overrides = {}) {
  return { data: { eventType: 'WCA_333', basis: 'CURRENT_RETAINED_RECORDS', timeZone: 'Asia/Seoul', content, page: 1, size: 50, totalElements: content.length, totalPages: content.length ? 1 : 0, hasNext: false, hasPrevious: false, ...overrides } }
}

function createDeferred() {
  let resolve
  let reject

  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

describe('MyPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRechartsTooltip.mockImplementation(() => null)
    mockRechartsLine.mockImplementation(() => null)
    mockRechartsLineChart.mockImplementation(({ children }) => <div>{children}</div>)
    vi.stubGlobal('confirm', vi.fn(() => true))

    vi.mocked(useAuth).mockReturnValue({
      clearAccessToken: mockClearAccessToken,
      currentUser: {
        email: 'member@cubinghub.com',
        nickname: 'Tester',
      },
      updateCurrentUser: mockUpdateCurrentUser,
    })
    vi.mocked(logout).mockResolvedValue({ message: '로그아웃되었습니다.' })
    vi.mocked(getMyGrowth).mockResolvedValue(createGrowthSummaryResponse())
    vi.mocked(getMyGrowthTrend).mockResolvedValue(createGrowthTrendResponse([
      { date: '2026-08-13', recordCount: 2, rankableCount: 2, medianTimeMs: 10100, dnfCount: 0, plusTwoCount: 0 },
      { date: '2026-08-14', recordCount: 1, rankableCount: 0, medianTimeMs: null, dnfCount: 1, plusTwoCount: 0 },
    ]))
    vi.mocked(getMyGrowthPbProgression).mockResolvedValue(createPbProgressionResponse([
      { recordId: 1, effectiveTimeMs: 9344, createdAt: '2026-08-01T09:00:00Z' },
    ]))
  })

  it('should_render_fallback_profile_initial_when_nickname_is_blank', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: '',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))

    render(<MyPage />)

    await waitFor(() => {
      expect(document.querySelector('.mypage-avatar')).toHaveTextContent('?')
    })
  })

  it('should_update_profile_and_refresh_current_user_when_profile_save_succeeds', async () => {
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 9344,
            averageTimeMs: 9344,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'SpeedMaster',
          mainEvent: 'WCA_222',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 9344,
            averageTimeMs: 9344,
          },
        },
      })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
    vi.mocked(updateMyProfile).mockResolvedValue({
      message: '내 정보를 수정했습니다.',
      data: null,
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()
    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))

    const profilePanel = screen.getByRole('tabpanel')
    expect(within(profilePanel).getByDisplayValue('Tester')).toBeInTheDocument()

    fireEvent.change(within(profilePanel).getByLabelText('닉네임'), { target: { value: 'SpeedMaster' } })
    fireEvent.change(within(profilePanel).getByLabelText('주 종목'), { target: { value: 'WCA_222' } })
    fireEvent.click(within(profilePanel).getByRole('button', { name: '프로필 저장' }))

    await waitFor(() => {
      expect(updateMyProfile).toHaveBeenCalledWith({
        nickname: 'SpeedMaster',
        mainEvent: 'WCA_222',
      })
    })

    await waitFor(() => {
      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ nickname: 'SpeedMaster' })
      expect(toast.success).toHaveBeenCalledWith('내 정보를 수정했습니다.')
      expect(screen.queryByRole('dialog', { name: '계정 관리' })).not.toBeInTheDocument()
    })
    expect(await screen.findAllByText('2x2x2')).not.toHaveLength(0)
  })

  it('should_clear_session_and_redirect_to_login_when_password_change_succeeds', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 1,
          personalBestTimeMs: 9344,
          averageTimeMs: 9344,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
    vi.mocked(changeMyPassword).mockResolvedValue({
      message: '비밀번호를 변경했습니다. 다시 로그인해주세요.',
      data: null,
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))
    fireEvent.click(screen.getByRole('tab', { name: '비밀번호 변경' }))

    const passwordPanel = screen.getByRole('tabpanel')
    fireEvent.change(within(passwordPanel).getByLabelText('현재 비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호 확인'), { target: { value: 'newPassword123!' } })
    fireEvent.click(within(passwordPanel).getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(changeMyPassword).toHaveBeenCalledWith({
        currentPassword: 'password123!',
        newPassword: 'newPassword123!',
      })
    })

    expect(mockClearAccessToken).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: {
        notice: '비밀번호를 변경했습니다. 다시 로그인해주세요.',
        email: 'member@cubinghub.com',
      },
    })
  })

  it('should_refresh_profile_and_records_when_record_penalty_update_succeeds', async () => {
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 9344,
            averageTimeMs: 9344,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 11344,
            averageTimeMs: 11344,
          },
        },
      })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
      .mockResolvedValueOnce(createRecordsResponse([createRecord({ effectiveTimeMs: 11344, penalty: 'PLUS_TWO' })]))
    vi.mocked(updateRecordPenalty).mockResolvedValue({
      message: '기록 페널티가 수정되었습니다.',
      data: {
        id: 1,
        timeMs: 9344,
        effectiveTimeMs: 11344,
        penalty: 'PLUS_TWO',
      },
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(updateRecordPenalty).toHaveBeenCalledWith(1, { penalty: 'PLUS_TWO' })
    })

    expect((await screen.findAllByText('11.344')).length).toBeGreaterThan(0)
    expect(toast.success).toHaveBeenCalledWith('기록 페널티가 수정되었습니다.')
    expect(getMyProfile).toHaveBeenCalledTimes(2)
    expect(getMyRecords).toHaveBeenCalledWith({ page: 1, size: 100 })
    await waitFor(() => {
      expect(getMyGrowth).toHaveBeenCalledTimes(2)
      expect(getMyGrowthTrend).toHaveBeenCalledTimes(2)
      expect(getMyGrowthPbProgression).toHaveBeenCalledTimes(2)
    })
  })

  it('should_request_next_page_when_next_button_is_clicked', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockResolvedValueOnce(createRecordsResponse([createRecord({
        id: 11,
        timeMs: 11111,
        effectiveTimeMs: 11111,
        createdAt: '2026-04-04T18:22:00',
      })], { page: 2, totalElements: 11, totalPages: 2, hasPrevious: true }))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('2026년 4월 4일 오후 6시 22분')).toBeInTheDocument()
    expect(getMyRecords).toHaveBeenLastCalledWith({ page: 2, size: 10 })
    expect(screen.getByRole('button', { name: '2' })).toBeDisabled()
  })

  it('should_refresh_profile_and_records_when_record_delete_succeeds', async () => {
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 9344,
            averageTimeMs: 9344,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 0,
            personalBestTimeMs: null,
            averageTimeMs: null,
          },
        },
      })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
      .mockResolvedValueOnce(createRecordsResponse([]))
    vi.mocked(deleteRecord).mockResolvedValue({
      message: '기록이 삭제되었습니다.',
      data: null,
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith(1)
    })

    expect(toast.success).toHaveBeenCalledWith('기록이 삭제되었습니다.')
    expect(screen.getByText('아직 저장된 기록이 없습니다.')).toBeInTheDocument()
  })

  it('should_show_error_message_when_profile_loading_fails', async () => {
    vi.mocked(getMyProfile)
      .mockRejectedValueOnce(new Error('프로필 조회 실패'))
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: '3x3x3',
          summary: {
            totalSolveCount: 0,
            personalBestTimeMs: null,
            averageTimeMs: null,
          },
        },
      })
    vi.mocked(getMyRecords).mockResolvedValue({
      data: {
        items: [],
        page: 1,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    })

    render(<MyPage />)

    expect(await screen.findByText('프로필 조회 실패')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '다시 시도' })[0])

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()
    expect(getMyProfile).toHaveBeenCalledTimes(2)
  })

  it('should_show_error_message_when_records_loading_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockRejectedValueOnce(new Error('기록 조회 실패'))
      .mockResolvedValueOnce(createRecordsResponse([]))

    render(<MyPage />)

    expect(await screen.findAllByText('기록 조회 실패')).toHaveLength(1)

    fireEvent.click(screen.getAllByRole('button', { name: '다시 시도' })[0])

    expect(await screen.findByText('아직 저장된 기록이 없습니다.')).toBeInTheDocument()
    expect(getMyRecords).toHaveBeenCalledTimes(2)
  })

  it('should_show_error_message_when_record_penalty_update_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 1,
          personalBestTimeMs: 9344,
          averageTimeMs: 9344,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue({
      data: {
        items: [
          createRecord(),
        ],
        page: 1,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    })
    vi.mocked(updateRecordPenalty).mockRejectedValue(new Error('패널티 수정 실패'))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'DNF' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('패널티 수정 실패')
    })
  })

  it('should_show_error_message_when_record_delete_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 1,
          personalBestTimeMs: 9344,
          averageTimeMs: 9344,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue({
      data: {
        items: [
          createRecord(),
        ],
        page: 1,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    })
    vi.mocked(deleteRecord).mockRejectedValue(new Error('기록 삭제 실패'))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('기록 삭제 실패')
    })
  })

  it('should_show_growth_empty_state_when_no_growth_records_exist', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 1,
          personalBestTimeMs: 9344,
          averageTimeMs: 9344,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord({ eventType: 'WCA_222', timeMs: 2444, effectiveTimeMs: 2444 })]))
    vi.mocked(getMyGrowth).mockResolvedValue(createGrowthSummaryResponse({
      currentPb: { status: 'NO_DATA', effectiveTimeMs: null },
      recentAo5: { status: 'INSUFFICIENT_SAMPLE', valueMs: null },
      recentAo12: { status: 'INSUFFICIENT_SAMPLE', valueMs: null },
      activity: { totalSolveCount: 0 },
    }))

    render(<MyPage />)

    expect(await screen.findByText('아직 성장 데이터를 만들 기록이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /PB progression step chart/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
    expect(mockNavigate).toHaveBeenCalledWith('/timer')
  })

  it('should_render_growth_dashboard_from_private_growth_endpoints', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))

    render(<MyPage />)

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    expect(screen.getByText('Recent Ao5')).toBeInTheDocument()
    expect(screen.getByText('Recent Ao12')).toBeInTheDocument()
    expect(screen.getAllByText('최근 7일')).toHaveLength(2)
    expect(screen.getByText('30일 추세')).toBeInTheDocument()
    expect(screen.getByText('30일 추세를 텍스트로 보기')).toBeInTheDocument()
    expect(screen.getByText('PB Progression')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'PB progression step chart. 현재 불러온 PB 1개' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'PB progression 텍스트 타임라인' })).toBeInTheDocument()
    expect(mockRechartsLine.mock.calls.some(([props]) => props.type === 'stepAfter' && props.dataKey === 'effectiveTimeMs')).toBe(true)
    expect(screen.getByText('비교: 0.250 좁아짐')).toBeInTheDocument()
    expect(screen.getByText('연습 활동')).toBeInTheDocument()
    expect(screen.queryByText('다음 성장 단계')).not.toBeInTheDocument()
    expect(getMyGrowth).toHaveBeenCalledWith({ eventType: 'WCA_333' })
    expect(getMyGrowthTrend).toHaveBeenCalledWith({ eventType: 'WCA_333', period: '30D' })
    expect(getMyGrowthPbProgression).toHaveBeenCalledWith({ eventType: 'WCA_333', page: 1, size: 50 })
  })

  it.each([
    { totalSolveCount: 1, remaining: 4 },
    { totalSolveCount: 4, remaining: 1 },
  ])('should_render_pb_activity_and_ao5_progress_for_$totalSolveCount_solves', async ({ totalSolveCount, remaining }) => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockResolvedValue(createGrowthSummaryForSolveCount(totalSolveCount, {
      recentAo5: { status: 'INSUFFICIENT_DATA', valueMs: null },
      recentAo12: { status: 'INSUFFICIENT_DATA', valueMs: null },
    }))

    render(<MyPage />)

    expect(await screen.findByText(`첫 Ao5까지 ${remaining}회 남음`)).toBeInTheDocument()
    expect(screen.getByText('Current PB')).toBeInTheDocument()
    expect(screen.getByText('연습 활동')).toBeInTheDocument()
    expect(screen.getByText('다음 연습')).toBeInTheDocument()
    expect(screen.queryByText('Recent Ao5')).not.toBeInTheDocument()
    expect(screen.queryByText('Recent Ao12')).not.toBeInTheDocument()
    expect(screen.queryByText('최근 기록 흐름')).not.toBeInTheDocument()
    expect(screen.queryByText('최근 일관성')).not.toBeInTheDocument()
    expect(screen.queryByText('PB Progression')).not.toBeInTheDocument()
  })

  it.each([
    { totalSolveCount: 5, remaining: 7, ao5: { status: 'DNF', valueMs: null }, expectedAo5: 'DNF' },
    { totalSolveCount: 11, remaining: 1, ao5: { status: 'AVAILABLE', valueMs: 10200 }, expectedAo5: '10.200' },
  ])('should_render_ao5_and_ao12_progress_for_$totalSolveCount_solves', async ({ totalSolveCount, remaining, ao5, expectedAo5 }) => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockResolvedValue(createGrowthSummaryForSolveCount(totalSolveCount, {
      recentAo5: ao5,
      recentAo12: { status: 'INSUFFICIENT_DATA', valueMs: null },
    }))

    render(<MyPage />)

    expect(await screen.findByText(`Ao12까지 ${remaining}회 남음`)).toBeInTheDocument()
    const currentPerformance = screen.getByRole('region', { name: '현재 기록' })
    expect(within(currentPerformance).getByText('Recent Ao5')).toBeInTheDocument()
    expect(within(currentPerformance).getByText(expectedAo5)).toBeInTheDocument()
    expect(screen.queryByText('Recent Ao12')).not.toBeInTheDocument()
    expect(screen.queryByText('최근 기록 흐름')).not.toBeInTheDocument()
    expect(screen.getByText('연습 활동')).toBeInTheDocument()
    expect(screen.getByText('다음 연습')).toBeInTheDocument()
  })

  it('should_render_available_consistency_window_when_aggregate_comparison_is_insufficient', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockResolvedValue(createGrowthSummaryResponse({
      consistency: {
        status: 'INSUFFICIENT_DATA',
        current: { status: 'AVAILABLE', iqrMs: 850, dnfCount: 1, plusTwoCount: 2 },
        previous: { status: 'INSUFFICIENT_DATA', iqrMs: null, dnfCount: 0, plusTwoCount: 0 },
        direction: 'NOT_AVAILABLE',
        differenceMs: null,
      },
    }))

    render(<MyPage />)

    const consistencySection = await screen.findByRole('region', { name: '최근 일관성' })
    expect(within(consistencySection).getByText('IQR 0.850')).toBeInTheDocument()
    expect(within(consistencySection).getByText('DNF 1회 · +2 2회')).toBeInTheDocument()
    expect(within(consistencySection).getByText('데이터 부족')).toBeInTheDocument()
    expect(within(consistencySection).queryByText(/비교:/)).not.toBeInTheDocument()
  })

  it('should_keep_profile_and_record_history_available_when_growth_loading_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockRejectedValue(new Error('성장 데이터 조회 실패'))

    render(<MyPage />)

    expect(await screen.findByText('성장 데이터 조회 실패')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '계정 관리' })).toBeInTheDocument()
    expect(screen.getByText('전체 기록')).toBeInTheDocument()
    expect(await screen.findByText('9.344')).toBeInTheDocument()
  })

  it('should_keep_summary_and_pb_progression_when_trend_request_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthTrend).mockRejectedValue(new Error('30일 추세 조회 실패'))

    render(<MyPage />)

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    expect(await screen.findByText('30일 추세 조회 실패')).toBeInTheDocument()
    expect(await screen.findByText('PB Progression')).toBeInTheDocument()
  })

  it('should_keep_summary_and_trend_when_pb_progression_request_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthPbProgression).mockRejectedValue(new Error('PB progression 조회 실패'))

    render(<MyPage />)

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    expect(await screen.findByText('PB progression 조회 실패')).toBeInTheDocument()
    expect(screen.getByText('30일 추세')).toBeInTheDocument()
  })

  it('should_render_summary_before_a_slow_trend_request_finishes', async () => {
    const trend = createDeferred()
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthTrend).mockReturnValue(trend.promise)

    render(<MyPage />)

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    expect(screen.getByText('30일 추세를 불러오는 중입니다.')).toBeInTheDocument()

    trend.resolve(createGrowthTrendResponse([
      { date: '2026-08-15', recordCount: 1, rankableCount: 1, medianTimeMs: 10000, dnfCount: 0, plusTwoCount: 0 },
    ]))

    expect(await screen.findByText('30일 추세를 텍스트로 보기')).toBeInTheDocument()
  })

  it('should_render_summary_before_a_slow_pb_progression_request_finishes', async () => {
    const progression = createDeferred()
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthPbProgression).mockReturnValue(progression.promise)

    render(<MyPage />)

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    expect(screen.getByText('PB progression을 불러오는 중입니다.')).toBeInTheDocument()

    progression.resolve(createPbProgressionResponse([
      { recordId: 2, effectiveTimeMs: 9123, createdAt: '2026-08-02T09:00:00Z' },
    ]))

    expect(await screen.findByText('9.123')).toBeInTheDocument()
  })

  it('should_start_pb_progression_only_after_summary_is_committed', async () => {
    const summary = createDeferred()
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockReturnValue(summary.promise)

    render(<MyPage />)

    expect(getMyGrowthPbProgression).not.toHaveBeenCalled()

    summary.resolve(createGrowthSummaryResponse())

    expect(await screen.findByText('Current PB')).toBeInTheDocument()
    await waitFor(() => {
      expect(getMyGrowthPbProgression).toHaveBeenCalledWith({ eventType: 'WCA_333', page: 1, size: 50 })
    })
  })

  it('should_preserve_a_successful_trend_when_summary_request_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowth).mockRejectedValue(new Error('성장 데이터 조회 실패'))

    render(<MyPage />)

    expect(await screen.findByText('성장 데이터 조회 실패')).toBeInTheDocument()
    expect(screen.getByText('30일 추세')).toBeInTheDocument()
    expect(await screen.findByText('30일 추세를 텍스트로 보기')).toBeInTheDocument()
    expect(getMyGrowthPbProgression).not.toHaveBeenCalled()
  })

  it('should_load_one_bounded_next_page_for_pb_progression', async () => {
    vi.mocked(getMyGrowthPbProgression)
      .mockResolvedValueOnce(createPbProgressionResponse([
        { recordId: 3, effectiveTimeMs: 8888, createdAt: '2026-08-03T09:00:00Z' },
      ], { hasNext: true, totalPages: 2 }))
      .mockResolvedValueOnce(createPbProgressionResponse([
        { recordId: 2, effectiveTimeMs: 9123, createdAt: '2026-08-02T09:00:00Z' },
      ], { page: 2, hasNext: false, totalPages: 2 }))

    render(<MyPage />)

    fireEvent.click(await screen.findByRole('button', { name: '더 보기' }))

    await waitFor(() => {
      expect(getMyGrowthPbProgression).toHaveBeenLastCalledWith({ eventType: 'WCA_333', page: 2, size: 50 })
      expect(screen.getByText('9.123')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'PB progression step chart. 현재 불러온 PB 2개' })).toBeInTheDocument()
    })

    const timeline = screen.getByRole('list', { name: 'PB progression 텍스트 타임라인' })
    expect(within(timeline).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '9.1232026년 8월 2일 오후 6시',
      '8.8882026년 8월 3일 오후 6시',
    ])
    expect(mockRechartsLineChart.mock.calls.some(([props]) => (
      props.data?.map((point) => point.recordId).join(',') === '2,3'
    ))).toBe(true)
  })

  it('should_discard_a_stale_pb_load_more_response_after_record_mutation', async () => {
    const stalePage = createDeferred()
    let pageOneCallCount = 0
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(updateRecordPenalty).mockResolvedValue({ message: '기록 페널티가 수정되었습니다.' })
    vi.mocked(getMyGrowthPbProgression).mockImplementation(({ page }) => {
      if (page === 2) {
        return stalePage.promise
      }

      pageOneCallCount += 1
      return Promise.resolve(createPbProgressionResponse([
        pageOneCallCount === 1
          ? { recordId: 1, effectiveTimeMs: 9344, createdAt: '2026-08-03T09:00:00Z' }
          : { recordId: 3, effectiveTimeMs: 8888, createdAt: '2026-08-04T09:00:00Z' },
      ], { hasNext: true, totalPages: 2 }))
    })

    render(<MyPage />)

    fireEvent.click(await screen.findByRole('button', { name: '더 보기' }))
    await waitFor(() => {
      expect(getMyGrowthPbProgression).toHaveBeenCalledWith({ eventType: 'WCA_333', page: 2, size: 50 })
    })

    fireEvent.click(screen.getByRole('button', { name: '+2' }))
    await waitFor(() => {
      const refreshedTimeline = screen.getByRole('list', { name: 'PB progression 텍스트 타임라인' })
      expect(within(refreshedTimeline).getByText('8.888')).toBeInTheDocument()
    })

    await act(async () => {
      stalePage.resolve(createPbProgressionResponse([
        { recordId: 2, effectiveTimeMs: 7777, createdAt: '2026-08-02T09:00:00Z' },
      ], { page: 2, hasNext: false, totalPages: 2 }))
      await stalePage.promise
    })

    expect(screen.queryByText('7.777')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'PB progression step chart. 현재 불러온 PB 1개' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '더 보기' })).toBeEnabled()
    expect(screen.queryByText(/PB progression 조회 실패/)).not.toBeInTheDocument()
  })

  it('should_refresh_growth_after_penalty_success_when_profile_refresh_fails', async () => {
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
      .mockRejectedValueOnce(new Error('프로필 갱신 실패'))
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(updateRecordPenalty).mockResolvedValue({ message: '기록 페널티가 수정되었습니다.' })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(updateRecordPenalty).toHaveBeenCalledWith(1, { penalty: 'PLUS_TWO' })
      expect(getMyGrowth).toHaveBeenCalledTimes(2)
      expect(getMyGrowthTrend).toHaveBeenCalledTimes(2)
      expect(getMyGrowthPbProgression).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('프로필 갱신 실패')).toBeInTheDocument()
  })

  it('should_refresh_growth_after_delete_success_when_record_history_refresh_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()]))
      .mockRejectedValueOnce(new Error('기록 갱신 실패'))
    vi.mocked(deleteRecord).mockResolvedValue({ message: '기록이 삭제되었습니다.' })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith(1)
      expect(getMyGrowth).toHaveBeenCalledTimes(2)
      expect(getMyGrowthTrend).toHaveBeenCalledTimes(2)
      expect(getMyGrowthPbProgression).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('기록 갱신 실패')).toBeInTheDocument()
  })

  it('should_format_helper_values_for_records_and_events', () => {
    expect(getPenaltyLabel('PLUS_TWO')).toBe('+2')
    expect(getPenaltyLabel('DNF')).toBe('DNF')
    expect(getPenaltyLabel('NONE')).toBe('-')
    expect(getDisplayRecordTime({ penalty: 'DNF', timeMs: 12000 })).toBe('DNF')
    expect(getDisplayRecordTime({ penalty: 'NONE', effectiveTimeMs: 9344, timeMs: 9344 })).toBe('9.344')
    expect(getDisplayRecordTime({ penalty: 'NONE', timeMs: 8123 })).toBe('8.123')
    expect(formatDateTime(null)).toBe('-')
    expect(formatTrendAxisTick(9344)).toBe('9.344')
    expect(formatGrowthMetric('DNF', null)).toBe('DNF')
    expect(formatGrowthMetric('INSUFFICIENT_SAMPLE', null)).toBe('데이터 부족')
    expect(formatGrowthMetric('NO_DATA', null)).toBe('기록 없음')
    expect(formatGrowthDate('2026-08-14')).toBe('2026년 8월 14일')
    expect(previousCalendarDate('2026-03-01')).toBe('2026-02-28')
    expect(previousCalendarDate('2024-03-01')).toBe('2024-02-29')
    expect(previousCalendarDate('2026-01-01')).toBe('2025-12-31')
    expect(formatGrowthPeriodRange('2026-08-08', '2026-08-15')).toBe('2026년 8월 8일 ~ 2026년 8월 14일')
    expect(formatPbProgressionAxisTick('2026-08-02T09:00:00Z')).toBe('8/2')
    expect(getNextPracticeAction(createGrowthSummaryResponse().data)).toBe('다음 12회에서 10.500 이하 만들기')
    expect(getNextPracticeAction({ activity: { totalSolveCount: 4 } })).toBe('첫 Ao5 만들기')
    expect(getNextPracticeAction({ activity: { totalSolveCount: 8 }, recentAo5: { status: 'AVAILABLE', valueMs: 11000 } })).toBe('12회까지 기록 이어가기')
    expect(getGrowthStage(0)).toBe('EMPTY')
    expect(getGrowthStage(1)).toBe('BEFORE_AO5')
    expect(getGrowthStage(4)).toBe('BEFORE_AO5')
    expect(getGrowthStage(5)).toBe('BEFORE_AO12')
    expect(getGrowthStage(11)).toBe('BEFORE_AO12')
    expect(getGrowthStage(12)).toBe('FULL')
    expect(getRemainingSolveCount(5, 1)).toBe(4)
    expect(getRemainingSolveCount(12, 11)).toBe(1)
    expect(getRemainingSolveCount(5, 12)).toBe(0)
    expect(getConsistencyComparisonLabel(createGrowthSummaryResponse().data.consistency)).toBe('비교: 0.250 좁아짐')
    expect(getConsistencyComparisonLabel({ status: 'INSUFFICIENT_DATA' })).toBeNull()
    expect(resolveEventType('3x3x3')).toBe('WCA_333')
    expect(resolveEventType('CUSTOM')).toBe('CUSTOM')
    expect(resolveEventType(null)).toBeNull()
    expect(getEventLabel('WCA_222')).toBe('2x2x2')
    expect(getEventLabel('CUSTOM')).toBe('CUSTOM')
    expect(getEventLabel(null)).toBe('-')
    expect(buildFirstPageFromRecentRecords(null)).toEqual({
      items: [],
      page: 1,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    })
    expect(buildPbProgressionChartData([
      { recordId: 3, effectiveTimeMs: 8888, createdAt: '2026-08-03T09:00:00Z' },
      { recordId: 2, effectiveTimeMs: 9123, createdAt: '2026-08-02T09:00:00Z' },
      { recordId: 1, effectiveTimeMs: 9344, createdAt: '2026-08-01T09:00:00Z' },
    ]).map((point) => point.recordId)).toEqual([1, 2, 3])
  })

  it('should_mark_only_the_backend_declared_final_trend_point_as_partial', () => {
    const points = [
      { date: '2026-08-14', recordCount: 2, medianTimeMs: 10100, dnfCount: 0, plusTwoCount: 0 },
      { date: '2026-08-15', recordCount: 3, medianTimeMs: 10000, dnfCount: 0, plusTwoCount: 1 },
    ]

    expect(buildGrowthTrendChartData({ todayPartial: true, toDate: '2026-08-15', points }).map((point) => point.isTodayPartial)).toEqual([false, true])
    expect(buildGrowthTrendChartData({ todayPartial: false, toDate: '2026-08-15', points }).some((point) => point.isTodayPartial)).toBe(false)
  })

  it('should_render_today_partial_in_trend_chart_text_and_tooltip_only_when_declared_by_api', async () => {
    const points = [
      { date: '2026-08-14', recordCount: 2, rankableCount: 2, medianTimeMs: 10100, dnfCount: 0, plusTwoCount: 0 },
      { date: '2026-08-15', recordCount: 3, rankableCount: 3, medianTimeMs: 10000, dnfCount: 0, plusTwoCount: 1 },
    ]
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthTrend).mockResolvedValue(createGrowthTrendResponse(points, { todayPartial: true, toDate: '2026-08-15' }))

    render(<MyPage />)

    expect(await screen.findByText('오늘 데이터는 진행 중인 기록입니다.')).toBeInTheDocument()
    expect(mockRechartsTooltip.mock.calls.some(([props]) => props.filterNull === false)).toBe(true)
    fireEvent.click(screen.getByText('30일 추세를 텍스트로 보기'))
    expect(screen.getByText('2026년 8월 15일 · 오늘, 진행 중: 중앙 10.000 · solve 3회')).toBeInTheDocument()

    const { rerender } = render(<GrowthTrendTooltip active={false} payload={[]} />)
    rerender(<GrowthTrendTooltip active payload={[{ payload: { ...points[1], isTodayPartial: true } }]} />)
    expect(screen.getByText('2026년 8월 15일 · 오늘, 진행 중 · 10.000')).toBeInTheDocument()
  })

  it('should_render_recordless_and_dnf_only_trend_tooltips_from_preserved_null_points', () => {
    const { rerender } = render(
      <GrowthTrendTooltip
        active
        payload={[{ payload: { date: '2026-08-14', recordCount: 0, medianTimeMs: null, dnfCount: 0, plusTwoCount: 0 } }]}
      />,
    )

    expect(screen.getByText('2026년 8월 14일 · 기록 없음')).toBeInTheDocument()
    expect(screen.getByText('solve 0회 · DNF 0회 · +2 0회')).toBeInTheDocument()

    rerender(
      <GrowthTrendTooltip
        active
        payload={[{ payload: { date: '2026-08-15', recordCount: 3, medianTimeMs: null, dnfCount: 3, plusTwoCount: 0, isTodayPartial: true } }]}
      />,
    )

    expect(screen.getByText('2026년 8월 15일 · 오늘, 진행 중 · DNF-only')).toBeInTheDocument()
    expect(screen.getByText('solve 3회 · DNF 3회 · +2 0회')).toBeInTheDocument()
  })

  it('should_render_pb_progression_tooltip_with_canonical_time_and_seoul_timestamp', () => {
    render(
      <GrowthPbProgressionTooltip
        active
        payload={[{ payload: { effectiveTimeMs: 9123, createdAt: '2026-08-02T09:00:00Z' } }]}
      />,
    )

    expect(screen.getByText('PB 9.123')).toBeInTheDocument()
    expect(screen.getByText('2026년 8월 2일 오후 6시')).toBeInTheDocument()
  })

  it('should_not_render_partial_trend_label_when_api_marks_today_as_complete', async () => {
    const points = [
      { date: '2026-08-14', recordCount: 2, rankableCount: 2, medianTimeMs: 10100, dnfCount: 0, plusTwoCount: 0 },
      { date: '2026-08-15', recordCount: 3, rankableCount: 3, medianTimeMs: 10000, dnfCount: 0, plusTwoCount: 1 },
    ]
    vi.mocked(getMyProfile).mockResolvedValue({ data: { userId: 1, nickname: 'Tester', mainEvent: 'WCA_333' } })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))
    vi.mocked(getMyGrowthTrend).mockResolvedValue(createGrowthTrendResponse(points, { todayPartial: false, toDate: '2026-08-15' }))

    render(<MyPage />)

    expect(await screen.findByText('30일 추세')).toBeInTheDocument()
    expect(screen.queryByText('오늘 데이터는 진행 중인 기록입니다.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('30일 추세를 텍스트로 보기'))
    expect(screen.queryByText(/오늘, 진행 중/)).not.toBeInTheDocument()
  })

  it('should_display_growth_period_with_inclusive_end_date', () => {
    render(<GrowthPeriodCard label="최근 7일" period={{ fromDate: '2026-08-08', toDateExclusive: '2026-08-15', medianTimeMs: 10100, recordCount: 12, dnfCount: 1 }} />)

    expect(screen.getByText('2026년 8월 8일 ~ 2026년 8월 14일')).toBeInTheDocument()
  })

  it('should_render_record_trend_tooltip_when_payload_is_active', () => {
    const { rerender } = render(<RecordTrendTooltip active={false} payload={[]} />)

    expect(screen.queryByText('9.344')).not.toBeInTheDocument()

    rerender(
      <RecordTrendTooltip
        active
        payload={[
          {
            payload: {
              displayTime: '9.344',
              createdAt: '2026-04-04T18:11:00',
            },
          },
        ]}
      />,
    )

    expect(screen.getByText('9.344')).toBeInTheDocument()
    expect(screen.getByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()
  })

  it('should_use_current_user_fallbacks_when_profile_payload_is_missing', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: null,
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))

    render(<MyPage />)

    expect(await screen.findByText('Tester')).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('나의 성장')).toBeInTheDocument()
  })

  it('should_preserve_dnf_only_trend_as_non_numeric_growth_data', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 2,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([
      createRecord({ penalty: 'DNF', effectiveTimeMs: null, timeMs: 9344 }),
      createRecord({ id: 2, penalty: 'DNF', effectiveTimeMs: null, timeMs: 9544 }),
    ]))
    vi.mocked(getMyGrowthTrend).mockResolvedValue(createGrowthTrendResponse([
      { date: '2026-08-14', recordCount: 2, rankableCount: 0, medianTimeMs: null, dnfCount: 2, plusTwoCount: 0 },
      { date: '2026-08-15', recordCount: 1, rankableCount: 0, medianTimeMs: null, dnfCount: 1, plusTwoCount: 0 },
    ], { todayPartial: true, toDate: '2026-08-15' }))

    render(<MyPage />)

    expect(await screen.findByText('아직 숫자로 표시할 일별 중앙 기록이 없습니다. DNF-only 기록은 solve 수로만 남습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('30일 추세를 텍스트로 보기'))
    expect(screen.getByText('2026년 8월 14일: DNF-only · solve 2회')).toBeInTheDocument()
    expect(screen.getByText('2026년 8월 15일 · 오늘, 진행 중: DNF-only · solve 1회')).toBeInTheDocument()
  })

  it('should_use_default_profile_form_values_when_profile_fields_are_missing', async () => {
    vi.mocked(useAuth).mockReturnValue({
      clearAccessToken: mockClearAccessToken,
      currentUser: null,
      updateCurrentUser: mockUpdateCurrentUser,
    })
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: null,
        mainEvent: null,
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))

    const profilePanel = screen.getByRole('tabpanel')
    expect(within(profilePanel).getByLabelText('닉네임')).toHaveValue('')
    expect(within(profilePanel).getByLabelText('주 종목')).toHaveValue('WCA_333')
  })

  it('should_not_logout_when_logout_confirmation_is_cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(logout).not.toHaveBeenCalled()
    expect(mockClearAccessToken).not.toHaveBeenCalled()
  })

  it('should_alert_and_clear_session_when_logout_request_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))
    vi.mocked(logout).mockRejectedValue(new Error('로그아웃 실패'))
    vi.stubGlobal('alert', vi.fn())

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('로그아웃 실패\n로컬 세션은 정리됩니다.')
    })
    expect(mockClearAccessToken).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('should_redirect_with_empty_email_when_password_change_succeeds_without_current_user_email', async () => {
    vi.mocked(useAuth).mockReturnValue({
      clearAccessToken: mockClearAccessToken,
      currentUser: null,
      updateCurrentUser: mockUpdateCurrentUser,
    })
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))
    vi.mocked(changeMyPassword).mockResolvedValue({
      message: '비밀번호를 변경했습니다. 다시 로그인해주세요.',
      data: null,
    })

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))
    fireEvent.click(screen.getByRole('tab', { name: '비밀번호 변경' }))

    const passwordPanel = screen.getByRole('tabpanel')
    fireEvent.change(within(passwordPanel).getByLabelText('현재 비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호 확인'), { target: { value: 'newPassword123!' } })
    fireEvent.click(within(passwordPanel).getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          notice: '비밀번호를 변경했습니다. 다시 로그인해주세요.',
          email: '',
        },
      })
    })
  })

  it('should_validate_and_show_request_error_when_profile_update_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))
    vi.mocked(updateMyProfile).mockRejectedValue(new Error('프로필 수정 실패'))

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))
    const profilePanel = screen.getByRole('tabpanel')

    fireEvent.change(within(profilePanel).getByLabelText('닉네임'), { target: { value: '   ' } })
    fireEvent.click(within(profilePanel).getByRole('button', { name: '프로필 저장' }))
    expect(await screen.findByText('닉네임과 주 종목을 모두 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(within(profilePanel).getByLabelText('닉네임'), { target: { value: 'SpeedMaster' } })
    fireEvent.click(within(profilePanel).getByRole('button', { name: '프로필 저장' }))
    expect(await screen.findByText('프로필 수정 실패')).toBeInTheDocument()
  })

  it('should_validate_and_show_request_error_when_password_change_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))
    vi.mocked(changeMyPassword).mockRejectedValue(new Error('비밀번호 변경 실패'))

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '계정 관리' }))
    fireEvent.click(screen.getByRole('tab', { name: '비밀번호 변경' }))

    const passwordPanel = screen.getByRole('tabpanel')
    fireEvent.submit(within(passwordPanel).getByRole('button', { name: '비밀번호 변경' }).closest('form'))
    expect(await screen.findByText('모든 입력란을 채워주세요.')).toBeInTheDocument()

    fireEvent.change(within(passwordPanel).getByLabelText('현재 비밀번호'), { target: { value: 'password123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호'), { target: { value: 'newPassword123!' } })
    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호 확인'), { target: { value: 'otherPassword123!' } })
    fireEvent.click(within(passwordPanel).getByRole('button', { name: '비밀번호 변경' }))
    expect(await screen.findByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()

    fireEvent.change(within(passwordPanel).getByLabelText('새 비밀번호 확인'), { target: { value: 'newPassword123!' } })
    fireEvent.click(within(passwordPanel).getByRole('button', { name: '비밀번호 변경' }))
    expect(await screen.findByText('비밀번호 변경 실패')).toBeInTheDocument()
  })

  it('should_show_empty_states_when_recent_records_source_payload_is_null', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: '3x3x3',
        summary: {
          totalSolveCount: 0,
          personalBestTimeMs: null,
          averageTimeMs: null,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue({ data: null })

    render(<MyPage />)

    expect(await screen.findByText('나의 성장')).toBeInTheDocument()
    expect(await screen.findByText('아직 저장된 기록이 없습니다.')).toBeInTheDocument()
  })

  it('should_fallback_to_pagination_flags_when_server_omits_has_previous_and_has_next', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockResolvedValueOnce({
        data: {
          items: [
            createRecord({ id: 11, timeMs: 11111, effectiveTimeMs: 11111, createdAt: '2026-04-04T18:22:00' }),
          ],
          page: 2,
          size: 10,
          totalElements: 11,
          totalPages: 2,
        },
      })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('2026년 4월 4일 오후 6시 22분')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('should_normalize_current_page_after_record_penalty_update_when_synced_page_count_shrinks', async () => {
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: 'WCA_333',
          summary: {
            totalSolveCount: 11,
            personalBestTimeMs: 9344,
            averageTimeMs: 10555,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: 'WCA_333',
          summary: {
            totalSolveCount: 1,
            personalBestTimeMs: 9344,
            averageTimeMs: 9344,
          },
        },
      })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockResolvedValueOnce(createRecordsResponse([
        createRecord({ id: 11, createdAt: '2026-04-04T18:22:00' }),
      ], { page: 2, totalElements: 11, totalPages: 2, hasPrevious: true }))
      .mockResolvedValueOnce(createRecordsResponse([], { totalElements: 0, totalPages: 0 }))
      .mockResolvedValueOnce(createRecordsResponse([], { page: 2, totalElements: 0, totalPages: 0 }))
    vi.mocked(updateRecordPenalty).mockResolvedValue({
      message: '기록 페널티가 수정되었습니다.',
      data: {
        id: 11,
        timeMs: 9344,
        effectiveTimeMs: 11344,
        penalty: 'PLUS_TWO',
      },
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('2026년 4월 4일 오후 6시 22분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    })
    await waitFor(() => {
      expect(screen.queryByText('2026년 4월 4일 오후 6시 22분')).not.toBeInTheDocument()
    })
  })

  it('should_not_delete_record_when_delete_confirmation_is_cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 1,
          personalBestTimeMs: 9344,
          averageTimeMs: 9344,
        },
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createRecord()]))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(deleteRecord).not.toHaveBeenCalled()
  })

  it('should_show_error_message_when_page_two_records_loading_fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockRejectedValueOnce(new Error('페이지 기록 조회 실패'))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('페이지 기록 조회 실패')).toBeInTheDocument()
  })

  it('should_normalize_current_page_when_requested_page_exceeds_total_pages', async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockResolvedValueOnce(createRecordsResponse([
        createRecord({ id: 11, timeMs: 11111, effectiveTimeMs: 11111, createdAt: '2026-04-04T18:22:00' }),
      ], { page: 2, totalElements: 11, totalPages: 0, hasPrevious: true }))

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    })
    expect(screen.queryByText('2026년 4월 4일 오후 6시 22분')).not.toBeInTheDocument()
  })

  it('should_keep_current_page_when_record_penalty_update_sync_returns_same_page_count', async () => {
    let pageOneFetchCount = 0
    let pageTwoFetchCount = 0
    vi.mocked(getMyProfile)
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: 'WCA_333',
          summary: {
            totalSolveCount: 11,
            personalBestTimeMs: 9344,
            averageTimeMs: 10555,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          userId: 1,
          nickname: 'Tester',
          mainEvent: 'WCA_333',
          summary: {
            totalSolveCount: 11,
            personalBestTimeMs: 11344,
            averageTimeMs: 11344,
          },
        },
      })
    vi.mocked(getMyRecords).mockImplementation(({ page, size }) => {
      if (page === 1 && size === 100) {
        pageOneFetchCount += 1
        return Promise.resolve(
          createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }),
        )
      }

      if (page === 2 && size === 10) {
        pageTwoFetchCount += 1

        if (pageTwoFetchCount === 1) {
          return Promise.resolve(createRecordsResponse([
            createRecord({ id: 11, createdAt: '2026-04-04T18:22:00' }),
          ], { page: 2, totalElements: 11, totalPages: 2, hasPrevious: true }))
        }

        return Promise.resolve(createRecordsResponse([
          createRecord({
            id: 11,
            createdAt: '2026-04-04T18:22:00',
            effectiveTimeMs: 11344,
            penalty: 'PLUS_TWO',
          }),
        ], { page: 2, totalElements: 11, totalPages: 2, hasPrevious: true }))
      }

      return Promise.reject(new Error(`unexpected records query: ${page}:${size}`))
    })
    vi.mocked(updateRecordPenalty).mockResolvedValue({
      message: '기록 페널티가 수정되었습니다.',
      data: {
        id: 11,
        timeMs: 9344,
        effectiveTimeMs: 11344,
        penalty: 'PLUS_TWO',
      },
    })

    render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText('2026년 4월 4일 오후 6시 22분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(pageOneFetchCount).toBeGreaterThanOrEqual(2)
      expect(pageTwoFetchCount).toBeGreaterThanOrEqual(2)
      expect(screen.getByRole('button', { name: '2' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
      expect(screen.getAllByText('11.344').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should_ignore_pending_profile_and_record_requests_when_component_is_unmounted', async () => {
    let resolveProfile
    let rejectRecords
    vi.mocked(getMyProfile).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        }),
    )
    vi.mocked(getMyRecords).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRecords = reject
        }),
    )

    const { unmount } = render(<MyPage />)

    unmount()
    resolveProfile({ data: null })
    rejectRecords(new Error('late records failure'))

    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalledTimes(1)
      expect(getMyRecords).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_profile_failure_and_recent_record_success_when_component_is_unmounted', async () => {
    const profileDeferred = createDeferred()
    const recordsDeferred = createDeferred()
    vi.mocked(getMyProfile).mockImplementation(() => profileDeferred.promise)
    vi.mocked(getMyRecords).mockImplementation(() => recordsDeferred.promise)

    const { unmount } = render(<MyPage />)

    unmount()
    profileDeferred.reject(new Error('late profile failure'))
    recordsDeferred.resolve(createRecordsResponse([]))

    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalledTimes(1)
      expect(getMyRecords).toHaveBeenCalledTimes(1)
    })
  })

  it('should_ignore_pending_page_two_record_success_when_component_is_unmounted', async () => {
    const pageTwoDeferred = createDeferred()
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockImplementationOnce(() => pageTwoDeferred.promise)

    const { unmount } = render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    unmount()
    pageTwoDeferred.resolve(createRecordsResponse([
      createRecord({ id: 11, createdAt: '2026-04-04T18:22:00' }),
    ], { page: 2, totalElements: 11, totalPages: 2, hasPrevious: true }))

    await waitFor(() => {
      expect(getMyRecords).toHaveBeenCalledTimes(2)
    })
  })

  it('should_ignore_pending_page_two_record_failure_when_component_is_unmounted', async () => {
    const pageTwoDeferred = createDeferred()
    vi.mocked(getMyProfile).mockResolvedValue({
      data: {
        userId: 1,
        nickname: 'Tester',
        mainEvent: 'WCA_333',
        summary: {
          totalSolveCount: 11,
          personalBestTimeMs: 9344,
          averageTimeMs: 10555,
        },
      },
    })
    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse([createRecord()], { totalElements: 11, totalPages: 2, hasNext: true }))
      .mockImplementationOnce(() => pageTwoDeferred.promise)

    const { unmount } = render(<MyPage />)

    expect(await screen.findByText('2026년 4월 4일 오후 6시 11분')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    unmount()
    pageTwoDeferred.reject(new Error('late page two failure'))

    await waitFor(() => {
      expect(getMyRecords).toHaveBeenCalledTimes(2)
    })
  })
})
