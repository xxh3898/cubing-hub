import { describe, expect, it } from 'vitest'
import { formatTimeMs } from './formatTime.js'

describe('formatTime', () => {
  it('should_format_sub_minute_time_when_duration_is_under_one_minute', () => {
    expect(formatTimeMs(8123)).toBe('8.123초')
  })

  it('should_format_minute_time_when_duration_is_one_minute_or_more', () => {
    expect(formatTimeMs(61001)).toBe('1분 01.001초')
  })

  it('should_floor_negative_or_missing_time_to_zero', () => {
    expect(formatTimeMs(-10)).toBe('0.000초')
    expect(formatTimeMs()).toBe('0.000초')
  })
})
