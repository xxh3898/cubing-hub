import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteRecord, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'
import TimerPage from './TimerPage.jsx'

vi.mock('../api.js', () => ({
  deleteRecord: vi.fn(),
  getScramble: vi.fn(),
  saveRecord: vi.fn(),
  updateRecordPenalty: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useCubeTimer.js', () => ({
  useCubeTimer: vi.fn(),
}))

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
    expect(screen.getByText('기록 페널티가 수정되었습니다.')).toBeInTheDocument()
  })

  it('should_show_error_message_when_penalty_update_fails', async () => {
    vi.mocked(updateRecordPenalty).mockRejectedValue(new Error('기록 수정 실패'))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: 'DNF' }))

    expect(await screen.findByText('기록 수정 실패')).toBeInTheDocument()
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

    expect(await screen.findByText('기록이 삭제되었습니다.')).toBeInTheDocument()
    expect(screen.getByText('현재 세션에서 저장된 기록이 아직 없습니다.')).toBeInTheDocument()
  })

  it('should_show_error_message_when_delete_fails', async () => {
    vi.mocked(deleteRecord).mockRejectedValue(new Error('기록 삭제 실패'))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    expect(await screen.findByText('기록 삭제 실패')).toBeInTheDocument()
  })
})
