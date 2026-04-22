import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { deleteRecord, getMyRecords, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'
import TimerPage from './TimerPage.jsx'

vi.mock('../api.js', () => ({
  deleteRecord: vi.fn(),
  getMyRecords: vi.fn(),
  getScramble: vi.fn(),
  saveRecord: vi.fn(),
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

vi.mock('../hooks/useCubeTimer.js', () => ({
  useCubeTimer: vi.fn(),
}))

function createRecentRecord(overrides = {}) {
  return {
    id: 1,
    eventType: 'WCA_333',
    timeMs: 8000,
    effectiveTimeMs: 8000,
    penalty: 'NONE',
    createdAt: '2026-04-22T20:00:00',
    ...overrides,
  }
}

describe('TimerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
    })
    vi.mocked(useCubeTimer).mockReturnValue({
      status: 'stopped',
      finalTime: 8123,
      formattedTime: '08.123',
      resetTimer: vi.fn(),
    })
    vi.mocked(getScramble).mockResolvedValue({
      data: {
        eventType: 'WCA_333',
        scramble: "R U R' U'",
      },
    })
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: {
        id: 101,
      },
    })
    vi.mocked(getMyRecords).mockResolvedValue({
      data: {
        items: [
          createRecentRecord({ id: 1, timeMs: 8000, effectiveTimeMs: 8000, createdAt: '2026-04-22T20:00:00' }),
          createRecentRecord({ id: 2, timeMs: 9000, effectiveTimeMs: 9000, createdAt: '2026-04-22T19:59:00' }),
          createRecentRecord({ id: 3, timeMs: 10000, effectiveTimeMs: 10000, createdAt: '2026-04-22T19:58:00' }),
          createRecentRecord({ id: 4, timeMs: 11000, effectiveTimeMs: 11000, createdAt: '2026-04-22T19:57:00' }),
          createRecentRecord({ id: 5, timeMs: 12000, effectiveTimeMs: 12000, createdAt: '2026-04-22T19:56:00' }),
          createRecentRecord({ id: 6, timeMs: 13000, effectiveTimeMs: 13000, createdAt: '2026-04-22T19:55:00' }),
          createRecentRecord({ id: 7, timeMs: 14000, effectiveTimeMs: 14000, createdAt: '2026-04-22T19:54:00' }),
          createRecentRecord({ id: 8, timeMs: 15000, effectiveTimeMs: 15000, createdAt: '2026-04-22T19:53:00' }),
          createRecentRecord({ id: 9, timeMs: 16000, effectiveTimeMs: 16000, createdAt: '2026-04-22T19:52:00' }),
          createRecentRecord({ id: 10, timeMs: 17000, effectiveTimeMs: 17000, createdAt: '2026-04-22T19:51:00' }),
          createRecentRecord({ id: 11, timeMs: 18000, effectiveTimeMs: 18000, createdAt: '2026-04-22T19:50:00' }),
          createRecentRecord({ id: 12, timeMs: 19000, effectiveTimeMs: 19000, createdAt: '2026-04-22T19:49:00' }),
        ],
        page: 1,
        size: 100,
        totalElements: 12,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    })
  })

  it('should_render_scramble_visual_when_supported_scramble_is_loaded', async () => {
    render(<TimerPage />)

    const scrambleVisual = await screen.findByRole('img', { name: '현재 스크램블 시각화' })

    expect(scrambleVisual).toBeInTheDocument()
    expect(scrambleVisual).toHaveAttribute('src', expect.stringContaining('alg=R+U+R%27+U%27'))
    expect(scrambleVisual).toHaveAttribute('src', expect.stringContaining('sch=wrgyob'))
  })

  it('should_fallback_to_text_only_when_scramble_visual_fails_to_load', async () => {
    render(<TimerPage />)

    const scrambleVisual = await screen.findByRole('img', { name: '현재 스크램블 시각화' })
    fireEvent.error(scrambleVisual)

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: '현재 스크램블 시각화' })).not.toBeInTheDocument()
    })

    expect(screen.getByText('스크램블 이미지를 불러오지 못해 텍스트만 표시합니다.')).toBeInTheDocument()
  })

  it('should_render_ao5_and_ao12_from_recent_records', async () => {
    render(<TimerPage />)

    expect(await screen.findByText('10.000')).toBeInTheDocument()
    expect(screen.getByText('13.500')).toBeInTheDocument()
    expect(getMyRecords).toHaveBeenCalledWith({ page: 1, size: 100 })
  })

  it('should_update_recent_record_penalty_when_penalty_update_succeeds', async () => {
    vi.mocked(updateRecordPenalty).mockResolvedValue({
      message: '기록 페널티가 수정되었습니다.',
      data: {
        id: 101,
        timeMs: 8123,
        effectiveTimeMs: 10123,
        penalty: 'PLUS_TWO',
      },
    })

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(updateRecordPenalty).toHaveBeenCalledWith(101, { penalty: 'PLUS_TWO' })
    })

    expect(await screen.findByText('10.123')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('기록 페널티가 수정되었습니다.')
  })

  it('should_show_error_message_when_penalty_update_fails', async () => {
    vi.mocked(updateRecordPenalty).mockRejectedValue(new Error('기록 수정 실패'))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: 'DNF' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('기록 수정 실패')
    })
  })

  it('should_delete_recent_record_when_delete_succeeds', async () => {
    vi.mocked(deleteRecord).mockResolvedValue({
      message: '기록이 삭제되었습니다.',
      data: null,
    })

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith(101)
    })

    expect(toast.success).toHaveBeenCalledWith('기록이 삭제되었습니다.')
    expect(screen.getByText('현재 세션에서 저장된 기록이 아직 없습니다.')).toBeInTheDocument()
  })

  it('should_show_error_message_when_delete_fails', async () => {
    vi.mocked(deleteRecord).mockRejectedValue(new Error('기록 삭제 실패'))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('기록 삭제 실패')
    })
  })
})
