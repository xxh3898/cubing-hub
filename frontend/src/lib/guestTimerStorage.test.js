import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearGuestTimerStorage,
  deleteGuestTimerRecord,
  getGuestTimerRecords,
  saveGuestTimerRecord,
  updateGuestTimerRecordPenalty,
} from './guestTimerStorage.js'

describe('guestTimerStorage', () => {
  beforeEach(() => {
    clearGuestTimerStorage()
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
})
