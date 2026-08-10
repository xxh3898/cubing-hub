import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPendingTimerSolve,
  getPendingTimerSolveKey,
  isUuidV4,
  loadPendingTimerSolve,
  PENDING_TIMER_SOLVE_SCHEMA_VERSION,
  savePendingTimerSolve,
} from './pendingTimerSolveStorage.js'

const USER_ID = 41
const SNAPSHOT = {
  schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
  userId: USER_ID,
  eventType: 'WCA_333',
  timeMs: 1235,
  penalty: 'NONE',
  scramble: "R U R' U'",
  inputMethod: 'KEYBOARD',
  clientSubmissionId: 'd9428888-122b-4d3e-a58e-790c4e5f97ad',
  savedAt: '2026-08-10T13:00:00.000Z',
}

describe('pendingTimerSolveStorage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should_store_and_load_a_valid_owner_scoped_snapshot', () => {
    savePendingTimerSolve(SNAPSHOT)

    expect(getPendingTimerSolveKey(USER_ID)).toBe('cubing-hub.timer.pending.v1:41')
    expect(loadPendingTimerSolve(USER_ID)).toEqual({
      snapshot: SNAPSHOT,
      recoveryMessage: null,
      canDiscard: false,
    })
  })

  it('should_not_expose_another_users_pending_snapshot', () => {
    savePendingTimerSolve(SNAPSHOT)

    expect(loadPendingTimerSolve(42)).toEqual({
      snapshot: null,
      recoveryMessage: null,
      canDiscard: false,
    })
    expect(loadPendingTimerSolve(USER_ID).snapshot).toEqual(SNAPSHOT)
  })

  it('should_accept_only_uuid_v4_submission_identifiers', () => {
    expect(isUuidV4('d9428888-122b-4d3e-a58e-790c4e5f97ad')).toBe(true)
    expect(isUuidV4('d9428888-122b-1d3e-a58e-790c4e5f97ad')).toBe(false)
    expect(isUuidV4('019feafe-7b47-7363-bfcf-c2fd96b1eb1a')).toBe(false)
  })

  it('should_never_submit_invalid_json_and_allow_the_owner_to_discard_it', () => {
    const key = getPendingTimerSolveKey(USER_ID)
    window.sessionStorage.setItem(key, '{not-valid-json')

    expect(loadPendingTimerSolve(USER_ID)).toEqual({
      snapshot: null,
      recoveryMessage: '저장 대기 기록을 복구할 수 없습니다. 기록을 버린 뒤 새로 측정해주세요.',
      canDiscard: true,
    })
    expect(window.sessionStorage.getItem(key)).toBe('{not-valid-json')
  })

  it.each([
    [{ ...SNAPSHOT, schemaVersion: 2 }],
    [{ ...SNAPSHOT, userId: 42 }],
    [{ ...SNAPSHOT, eventType: 'WCA_222' }],
    [{ ...SNAPSHOT, timeMs: 0 }],
    [{ ...SNAPSHOT, inputMethod: 'STACKMAT' }],
    [{ ...SNAPSHOT, clientSubmissionId: 'not-a-uuid' }],
  ])('should_keep_an_unsupported_or_corrupt_snapshot_for_explicit_discard', (invalidSnapshot) => {
    const key = getPendingTimerSolveKey(USER_ID)
    window.sessionStorage.setItem(key, JSON.stringify(invalidSnapshot))

    expect(loadPendingTimerSolve(USER_ID)).toMatchObject({
      snapshot: null,
      canDiscard: true,
    })
    expect(window.sessionStorage.getItem(key)).toBe(JSON.stringify(invalidSnapshot))
  })

  it('should_clear_only_the_selected_owner_pending_snapshot', () => {
    savePendingTimerSolve(SNAPSHOT)
    savePendingTimerSolve({ ...SNAPSHOT, userId: 42 })

    clearPendingTimerSolve(USER_ID)

    expect(loadPendingTimerSolve(USER_ID).snapshot).toBeNull()
    expect(loadPendingTimerSolve(42).snapshot).toEqual({ ...SNAPSHOT, userId: 42 })
  })
})
