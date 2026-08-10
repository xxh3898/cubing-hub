import { describe, expect, it } from 'vitest'
import {
  canonicalizeElapsedTime,
  createInitialTimerState,
  TIMER_COMMAND,
  TIMER_STATUS,
  timerReducer,
} from './timerMachine.js'

function reduce(state, command) {
  return timerReducer(state, command)
}

describe('timerMachine', () => {
  it('should_transition_from_idle_to_running_after_hold_ready_and_release', () => {
    const holding = reduce(createInitialTimerState(), {
      type: TIMER_COMMAND.PRESS,
      inputMethod: 'KEYBOARD',
      now: 100,
    })
    const ready = reduce(holding, { type: TIMER_COMMAND.HOLD_READY })
    const running = reduce(ready, { type: TIMER_COMMAND.RELEASE, now: 1000 })

    expect(holding).toMatchObject({ status: TIMER_STATUS.HOLDING, inputMethod: 'KEYBOARD' })
    expect(ready.status).toBe(TIMER_STATUS.READY)
    expect(running).toMatchObject({
      status: TIMER_STATUS.RUNNING,
      startTime: 1000,
      displayTime: 0,
      finalTime: null,
      inputMethod: 'KEYBOARD',
    })
  })

  it.each([
    [1234.1, 1234],
    [1234.4, 1234],
    [1234.5, 1235],
    [1234.7, 1235],
  ])('should_canonicalize_elapsed_time_at_stop_for_%s', (elapsed, expected) => {
    expect(canonicalizeElapsedTime(elapsed)).toBe(expected)
  })

  it('should_keep_start_input_provenance_when_a_different_input_stops_the_solve', () => {
    const running = {
      ...createInitialTimerState(),
      status: TIMER_STATUS.RUNNING,
      startTime: 1000,
      inputMethod: 'KEYBOARD',
    }

    const stopped = reduce(running, {
      type: TIMER_COMMAND.PRESS,
      inputMethod: 'TOUCH',
      now: 2234.7,
    })

    expect(stopped).toMatchObject({
      status: TIMER_STATUS.STOPPED,
      displayTime: 1235,
      finalTime: 1235,
      inputMethod: 'KEYBOARD',
    })
  })

  it('should_keep_fractional_running_display_until_stop_canonicalizes_it', () => {
    const running = {
      ...createInitialTimerState(),
      status: TIMER_STATUS.RUNNING,
      startTime: 1000,
      inputMethod: 'TOUCH',
    }

    const ticking = reduce(running, { type: TIMER_COMMAND.TICK, now: 2234.7 })
    const stopped = reduce(ticking, { type: TIMER_COMMAND.PRESS, inputMethod: 'KEYBOARD', now: 2234.7 })

    expect(ticking.displayTime).toBeCloseTo(1234.7)
    expect(stopped.displayTime).toBe(1235)
  })

  it('should_cancel_holding_or_ready_but_preserve_a_running_solve', () => {
    const holding = {
      ...createInitialTimerState(),
      status: TIMER_STATUS.HOLDING,
      inputMethod: 'KEYBOARD',
    }
    const running = {
      ...createInitialTimerState(),
      status: TIMER_STATUS.RUNNING,
      startTime: 1000,
      inputMethod: 'KEYBOARD',
    }

    expect(reduce(holding, { type: TIMER_COMMAND.CANCEL })).toEqual(createInitialTimerState())
    expect(reduce(running, { type: TIMER_COMMAND.CANCEL })).toEqual(running)
  })

  it('should_restore_a_pending_stopped_solve_without_remeasuring_elapsed_time', () => {
    const restored = reduce(createInitialTimerState(), {
      type: TIMER_COMMAND.RESTORE_STOPPED,
      timeMs: 1235,
      inputMethod: 'TOUCH',
    })

    expect(restored).toMatchObject({
      status: TIMER_STATUS.STOPPED,
      displayTime: 1235,
      finalTime: 1235,
      inputMethod: 'TOUCH',
    })
  })
})
