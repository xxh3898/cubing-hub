import { describe, expect, it } from 'vitest'
import {
  AVERAGE_DNF,
  buildTrendChartData,
  calculateAverageOf,
  filterLatestRecordsByEvent,
  formatAverageResult,
  formatRecordTime,
  getEffectiveRecordTime,
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

  it('should_return_time_ms_when_effective_time_is_missing_and_record_is_valid', () => {
    expect(getEffectiveRecordTime({
      penalty: 'NONE',
      timeMs: 9543,
    })).toBe(9543)
  })

  it('should_return_null_when_record_is_missing_or_invalid', () => {
    expect(getEffectiveRecordTime()).toBeNull()
    expect(getEffectiveRecordTime({
      penalty: 'DNF',
      timeMs: 9543,
    })).toBeNull()
    expect(getEffectiveRecordTime({
      penalty: 'NONE',
      timeMs: '9543',
    })).toBeNull()
  })

  it('should_format_minute_based_record_time_and_numeric_average_result', () => {
    expect(formatRecordTime(65432)).toBe('1:05.432')
    expect(formatAverageResult(8123)).toBe('8.123')
  })

  it('should_return_empty_results_when_latest_record_filter_input_is_invalid', () => {
    expect(filterLatestRecordsByEvent(null, 'WCA_333', 5)).toEqual([])
    expect(filterLatestRecordsByEvent([], '', 5)).toEqual([])
    expect(filterLatestRecordsByEvent([], 'WCA_333', 0)).toEqual([])
  })

  it('should_return_dash_when_record_time_input_is_not_numeric', () => {
    expect(formatRecordTime(undefined)).toBe('-')
    expect(formatRecordTime(Number.NaN)).toBe('-')
  })

  it('should_build_empty_or_dnf_trend_chart_data_when_record_list_requires_it', () => {
    expect(buildTrendChartData(null)).toEqual([])
    expect(buildTrendChartData([])).toEqual([])

    expect(buildTrendChartData([
      createRecord({ penalty: 'DNF', effectiveTimeMs: null, timeMs: 12345 }),
    ])).toEqual([
      {
        sequence: 1,
        label: '1',
        value: null,
        createdAt: '2026-04-22T20:00:00',
        penalty: 'DNF',
        displayTime: 'DNF',
      },
    ])
  })
})
