import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGuestTimerStorage,
  deleteGuestTimerRecord,
  getGuestTimerRecords,
  saveGuestTimerRecord,
  updateGuestTimerRecordPenalty,
} from './guestTimerStorage.js'

const STORAGE_KEY = 'cubing-hub.guest-timer-records.v1'

describe('guestTimerStorage', () => {
  beforeEach(() => {
    clearGuestTimerStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should_save_guest_timer_record_when_snapshot_is_provided', () => {
    const savedRecord = saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 8123,
      penalty: 'NONE',
      scramble: "R U R' U'",
    })

    const records = getGuestTimerRecords('WCA_333')

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      id: savedRecord.id,
      eventType: 'WCA_333',
      timeMs: 8123,
      effectiveTimeMs: 8123,
      penalty: 'NONE',
      scramble: "R U R' U'",
    })
  })

  it('should_update_effective_time_when_guest_timer_record_penalty_changes', () => {
    const savedRecord = saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 8123,
      penalty: 'NONE',
      scramble: "R U R' U'",
    })

    updateGuestTimerRecordPenalty('WCA_333', savedRecord.id, 'PLUS_TWO')

    expect(getGuestTimerRecords('WCA_333')[0]).toMatchObject({
      id: savedRecord.id,
      penalty: 'PLUS_TWO',
      effectiveTimeMs: 10123,
    })
  })

  it('should_delete_guest_timer_record_when_record_id_matches', () => {
    const firstRecord = saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 8123,
      penalty: 'NONE',
      scramble: "R U R' U'",
    })
    saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 9234,
      penalty: 'NONE',
      scramble: 'F R U',
    })

    deleteGuestTimerRecord('WCA_333', firstRecord.id)

    const records = getGuestTimerRecords('WCA_333')
    expect(records).toHaveLength(1)
    expect(records[0].timeMs).toBe(9234)
  })

  it('should_return_empty_array_when_event_type_is_missing', () => {
    expect(getGuestTimerRecords()).toEqual([])
  })

  it('should_return_empty_array_when_storage_value_is_invalid_json', () => {
    window.localStorage.setItem(STORAGE_KEY, '{invalid-json')

    expect(getGuestTimerRecords('WCA_333')).toEqual([])
  })

  it('should_return_empty_array_when_storage_value_is_not_an_object', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['invalid']))

    expect(getGuestTimerRecords('WCA_333')).toEqual([])
  })

  it('should_save_dnf_record_with_null_effective_time_when_penalty_is_dnf', () => {
    const savedRecord = saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 15000,
      penalty: 'DNF',
      scramble: "R U R' U'",
    })

    expect(savedRecord.effectiveTimeMs).toBeNull()
    expect(getGuestTimerRecords('WCA_333')[0].effectiveTimeMs).toBeNull()
  })

  it('should_default_penalty_to_none_and_keep_records_when_unknown_record_is_updated', () => {
    const savedRecord = saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 8123,
      scramble: 'F R U',
    })

    const records = updateGuestTimerRecordPenalty('WCA_333', 'missing-record-id', 'PLUS_TWO')

    expect(savedRecord.penalty).toBe('NONE')
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      id: savedRecord.id,
      penalty: 'NONE',
      effectiveTimeMs: 8123,
    })
  })

  it('should_ignore_storage_remove_errors_when_guest_storage_clear_fails', () => {
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed')
    })

    expect(() => clearGuestTimerStorage()).not.toThrow()
  })

  it('should_throw_when_local_storage_is_unavailable_during_record_save', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    })

    expect(() => saveGuestTimerRecord({
      eventType: 'WCA_333',
      timeMs: 8123,
      scramble: "R U R' U'",
    })).toThrow('게스트 기록을 저장할 수 없습니다.')

    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor)
    }
  })
})
