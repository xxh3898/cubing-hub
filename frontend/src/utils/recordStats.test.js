import { describe, expect, it } from 'vitest'
import {
  AVERAGE_DNF,
  buildTrendChartData,
  calculateAverageOf,
  filterLatestRecordsByEvent,
  formatAverageResult,
  formatRecordTime,
} from './recordStats.js'

function createRecord({ eventType = 'WCA_333', effectiveTimeMs, timeMs = effectiveTimeMs, penalty = 'NONE', createdAt = '2026-04-22T20:00:00' }) {
  return {
    eventType,
    timeMs,
    effectiveTimeMs,
    penalty,
    createdAt,
  }
}

describe('recordStats', () => {
  it('should_calculate_average_of_five_when_recent_records_are_valid', () => {
    const records = [
      createRecord({ effectiveTimeMs: 10000 }),
      createRecord({ effectiveTimeMs: 11000 }),
      createRecord({ effectiveTimeMs: 12000 }),
      createRecord({ effectiveTimeMs: 13000 }),
      createRecord({ effectiveTimeMs: 14000 }),
    ]

    expect(calculateAverageOf(records, 5)).toBe(12000)
  })

  it('should_calculate_average_when_one_dnf_exists_in_recent_records', () => {
    const records = [
      createRecord({ effectiveTimeMs: 10000 }),
      createRecord({ effectiveTimeMs: 11000 }),
      createRecord({ penalty: 'DNF', effectiveTimeMs: null, timeMs: 12000 }),
      createRecord({ effectiveTimeMs: 13000 }),
      createRecord({ effectiveTimeMs: 14000 }),
    ]

    expect(calculateAverageOf(records, 5)).toBe(12667)
  })

  it('should_return_dnf_when_two_or_more_dnfs_exist_in_recent_records', () => {
    const records = [
      createRecord({ effectiveTimeMs: 10000 }),
      createRecord({ penalty: 'DNF', effectiveTimeMs: null, timeMs: 11000 }),
      createRecord({ penalty: 'DNF', effectiveTimeMs: null, timeMs: 12000 }),
      createRecord({ effectiveTimeMs: 13000 }),
      createRecord({ effectiveTimeMs: 14000 }),
    ]

    expect(calculateAverageOf(records, 5)).toBe(AVERAGE_DNF)
  })

  it('should_return_null_when_recent_record_count_is_insufficient', () => {
    expect(calculateAverageOf([createRecord({ effectiveTimeMs: 10000 })], 5)).toBeNull()
  })

  it('should_filter_latest_records_by_event_and_limit', () => {
    const records = [
      createRecord({ eventType: 'WCA_333', effectiveTimeMs: 10000 }),
      createRecord({ eventType: 'WCA_222', effectiveTimeMs: 2000 }),
      createRecord({ eventType: 'WCA_333', effectiveTimeMs: 11000 }),
    ]

    expect(filterLatestRecordsByEvent(records, 'WCA_333', 1)).toEqual([
      records[0],
    ])
  })

  it('should_build_trend_chart_data_in_oldest_to_newest_order', () => {
    const chartData = buildTrendChartData([
      createRecord({ effectiveTimeMs: 12000, createdAt: '2026-04-22T20:02:00' }),
      createRecord({ effectiveTimeMs: 11000, createdAt: '2026-04-22T20:01:00' }),
    ])

    expect(chartData).toEqual([
      {
        sequence: 1,
        label: '1',
        value: 11000,
        createdAt: '2026-04-22T20:01:00',
        penalty: 'NONE',
        displayTime: '11.000',
      },
      {
        sequence: 2,
        label: '2',
        value: 12000,
        createdAt: '2026-04-22T20:02:00',
        penalty: 'NONE',
        displayTime: '12.000',
      },
    ])
  })

  it('should_format_average_result_and_record_time', () => {
    expect(formatRecordTime(8123, { padSeconds: true })).toBe('08.123')
    expect(formatAverageResult(AVERAGE_DNF)).toBe('DNF')
    expect(formatAverageResult(null)).toBe('-')
  })
})
