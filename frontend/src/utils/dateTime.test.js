import { describe, expect, it } from 'vitest'
import {
  formatSeoulDateOnly,
  formatSeoulDateTime,
  formatSeoulDateTimeWithPeriod,
} from './dateTime.js'

describe('dateTime', () => {
  it('should_format_utc_instant_as_seoul_date_time_when_value_has_z_offset', () => {
    expect(formatSeoulDateTime('2026-04-27T06:38:00Z')).toBe('2026년 4월 27일 오후 3시 38분')
    expect(formatSeoulDateTimeWithPeriod('2026-04-27T06:38:00Z')).toBe('2026년 4월 27일 오후 3시 38분')
  })

  it('should_format_legacy_timezone_less_value_as_seoul_local_time_when_value_has_no_offset', () => {
    expect(formatSeoulDateTime('2026-04-27T15:38:00')).toBe('2026년 4월 27일 오후 3시 38분')
    expect(formatSeoulDateOnly('2026-04-27T15:38:00')).toBe('2026년 4월 27일')
  })

  it('should_omit_minutes_when_seoul_minute_is_zero', () => {
    expect(formatSeoulDateTime('2026-04-27T00:00:00Z')).toBe('2026년 4월 27일 오전 9시')
  })

  it('should_return_dash_when_value_is_empty_or_invalid', () => {
    expect(formatSeoulDateTime(null)).toBe('-')
    expect(formatSeoulDateTime('not-a-date')).toBe('-')
  })
})
