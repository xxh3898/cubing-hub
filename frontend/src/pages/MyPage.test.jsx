import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import {
  changeMyPassword,
  deleteRecord,
  getMyProfile,
  getMyRecords,
  logout,
  updateMyProfile,
  updateRecordPenalty,
} from '../api.js'
import { useAuth } from '../context/useAuth.js'
import MyPage, {
  RecordTrendTooltip,
  buildFirstPageFromRecentRecords,
  formatDateTime,
  formatTrendAxisTick,
  getDisplayRecordTime,
  getEventLabel,
  getPenaltyLabel,
  resolveEventType,
} from './MyPage.jsx'

const mockNavigate = vi.fn()
const mockClearAccessToken = vi.fn()
const mockUpdateCurrentUser = vi.fn()

vi.mock('../api.js', () => ({
  changeMyPassword: vi.fn(),
  deleteRecord: vi.fn(),
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

    expect(await screen.findByText('0 회')).toBeInTheDocument()
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

    expect(await screen.findAllByText('기록 조회 실패')).toHaveLength(2)

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

  it('should_show_empty_graph_message_when_main_event_records_do_not_exist', async () => {
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

    render(<MyPage />)

    expect(await screen.findByText('아직 그래프로 표시할 주 종목 기록이 없습니다.')).toBeInTheDocument()
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
    expect(screen.getByText('0 회')).toBeInTheDocument()
  })

  it('should_show_all_dnf_graph_message_when_recent_main_event_records_are_all_dnf', async () => {
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

    render(<MyPage />)

    expect(await screen.findByText('최근 기록이 모두 DNF라 그래프를 그릴 수 없습니다.')).toBeInTheDocument()
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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('0 회')).toBeInTheDocument()

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

    expect(await screen.findByText('아직 그래프로 표시할 주 종목 기록이 없습니다.')).toBeInTheDocument()
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
