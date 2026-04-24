import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { deleteRecord, getMyRecords, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'
import {
  deleteGuestTimerRecord,
  getGuestTimerRecords,
  saveGuestTimerRecord,
  updateGuestTimerRecordPenalty,
} from '../lib/guestTimerStorage.js'
import TimerPage, {
  applyPenaltyUpdateToSavedRecord,
  createSavedRecord,
  getDisplayTime,
  getPenaltyLabel,
  getStatusLabel,
  getTimerMessage,
} from './TimerPage.jsx'

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

vi.mock('../lib/guestTimerStorage.js', () => ({
  deleteGuestTimerRecord: vi.fn(),
  getGuestTimerRecords: vi.fn(),
  saveGuestTimerRecord: vi.fn(),
  updateGuestTimerRecordPenalty: vi.fn(),
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
      handlePointerDown: vi.fn(),
      handlePointerUp: vi.fn(),
      handlePointerCancel: vi.fn(),
      resetTimer: vi.fn(),
    })
    vi.mocked(getGuestTimerRecords).mockReturnValue([])
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

  it('should_format_timer_helper_values', () => {
    expect(getTimerMessage('idle', false, false)).toBe('이 종목은 아직 구현되지 않았습니다.')
    expect(getTimerMessage('idle', true, false)).toBe('스크램블을 불러와야 타이머를 시작할 수 있습니다.')
    expect(getTimerMessage('holding', true, true)).toBe('계속 누르고 있으면 준비됩니다.')
    expect(getTimerMessage('ready', true, true)).toBe('손을 떼면 타이머가 시작됩니다.')
    expect(getTimerMessage('running', true, true)).toBe('스페이스바를 누르거나 화면을 터치하면 정지됩니다.')
    expect(getTimerMessage('stopped', true, true)).toBe('')
    expect(getTimerMessage('idle', true, true)).toBe('스페이스바 또는 화면을 길게 누른 뒤 떼면 시작됩니다.')
    expect(getStatusLabel('holding')).toBe('홀드')
    expect(getStatusLabel('ready')).toBe('준비')
    expect(getStatusLabel('running')).toBe('진행 중')
    expect(getStatusLabel('stopped')).toBe('정지')
    expect(getStatusLabel('idle')).toBe('대기')
    expect(getPenaltyLabel('PLUS_TWO')).toBe('+2')
    expect(getPenaltyLabel('DNF')).toBe('DNF')
    expect(getPenaltyLabel('NONE')).toBe('기본')
    expect(getDisplayTime({ penalty: 'DNF', timeMs: 8000 })).toBe('DNF')
    expect(getDisplayTime({ penalty: 'NONE', effectiveTimeMs: 8123, timeMs: 8123 })).toBe('08.123')
    expect(getDisplayTime({ penalty: 'NONE', timeMs: 8456 })).toBe('08.456')
    expect(applyPenaltyUpdateToSavedRecord(
      createRecentRecord({ id: 1, effectiveTimeMs: 8000 }),
      1,
      { penalty: 'PLUS_TWO', timeMs: 8000, effectiveTimeMs: 10000 },
    )).toMatchObject({
      id: 1,
      penalty: 'PLUS_TWO',
      effectiveTimeMs: 10000,
    })
    expect(applyPenaltyUpdateToSavedRecord(
      createRecentRecord({ id: 1, effectiveTimeMs: 8000 }),
      2,
      { penalty: 'PLUS_TWO', timeMs: 8000, effectiveTimeMs: 10000 },
    )).toMatchObject({
      id: 1,
      penalty: 'NONE',
      effectiveTimeMs: 8000,
    })
    expect(createSavedRecord({
      id: 'guest-1',
      eventType: 'WCA_333',
      timeMs: 8000,
      penalty: 'PLUS_TWO',
      scramble: "R U R'",
      createdAt: '2026-04-22T20:00:00',
    })).toEqual({
      id: 'guest-1',
      eventType: 'WCA_333',
      timeMs: 8000,
      effectiveTimeMs: 10000,
      penalty: 'PLUS_TWO',
      scramble: "R U R'",
      createdAt: '2026-04-22T20:00:00',
    })
    expect(createSavedRecord({
      id: 'guest-2',
      eventType: 'WCA_333',
      timeMs: 9000,
      penalty: 'DNF',
      scramble: 'F R U',
    })).toMatchObject({
      id: 'guest-2',
      effectiveTimeMs: null,
      penalty: 'DNF',
    })
  })

  it('should_fallback_to_text_only_when_scramble_visual_fails_to_load', async () => {
    render(<TimerPage />)

    const scrambleVisual = await screen.findByRole('img', { name: '현재 스크램블 시각화' })
    fireEvent.error(scrambleVisual)

    expect(await screen.findByText('스크램블 이미지를 불러오지 못해 텍스트만 표시합니다.')).toBeInTheDocument()
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

  it('should_not_delete_recent_record_when_delete_confirmation_is_cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(deleteRecord).not.toHaveBeenCalled()
  })

  it('should_save_guest_record_to_local_storage_when_user_is_not_authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    })
    vi.mocked(saveGuestTimerRecord).mockReturnValue(
      createRecentRecord({
        id: 'guest-1',
        scramble: "R U R' U'",
      }),
    )

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveGuestTimerRecord).toHaveBeenCalledWith({
        key: "WCA_333:8123:R U R' U'",
        eventType: 'WCA_333',
        timeMs: 8123,
        penalty: 'NONE',
        scramble: "R U R' U'",
      })
    })

    expect(saveRecord).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('게스트 기록이 저장되었습니다.')
  })

  it('should_update_guest_record_penalty_and_delete_guest_record_when_user_is_not_authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    })
    vi.mocked(useCubeTimer).mockReturnValue({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      handlePointerDown: vi.fn(),
      handlePointerUp: vi.fn(),
      handlePointerCancel: vi.fn(),
      resetTimer: vi.fn(),
    })
    vi.mocked(getGuestTimerRecords).mockReturnValue([
      createRecentRecord({
        id: 'guest-1',
        scramble: "R U R'",
      }),
    ])

    render(<TimerPage />)

    expect(await screen.findByText('08.000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+2' }))
    await waitFor(() => {
      expect(updateGuestTimerRecordPenalty).toHaveBeenCalledWith('WCA_333', 'guest-1', 'PLUS_TWO')
    })

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      expect(deleteGuestTimerRecord).toHaveBeenCalledWith('WCA_333', 'guest-1')
    })
    expect(toast.success).toHaveBeenCalledWith('게스트 기록이 삭제되었습니다.')
  })

  it('should_render_unsupported_event_messages_when_selected_event_is_not_supported', async () => {
    render(<TimerPage />)

    expect(await screen.findByText("R U R' U'")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_222' } })

    expect(await screen.findByText('이 종목은 아직 구현되지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 종목은 아직 Ao 통계를 지원하지 않습니다.')).toBeInTheDocument()
  })

  it('should_show_scramble_and_recent_stats_errors_when_related_requests_fail', async () => {
    vi.mocked(getScramble).mockRejectedValueOnce(new Error('스크램블 조회 실패'))
    vi.mocked(getMyRecords).mockRejectedValueOnce(new Error('최근 기록 조회 실패'))
    vi.mocked(useCubeTimer).mockReturnValue({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      handlePointerDown: vi.fn(),
      handlePointerUp: vi.fn(),
      handlePointerCancel: vi.fn(),
      resetTimer: vi.fn(),
    })

    render(<TimerPage />)

    expect(await screen.findByText('스크램블 조회 실패')).toBeInTheDocument()
    expect(await screen.findByText('최근 기록 조회 실패')).toBeInTheDocument()
  })

  it('should_show_empty_authenticated_stats_message_when_no_saved_records_exist', async () => {
    vi.mocked(useCubeTimer).mockReturnValue({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      handlePointerDown: vi.fn(),
      handlePointerUp: vi.fn(),
      handlePointerCancel: vi.fn(),
      resetTimer: vi.fn(),
    })
    vi.mocked(getMyRecords).mockResolvedValue({
      data: {
        items: [],
        page: 1,
        size: 100,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    })

    render(<TimerPage />)

    expect(await screen.findByText('아직 Ao를 계산할 저장 기록이 없습니다.')).toBeInTheDocument()
  })

  it('should_prevent_default_when_context_menu_is_opened_on_timer_surface', async () => {
    render(<TimerPage />)

    const timerSurface = await screen.findByText('08.123')
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')

    fireEvent(timerSurface.closest('.timer-touch-surface'), contextMenuEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should_retry_record_save_when_auto_save_fails', async () => {
    vi.mocked(saveRecord)
      .mockRejectedValueOnce(new Error('기록 저장 실패'))
      .mockResolvedValueOnce({
        message: '기록이 저장되었습니다.',
        data: {
          id: 101,
        },
      })

    render(<TimerPage />)

    expect(await screen.findByText('기록 저장 실패')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(2)
    })

    expect(toast.success).toHaveBeenCalledWith('기록이 저장되었습니다.')
  })

  it('should_create_recent_saved_record_with_fallback_id_when_save_response_has_no_id', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(24680)
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: null,
    })

    render(<TimerPage />)

    expect(await screen.findByText('08.123')).toBeInTheDocument()
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('기록이 저장되었습니다.')
      expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    })
  })
})
