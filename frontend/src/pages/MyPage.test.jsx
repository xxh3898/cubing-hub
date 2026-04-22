import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteRecord, getMyProfile, getMyRecords, logout, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import MyPage from './MyPage.jsx'

const mockNavigate = vi.fn()

vi.mock('../api.js', () => ({
  deleteRecord: vi.fn(),
  getMyProfile: vi.fn(),
  getMyRecords: vi.fn(),
  logout: vi.fn(),
  updateRecordPenalty: vi.fn(),
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

describe('MyPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))

    vi.mocked(useAuth).mockReturnValue({
      clearAccessToken: vi.fn(),
      currentUser: {
        nickname: 'Tester',
      },
    })
    vi.mocked(logout).mockResolvedValue({ message: '로그아웃되었습니다.' })
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
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              eventType: 'WCA_333',
              timeMs: 9344,
              effectiveTimeMs: 9344,
              penalty: 'NONE',
              createdAt: '2026-04-04T18:11:00',
            },
          ],
          page: 1,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              eventType: 'WCA_333',
              timeMs: 9344,
              effectiveTimeMs: 11344,
              penalty: 'PLUS_TWO',
              createdAt: '2026-04-04T18:11:00',
            },
          ],
          page: 1,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      })
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

    expect(await screen.findByText('기록 페널티가 수정되었습니다.')).toBeInTheDocument()
    expect((await screen.findAllByText('11.344')).length).toBeGreaterThan(0)
    expect(getMyProfile).toHaveBeenCalledTimes(2)
    expect(getMyRecords).toHaveBeenLastCalledWith({ page: 1, size: 10 })
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
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              eventType: 'WCA_333',
              timeMs: 9344,
              effectiveTimeMs: 9344,
              penalty: 'NONE',
              createdAt: '2026-04-04T18:11:00',
            },
          ],
          page: 1,
          size: 10,
          totalElements: 11,
          totalPages: 2,
          hasNext: true,
          hasPrevious: false,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 11,
              eventType: 'WCA_333',
              timeMs: 11111,
              effectiveTimeMs: 11111,
              penalty: 'NONE',
              createdAt: '2026-04-04T18:22:00',
            },
          ],
          page: 2,
          size: 10,
          totalElements: 11,
          totalPages: 2,
          hasNext: false,
          hasPrevious: true,
        },
      })

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
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 1,
              eventType: 'WCA_333',
              timeMs: 9344,
              effectiveTimeMs: 9344,
              penalty: 'NONE',
              createdAt: '2026-04-04T18:11:00',
            },
          ],
          page: 1,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      })
      .mockResolvedValueOnce({
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

    expect(await screen.findByText('기록이 삭제되었습니다.')).toBeInTheDocument()
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
      .mockResolvedValueOnce({
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

    expect(await screen.findByText('기록 조회 실패')).toBeInTheDocument()

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
          {
            id: 1,
            eventType: 'WCA_333',
            timeMs: 9344,
            effectiveTimeMs: 9344,
            penalty: 'NONE',
            createdAt: '2026-04-04T18:11:00',
          },
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

    expect(await screen.findByText('패널티 수정 실패')).toBeInTheDocument()
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
          {
            id: 1,
            eventType: 'WCA_333',
            timeMs: 9344,
            effectiveTimeMs: 9344,
            penalty: 'NONE',
            createdAt: '2026-04-04T18:11:00',
          },
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

    expect(await screen.findByText('기록 삭제 실패')).toBeInTheDocument()
  })
})
