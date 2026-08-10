import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { deleteRecord, getMyRecords, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'
import {
  clearPendingTimerSolve,
  loadPendingTimerSolve,
  PENDING_TIMER_SOLVE_SCHEMA_VERSION,
  savePendingTimerSolve,
} from '../lib/pendingTimerSolveStorage.js'
import {
  deleteGuestTimerRecord,
  getGuestTimerRecords,
  saveGuestTimerRecord,
  updateGuestTimerRecordPenalty,
} from '../lib/guestTimerStorage.js'
import TimerPage, {
  applyPenaltyUpdateToSavedRecord,
  getDisplayTime,
  getPenaltyLabel,
  getStatusLabel,
  getTimerMessage,
  isCanonicalRecord,
  toRecordCreatePayload,
  upsertRecentSavedRecord,
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

const USER_ID = 1
const CLIENT_SUBMISSION_ID = 'd9428888-122b-4d3e-a58e-790c4e5f97ad'

function createCanonicalRecord(overrides = {}) {
  return {
    id: 101,
    eventType: 'WCA_333',
    timeMs: 1235,
    penalty: 'NONE',
    effectiveTimeMs: 1235,
    scramble: "R U R' U'",
    inputMethod: 'KEYBOARD',
    createdAt: '2026-08-10T13:00:00.000Z',
    ...overrides,
  }
}

function createRecentRecord(overrides = {}) {
  return {
    id: 1,
    eventType: 'WCA_333',
    timeMs: 8000,
    effectiveTimeMs: 8000,
    penalty: 'NONE',
    scramble: "R U R' U'",
    inputMethod: 'KEYBOARD',
    createdAt: '2026-04-22T20:00:00.000Z',
    ...overrides,
  }
}

function createRecordsResponse(items = createRecentStatsRecords()) {
  return {
    data: {
      items,
      page: 1,
      size: 12,
      totalElements: items.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  }
}

function createRecentStatsRecords() {
  return Array.from({ length: 12 }, (_, index) => createRecentRecord({
    id: index + 1,
    timeMs: 8000 + (index * 1000),
    effectiveTimeMs: 8000 + (index * 1000),
    createdAt: `2026-04-22T20:${String(59 - index).padStart(2, '0')}:00.000Z`,
  }))
}

function createStoppedTimer(overrides = {}) {
  return {
    status: 'stopped',
    finalTime: 1235,
    formattedTime: '01.235',
    inputMethod: 'KEYBOARD',
    handlePointerDown: vi.fn(),
    handlePointerUp: vi.fn(),
    handlePointerCancel: vi.fn(),
    resetTimer: vi.fn(),
    restoreStoppedSolve: vi.fn(),
    ...overrides,
  }
}

function createIdleTimer(overrides = {}) {
  return createStoppedTimer({
    status: 'idle',
    finalTime: null,
    formattedTime: '00.000',
    inputMethod: null,
    ...overrides,
  })
}

function createPendingSnapshot(overrides = {}) {
  return {
    schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
    userId: USER_ID,
    eventType: 'WCA_333',
    timeMs: 1235,
    penalty: 'NONE',
    scramble: "R U R' U'",
    inputMethod: 'KEYBOARD',
    clientSubmissionId: CLIENT_SUBMISSION_ID,
    savedAt: '2026-08-10T13:00:00.000Z',
    ...overrides,
  }
}

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

function createCurrentPendingSnapshotExpectation() {
  return {
    ...createPendingSnapshot(),
    savedAt: expect.any(String),
  }
}

describe('TimerPage', () => {
  let timerState

  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => CLIENT_SUBMISSION_ID),
    })

    timerState = createStoppedTimer()
    vi.mocked(useCubeTimer).mockImplementation(() => timerState)
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      currentUser: { userId: USER_ID },
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
      data: createCanonicalRecord(),
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse())
  })

  afterEach(() => {
    clearPendingTimerSolve(USER_ID)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should_keep_helper_formatting_and_use_server_effective_time', () => {
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
    expect(getDisplayTime(createCanonicalRecord({ penalty: 'DNF', effectiveTimeMs: null }))).toBe('DNF')
    expect(getDisplayTime(createCanonicalRecord({ penalty: 'PLUS_TWO', effectiveTimeMs: 3235 }))).toBe('03.235')
  })

  it('should_render_the_supported_scramble_visual_with_its_expected_parameters', async () => {
    timerState = createIdleTimer()

    render(<TimerPage />)

    const scrambleVisual = await screen.findByRole('img', { name: '현재 스크램블 시각화' })

    expect(scrambleVisual).toHaveAttribute('src', expect.stringContaining('alg=R+U+R%27+U%27'))
    expect(scrambleVisual).toHaveAttribute('src', expect.stringContaining('sch=wrgyob'))
  })

  it('should_submit_the_canonical_stopped_snapshot_with_keyboard_provenance_and_filtered_history_query', async () => {
    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledWith({
        eventType: 'WCA_333',
        timeMs: 1235,
        penalty: 'NONE',
        scramble: "R U R' U'",
        inputMethod: 'KEYBOARD',
        clientSubmissionId: CLIENT_SUBMISSION_ID,
      })
    })

    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(getMyRecords).toHaveBeenCalledWith({
      eventType: 'WCA_333',
      page: 1,
      size: 12,
    })
    expect(screen.getByRole('heading', { level: 2, name: '01.235' })).toBeInTheDocument()
    expect(await screen.findByText('01.235', { selector: '.timer-recent-time' })).toBeInTheDocument()

    await waitFor(() => {
      expect(timerState.resetTimer).toHaveBeenCalled()
      expect(getScramble).toHaveBeenCalledTimes(2)
    })
  })

  it('should_keep_timer_input_locked_until_the_next_scramble_is_committed_after_an_authenticated_save', async () => {
    const delayedStatistics = createDeferred()
    const delayedNextScramble = createDeferred()

    vi.mocked(getMyRecords)
      .mockResolvedValueOnce(createRecordsResponse())
      .mockImplementationOnce(() => delayedStatistics.promise)
    vi.mocked(getScramble)
      .mockResolvedValueOnce({
        data: {
          eventType: 'WCA_333',
          scramble: 'CURRENT SCRAMBLE',
        },
      })
      .mockImplementationOnce(() => delayedNextScramble.promise)
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord({ scramble: 'CURRENT SCRAMBLE' }),
    })

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(1)
      expect(getScramble).toHaveBeenCalledTimes(2)
      expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: false })
    })

    await act(async () => {
      delayedStatistics.resolve(createRecordsResponse())
      await delayedStatistics.promise
    })

    expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: false })
    expect(screen.queryByText('CURRENT SCRAMBLE')).not.toBeInTheDocument()

    await act(async () => {
      delayedNextScramble.resolve({
        data: {
          eventType: 'WCA_333',
          scramble: 'NEXT SCRAMBLE',
        },
      })
      await delayedNextScramble.promise
    })

    expect(await screen.findByText('NEXT SCRAMBLE')).toBeInTheDocument()
    expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: true })
  })

  it('should_keep_timer_input_locked_when_the_next_scramble_fails_after_save', async () => {
    vi.mocked(getScramble)
      .mockResolvedValueOnce({
        data: {
          eventType: 'WCA_333',
          scramble: 'CURRENT SCRAMBLE',
        },
      })
      .mockRejectedValueOnce(new Error('다음 스크램블 조회 실패'))
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord({ scramble: 'CURRENT SCRAMBLE' }),
    })

    render(<TimerPage />)

    expect(await screen.findByText('다음 스크램블 조회 실패')).toBeInTheDocument()
    expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: false })
    expect(screen.queryByText('CURRENT SCRAMBLE')).not.toBeInTheDocument()
  })

  it('should_use_the_server_canonical_record_and_deduplicate_a_replayed_record_by_id', () => {
    const existing = createCanonicalRecord({ id: 101, createdAt: '2026-08-10T12:00:00.000Z' })
    const replayed = createCanonicalRecord({ id: 101, createdAt: '2026-08-10T13:00:00.000Z' })

    expect(upsertRecentSavedRecord([existing], replayed)).toEqual([replayed])
    expect(upsertRecentSavedRecord([
      createCanonicalRecord({ id: 100, createdAt: '2026-08-10T13:00:00.000Z' }),
      existing,
    ], replayed).map((record) => record.id)).toEqual([101, 100])
    expect(toRecordCreatePayload(createPendingSnapshot())).toEqual({
      eventType: 'WCA_333',
      timeMs: 1235,
      penalty: 'NONE',
      scramble: "R U R' U'",
      inputMethod: 'KEYBOARD',
      clientSubmissionId: CLIENT_SUBMISSION_ID,
    })
  })

  it('should_accept_current_mutable_penalty_state_but_reject_inconsistent_canonical_records', () => {
    const snapshot = createPendingSnapshot()

    expect(isCanonicalRecord(createCanonicalRecord(), snapshot)).toBe(true)
    expect(isCanonicalRecord(createCanonicalRecord({
      penalty: 'PLUS_TWO',
      effectiveTimeMs: 3235,
    }), snapshot)).toBe(true)
    expect(isCanonicalRecord(createCanonicalRecord({
      penalty: 'DNF',
      effectiveTimeMs: null,
    }), snapshot)).toBe(true)

    expect(isCanonicalRecord(createCanonicalRecord({ id: null }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ timeMs: 1236 }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ scramble: 'R U2' }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ eventType: 'WCA_222' }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ inputMethod: 'TOUCH' }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ penalty: 'NONE', effectiveTimeMs: 1236 }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ penalty: 'PLUS_TWO', effectiveTimeMs: 1235 }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ penalty: 'DNF', effectiveTimeMs: 3235 }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ penalty: 'UNKNOWN' }), snapshot)).toBe(false)
    expect(isCanonicalRecord(createCanonicalRecord({ createdAt: 'not-a-date' }), snapshot)).toBe(false)
  })

  it('should_keep_the_same_pending_payload_and_uuid_when_the_first_save_fails', async () => {
    vi.mocked(saveRecord)
      .mockRejectedValueOnce(new Error('기록 저장 실패'))
      .mockResolvedValueOnce({
        message: '기록이 저장되었습니다.',
        data: createCanonicalRecord(),
      })

    render(<TimerPage />)

    expect(await screen.findByText('기록 저장 실패')).toBeInTheDocument()
    const firstPayload = saveRecord.mock.calls[0][0]
    expect(loadPendingTimerSolve(USER_ID).snapshot).toMatchObject(createCurrentPendingSnapshotExpectation())

    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(2)
    })

    expect(saveRecord.mock.calls[1][0]).toEqual(firstPayload)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
  })

  it('should_recover_a_response_lost_pending_solve_without_auto_post_and_replay_without_duplicate_ui_record', async () => {
    vi.mocked(saveRecord).mockRejectedValueOnce(new Error('응답을 받지 못했습니다.'))
    const firstRender = render(<TimerPage />)

    expect(await screen.findByText('응답을 받지 못했습니다.')).toBeInTheDocument()
    const originalPayload = saveRecord.mock.calls[0][0]
    firstRender.unmount()

    const restoreStoppedSolve = vi.fn()
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
      restoreStoppedSolve,
    })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([createCanonicalRecord()]))
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord(),
    })

    render(<TimerPage />)

    expect(await screen.findByText('저장하지 못한 기록을 복구했습니다. 저장 재시도 또는 버리기를 선택해주세요.')).toBeInTheDocument()
    expect(saveRecord).toHaveBeenCalledTimes(1)
    expect(restoreStoppedSolve).toHaveBeenCalledWith(expect.objectContaining({
      timeMs: 1235,
      clientSubmissionId: CLIENT_SUBMISSION_ID,
    }))

    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(2)
    })

    expect(saveRecord.mock.calls[1][0]).toEqual(originalPayload)
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1)
  })

  it('should_keep_the_recovered_pending_scramble_visible_when_an_earlier_fresh_request_resolves', async () => {
    const pendingSnapshot = createPendingSnapshot({ scramble: 'PENDING SCRAMBLE' })
    const initialScrambleRequest = createDeferred()

    savePendingTimerSolve(pendingSnapshot)
    timerState = createIdleTimer({ restoreStoppedSolve: vi.fn() })
    vi.mocked(getScramble)
      .mockReset()
      .mockImplementationOnce(() => initialScrambleRequest.promise)
      .mockResolvedValueOnce({
        data: {
          eventType: 'WCA_333',
          scramble: 'NEXT SCRAMBLE',
        },
      })
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord({ scramble: 'PENDING SCRAMBLE' }),
    })

    render(<TimerPage />)

    expect(await screen.findByRole('button', { name: '저장 재시도' })).toBeInTheDocument()
    expect(screen.getByText('PENDING SCRAMBLE')).toBeInTheDocument()
    expect(saveRecord).not.toHaveBeenCalled()

    await act(async () => {
      initialScrambleRequest.resolve({
        data: {
          eventType: 'WCA_333',
          scramble: 'FRESH SCRAMBLE',
        },
      })
      await initialScrambleRequest.promise
    })

    expect(screen.getByText('PENDING SCRAMBLE')).toBeInTheDocument()
    expect(screen.queryByText('FRESH SCRAMBLE')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledWith(expect.objectContaining({
        clientSubmissionId: CLIENT_SUBMISSION_ID,
        scramble: 'PENDING SCRAMBLE',
      }))
    })
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
    expect(await screen.findByText('NEXT SCRAMBLE')).toBeInTheDocument()
  })

  it('should_replace_a_recovered_scramble_with_a_fresh_scramble_after_the_account_changes', async () => {
    const initialScrambleRequest = createDeferred()

    savePendingTimerSolve(createPendingSnapshot({ scramble: 'ACCOUNT A PENDING SCRAMBLE' }))
    timerState = createIdleTimer({ restoreStoppedSolve: vi.fn() })
    vi.mocked(getScramble)
      .mockReset()
      .mockImplementationOnce(() => initialScrambleRequest.promise)
      .mockResolvedValueOnce({
        data: {
          eventType: 'WCA_333',
          scramble: 'ACCOUNT B FRESH SCRAMBLE',
        },
      })

    const page = render(<TimerPage />)

    expect(await screen.findByText('ACCOUNT A PENDING SCRAMBLE')).toBeInTheDocument()
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      currentUser: { userId: 2 },
    })
    page.rerender(<TimerPage />)

    expect(await screen.findByText('ACCOUNT B FRESH SCRAMBLE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장 재시도' })).not.toBeInTheDocument()
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
  })

  it('should_accept_a_plus_two_server_state_after_a_response_lost_replay_and_clear_the_pending_snapshot', async () => {
    vi.mocked(saveRecord).mockRejectedValueOnce(new Error('응답을 받지 못했습니다.'))
    const firstRender = render(<TimerPage />)

    expect(await screen.findByText('응답을 받지 못했습니다.')).toBeInTheDocument()
    const originalPayload = saveRecord.mock.calls[0][0]
    firstRender.unmount()

    const restoreStoppedSolve = vi.fn()
    timerState = createIdleTimer({ restoreStoppedSolve })
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([
      createCanonicalRecord({ penalty: 'PLUS_TWO', effectiveTimeMs: 3235 }),
    ]))
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord({ penalty: 'PLUS_TWO', effectiveTimeMs: 3235 }),
    })

    render(<TimerPage />)

    expect(await screen.findByRole('button', { name: '저장 재시도' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(2)
    })

    expect(saveRecord.mock.calls[1][0]).toEqual(originalPayload)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
    expect(await screen.findByText('03.235', { selector: '.timer-recent-time' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장 재시도' })).not.toBeInTheDocument()
    })
  })

  it('should_keep_the_pending_snapshot_and_offer_discard_when_server_returns_conflict', async () => {
    vi.mocked(saveRecord).mockRejectedValue(Object.assign(
      new Error('clientSubmissionId가 다른 기록 요청에 이미 사용되었습니다.'),
      { status: 409 },
    ))

    render(<TimerPage />)

    expect(await screen.findByText('clientSubmissionId가 다른 기록 요청에 이미 사용되었습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장 재시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기록 버리기' })).toBeInTheDocument()
    expect(screen.getByLabelText('종목')).toBeDisabled()
    expect(loadPendingTimerSolve(USER_ID).snapshot).toMatchObject(createCurrentPendingSnapshotExpectation())
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('should_allow_the_user_to_discard_a_recovered_pending_solve_without_auto_submit', async () => {
    savePendingTimerSolve(createPendingSnapshot())
    const restoreStoppedSolve = vi.fn()
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
      restoreStoppedSolve,
    })

    render(<TimerPage />)

    expect(await screen.findByRole('button', { name: '기록 버리기' })).toBeInTheDocument()
    expect(saveRecord).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '기록 버리기' }))

    await waitFor(() => {
      expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
    })
    expect(saveRecord).not.toHaveBeenCalled()
  })

  it('should_disable_timer_input_until_a_corrupt_pending_snapshot_is_discarded', async () => {
    window.sessionStorage.setItem('cubing-hub.timer.pending.v1:1', '{invalid-json')
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
    })

    render(<TimerPage />)

    expect(await screen.findByText('저장 대기 기록을 복구할 수 없습니다. 기록을 버린 뒤 새로 측정해주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기록 버리기' })).toBeInTheDocument()
    expect(screen.getByLabelText('종목')).toBeDisabled()
    expect(saveRecord).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: false })
    })

    fireEvent.click(screen.getByRole('button', { name: '기록 버리기' }))

    await waitFor(() => {
      expect(window.sessionStorage.getItem('cubing-hub.timer.pending.v1:1')).toBeNull()
    })
    expect(screen.getByLabelText('종목')).not.toBeDisabled()
    expect(saveRecord).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: true })
    })
  })

  it('should_not_read_or_retry_another_accounts_pending_solve', async () => {
    savePendingTimerSolve(createPendingSnapshot())
    const restoreStoppedSolve = vi.fn()
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
      restoreStoppedSolve,
    })
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      currentUser: { userId: 2 },
    })

    render(<TimerPage />)

    await screen.findByText("R U R' U'")
    expect(restoreStoppedSolve).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '저장 재시도' })).not.toBeInTheDocument()
    expect(loadPendingTimerSolve(USER_ID).snapshot).toMatchObject(createCurrentPendingSnapshotExpectation())
  })

  it('should_preserve_a_pending_snapshot_across_passive_auth_loss_and_recover_it_only_for_the_same_account', async () => {
    vi.mocked(saveRecord).mockRejectedValueOnce(new Error('응답을 받지 못했습니다.'))
    const page = render(<TimerPage />)

    expect(await screen.findByText('응답을 받지 못했습니다.')).toBeInTheDocument()
    const originalPayload = saveRecord.mock.calls[0][0]

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    })
    page.rerender(<TimerPage />)

    await waitFor(() => {
      expect(loadPendingTimerSolve(USER_ID).snapshot).toMatchObject(createCurrentPendingSnapshotExpectation())
    })
    page.unmount()

    timerState = createIdleTimer({ restoreStoppedSolve: vi.fn() })
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      currentUser: { userId: 2 },
    })
    const otherAccountPage = render(<TimerPage />)

    await screen.findByText("R U R' U'")
    expect(screen.queryByRole('button', { name: '저장 재시도' })).not.toBeInTheDocument()
    expect(loadPendingTimerSolve(USER_ID).snapshot).toMatchObject(createCurrentPendingSnapshotExpectation())
    otherAccountPage.unmount()

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      currentUser: { userId: USER_ID },
    })
    vi.mocked(saveRecord).mockResolvedValue({
      message: '기록이 저장되었습니다.',
      data: createCanonicalRecord(),
    })

    render(<TimerPage />)

    expect(await screen.findByRole('button', { name: '저장 재시도' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '저장 재시도' }))

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalledTimes(2)
    })
    expect(saveRecord.mock.calls[1][0]).toEqual(originalPayload)
    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
  })

  it('should_save_guest_record_with_the_same_canonical_time_and_touch_provenance', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    })
    timerState = createStoppedTimer({ inputMethod: 'TOUCH' })
    vi.mocked(saveGuestTimerRecord).mockReturnValue(createRecentRecord({
      id: 'guest-1',
      timeMs: 1235,
      effectiveTimeMs: 1235,
      inputMethod: 'TOUCH',
    }))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveGuestTimerRecord).toHaveBeenCalledWith({
        eventType: 'WCA_333',
        timeMs: 1235,
        penalty: 'NONE',
        scramble: "R U R' U'",
        inputMethod: 'TOUCH',
      })
    })
    expect(saveRecord).not.toHaveBeenCalled()
    expect(useCubeTimer).toHaveBeenLastCalledWith({ enabled: true })
  })

  it('should_keep_penalty_and_delete_actions_working_with_server_canonical_records', async () => {
    vi.mocked(updateRecordPenalty).mockResolvedValue({
      message: '기록 페널티가 수정되었습니다.',
      data: createCanonicalRecord({
        penalty: 'PLUS_TWO',
        effectiveTimeMs: 3235,
      }),
    })
    vi.mocked(deleteRecord).mockResolvedValue({
      message: '기록이 삭제되었습니다.',
      data: null,
    })

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByRole('button', { name: '+2' }))

    await waitFor(() => {
      expect(updateRecordPenalty).toHaveBeenCalledWith(101, { penalty: 'PLUS_TWO' })
    })
    expect(await screen.findByText('03.235')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith(101)
    })
    expect(screen.getByText('현재 세션에서 저장된 기록이 아직 없습니다.')).toBeInTheDocument()
  })

  it('should_keep_the_recent_record_when_penalty_or_delete_requests_fail', async () => {
    vi.mocked(updateRecordPenalty).mockRejectedValue(new Error('기록 수정 실패'))
    vi.mocked(deleteRecord).mockRejectedValue(new Error('기록 삭제 실패'))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'DNF' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('기록 수정 실패')
    })

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('기록 삭제 실패')
    })
    expect(screen.getAllByText('01.235')).not.toHaveLength(0)
  })

  it('should_not_delete_a_recent_record_when_the_confirmation_is_cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))

    render(<TimerPage />)

    await waitFor(() => {
      expect(saveRecord).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(deleteRecord).not.toHaveBeenCalled()
  })

  it('should_keep_guest_penalty_and_delete_actions_on_the_existing_local_storage_path', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    })
    timerState = createIdleTimer()
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

  it('should_render_ao5_and_ao12_from_the_server_filtered_recent_records', async () => {
    render(<TimerPage />)

    expect(await screen.findByText('10.000')).toBeInTheDocument()
    expect(screen.getByText('13.500')).toBeInTheDocument()
    expect(getMyRecords).toHaveBeenCalledWith({ eventType: 'WCA_333', page: 1, size: 12 })
  })

  it('should_fallback_to_text_only_when_scramble_visual_fails_without_a_reset_race', async () => {
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
    })

    render(<TimerPage />)

    const scrambleVisual = await screen.findByRole('img', { name: '현재 스크램블 시각화' })
    fireEvent.error(scrambleVisual)

    expect(screen.getByText('스크램블 이미지를 불러오지 못해 텍스트만 표시합니다.')).toBeInTheDocument()
  })

  it('should_render_unsupported_event_message_without_requesting_an_unsupported_scramble', async () => {
    timerState = createStoppedTimer({
      status: 'idle',
      finalTime: null,
      formattedTime: '00.000',
      inputMethod: null,
    })

    render(<TimerPage />)
    await screen.findByText("R U R' U'")

    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_222' } })

    expect(await screen.findByText('이 종목은 아직 구현되지 않았습니다.', { selector: '.timer-helper' })).toBeInTheDocument()
    expect(screen.getByText('이 종목은 아직 구현되지 않았습니다.', { selector: '.message.info' })).toBeInTheDocument()
    expect(screen.getByText('이 종목은 아직 Ao 통계를 지원하지 않습니다.')).toBeInTheDocument()
  })

  it('should_ignore_stale_statistics_after_the_selected_event_becomes_unsupported', async () => {
    const staleStatistics = createDeferred()
    timerState = createIdleTimer()
    vi.mocked(getMyRecords).mockImplementationOnce(() => staleStatistics.promise)

    render(<TimerPage />)

    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_222' } })
    expect(await screen.findByText('이 종목은 아직 Ao 통계를 지원하지 않습니다.')).toBeInTheDocument()

    await act(async () => {
      staleStatistics.resolve(createRecordsResponse(Array.from({ length: 5 }, (_, index) => createRecentRecord({
        id: index + 1,
        timeMs: 12345,
        effectiveTimeMs: 12345,
      }))))
      await staleStatistics.promise
    })

    expect(screen.queryByText('12.345')).not.toBeInTheDocument()
    expect(screen.getByText('이 종목은 아직 Ao 통계를 지원하지 않습니다.')).toBeInTheDocument()
  })

  it('should_apply_only_the_latest_statistics_request_when_the_event_context_changes_twice', async () => {
    const firstStatistics = createDeferred()
    const latestStatistics = createDeferred()
    timerState = createIdleTimer()
    vi.mocked(getMyRecords)
      .mockImplementationOnce(() => firstStatistics.promise)
      .mockImplementationOnce(() => latestStatistics.promise)

    render(<TimerPage />)

    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_222' } })
    await screen.findByText('이 종목은 아직 Ao 통계를 지원하지 않습니다.')
    fireEvent.change(screen.getByLabelText('종목'), { target: { value: 'WCA_333' } })

    await act(async () => {
      latestStatistics.resolve(createRecordsResponse(Array.from({ length: 5 }, (_, index) => createRecentRecord({
        id: index + 21,
        timeMs: 15000,
        effectiveTimeMs: 15000,
      }))))
      await latestStatistics.promise
    })

    expect(await screen.findByText('15.000')).toBeInTheDocument()

    await act(async () => {
      firstStatistics.resolve(createRecordsResponse(Array.from({ length: 5 }, (_, index) => createRecentRecord({
        id: index + 1,
        timeMs: 9000,
        effectiveTimeMs: 9000,
      }))))
      await firstStatistics.promise
    })

    expect(screen.getByText('15.000')).toBeInTheDocument()
    expect(screen.queryByText('09.000')).not.toBeInTheDocument()
  })

  it('should_render_scramble_and_recent_history_errors_without_starting_the_timer', async () => {
    timerState = createIdleTimer()
    vi.mocked(getScramble).mockRejectedValueOnce(new Error('스크램블 조회 실패'))
    vi.mocked(getMyRecords).mockRejectedValueOnce(new Error('최근 기록 조회 실패'))

    render(<TimerPage />)

    expect(await screen.findByText('스크램블 조회 실패')).toBeInTheDocument()
    expect(await screen.findByText('최근 기록 조회 실패')).toBeInTheDocument()
    expect(saveRecord).not.toHaveBeenCalled()
  })

  it('should_render_the_authenticated_empty_average_message_when_the_filtered_history_is_empty', async () => {
    timerState = createIdleTimer()
    vi.mocked(getMyRecords).mockResolvedValue(createRecordsResponse([]))

    render(<TimerPage />)

    expect(await screen.findByText('아직 Ao를 계산할 저장 기록이 없습니다.')).toBeInTheDocument()
  })

  it('should_prevent_the_context_menu_on_the_timer_surface', async () => {
    timerState = createIdleTimer()

    render(<TimerPage />)

    const timerValue = await screen.findByText('00.000')
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')

    fireEvent(timerValue.closest('.timer-touch-surface'), contextMenuEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should_apply_a_penalty_update_only_to_the_matching_recent_record', () => {
    expect(applyPenaltyUpdateToSavedRecord(
      createRecentRecord({ id: 1 }),
      1,
      { penalty: 'PLUS_TWO', timeMs: 8000, effectiveTimeMs: 10000 },
    )).toMatchObject({ penalty: 'PLUS_TWO', effectiveTimeMs: 10000 })
  })
})
