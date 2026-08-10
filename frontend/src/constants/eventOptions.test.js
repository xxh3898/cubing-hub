import { describe, expect, it } from 'vitest'
import { eventOptions, isPracticeEventSupported, SUPPORTED_PRACTICE_EVENT_TYPES } from './eventOptions.js'

describe('eventOptions', () => {
  it('should_expose_only_wca_333_as_the_v2_1_practice_capability', () => {
    expect([...SUPPORTED_PRACTICE_EVENT_TYPES]).toEqual(['WCA_333'])
    expect(isPracticeEventSupported('WCA_333')).toBe(true)
    expect(isPracticeEventSupported('WCA_333FM')).toBe(false)
    expect(isPracticeEventSupported('WCA_333MBF')).toBe(false)
  })

  it('should_keep_event_labels_separate_from_practice_capability', () => {
    expect(eventOptions.find((option) => option.value === 'WCA_222')).toEqual({
      value: 'WCA_222',
      label: '2x2x2',
    })
  })
})
