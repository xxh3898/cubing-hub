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
import MyPage from './MyPage.jsx'

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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()
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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(await screen.findByText('2026-04-04 18:22')).toBeInTheDocument()
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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith(1)
    })

    expect(toast.success).toHaveBeenCalledWith('기록이 삭제되었습니다.')
    expect(screen.getByText('아직 작성된 기록이 없습니다.')).toBeInTheDocument()
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

    expect(await screen.findByText('아직 작성된 기록이 없습니다.')).toBeInTheDocument()
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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

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

    expect(await screen.findByText('2026-04-04 18:11')).toBeInTheDocument()

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
})
