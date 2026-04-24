import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCubeTimer } from './useCubeTimer.js'

let animationFrameCallbacks = []

function dispatchSpaceKeyEvent(type, options = {}) {
  const target = options.target ?? window

  act(() => {
    target.dispatchEvent(new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      ...options,
    }))
  })
}

function dispatchWindowBlur() {
  act(() => {
    window.dispatchEvent(new Event('blur'))
  })
}

function createPointerTarget() {
  let capturedPointerId = null

  return {
    setPointerCapture: vi.fn((pointerId) => {
      capturedPointerId = pointerId
    }),
    hasPointerCapture: vi.fn((pointerId) => capturedPointerId === pointerId),
    releasePointerCapture: vi.fn((pointerId) => {
      if (capturedPointerId === pointerId) {
        capturedPointerId = null
      }
    }),
  }
}

function createPointerEvent({ pointerId = 1, pointerType = 'touch', currentTarget = createPointerTarget() } = {}) {
  return {
    currentTarget,
    pointerId,
    pointerType,
    preventDefault: vi.fn(),
  }
}

describe('useCubeTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    animationFrameCallbacks = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      animationFrameCallbacks.push(callback)
      return animationFrameCallbacks.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should_transition_to_running_when_spacebar_is_held_and_released', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')
    expect(result.current.status).toBe('holding')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.status).toBe('ready')

    dispatchSpaceKeyEvent('keyup')
    expect(result.current.status).toBe('running')
  })

  it('should_transition_to_running_when_touch_hold_completes_and_pointer_is_released', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))
    const pointerTarget = createPointerTarget()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget }))
    })
    expect(result.current.status).toBe('holding')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.status).toBe('ready')

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget }))
    })
    expect(result.current.status).toBe('running')
  })

  it('should_return_to_idle_when_touch_is_released_before_hold_delay', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))
    const pointerTarget = createPointerTarget()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget }))
    })
    expect(result.current.status).toBe('holding')

    act(() => {
      vi.advanceTimersByTime(150)
    })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget }))
    })
    expect(result.current.status).toBe('idle')
  })

  it('should_stop_timer_when_touch_starts_while_running', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))
    const firstPointerTarget = createPointerTarget()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: firstPointerTarget, pointerId: 1 }))
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: firstPointerTarget, pointerId: 1 }))
    })
    expect(result.current.status).toBe('running')

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ pointerId: 2 }))
    })
    expect(result.current.status).toBe('stopped')
    expect(result.current.finalTime).toBe(1450)
  })

  it('should_ignore_mouse_pointer_events_when_touch_handlers_receive_mouse_input', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ pointerId: 1, pointerType: 'mouse' }))
      result.current.handlePointerUp(createPointerEvent({ pointerId: 1, pointerType: 'mouse' }))
    })

    expect(result.current.status).toBe('idle')
  })

  it('should_preserve_running_timer_when_window_blurs_during_active_solve', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    dispatchSpaceKeyEvent('keyup')
    expect(result.current.status).toBe('running')

    dispatchWindowBlur()
    expect(result.current.status).toBe('running')

    dispatchSpaceKeyEvent('keydown')
    expect(result.current.status).toBe('stopped')
    expect(result.current.finalTime).toBe(1450)
  })

  it('should_cancel_pending_start_when_window_blurs_in_ready_state', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.status).toBe('ready')

    dispatchWindowBlur()

    expect(result.current.status).toBe('idle')
    expect(result.current.displayTime).toBe(0)
    expect(result.current.finalTime).toBeNull()
  })

  it('should_ignore_keyboard_events_when_target_is_interactive_or_repeat_is_true', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))
    const button = document.createElement('button')
    document.body.append(button)

    dispatchSpaceKeyEvent('keydown', { target: button })
    expect(result.current.status).toBe('idle')

    dispatchSpaceKeyEvent('keydown', { repeat: true })
    expect(result.current.status).toBe('idle')

    dispatchSpaceKeyEvent('keypress', { target: button })
    expect(result.current.status).toBe('idle')
  })

  it('should_ignore_keyboard_and_pointer_events_when_timer_is_disabled', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: false }))

    dispatchSpaceKeyEvent('keydown')
    dispatchSpaceKeyEvent('keyup')

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ pointerType: 'touch' }))
      result.current.handlePointerDown(createPointerEvent({ pointerType: 'pen' }))
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.finalTime).toBeNull()
  })

  it('should_ignore_keydown_when_timer_is_ready_but_not_running', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.status).toBe('ready')

    dispatchSpaceKeyEvent('keydown')

    expect(result.current.status).toBe('ready')
  })

  it('should_ignore_keyup_when_target_is_interactive_or_timer_is_not_ready', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))
    const button = document.createElement('button')
    document.body.append(button)

    dispatchSpaceKeyEvent('keyup', { target: button })
    expect(result.current.status).toBe('idle')

    dispatchSpaceKeyEvent('keyup')
    expect(result.current.status).toBe('idle')
  })

  it('should_update_display_time_and_format_minutes_when_animation_frame_ticks', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(62001)
      .mockReturnValueOnce(63001)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    dispatchSpaceKeyEvent('keyup')

    act(() => {
      animationFrameCallbacks[0]()
    })

    expect(result.current.displayTime).toBe(61001)
    expect(result.current.formattedTime).toBe('1:01.001')

    dispatchSpaceKeyEvent('keydown')
    expect(result.current.status).toBe('stopped')
    expect(result.current.finalTime).toBe(62001)
  })

  it('should_ignore_animation_tick_when_timer_is_reset_after_start', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)

    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    dispatchSpaceKeyEvent('keyup')

    act(() => {
      result.current.resetTimer()
      animationFrameCallbacks[0]()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.displayTime).toBe(0)
    expect(result.current.finalTime).toBeNull()
  })

  it('should_ignore_pointer_up_when_timer_becomes_disabled_after_pointer_capture', () => {
    const pointerTarget = createPointerTarget()
    const { result, rerender } = renderHook(
      ({ enabled }) => useCubeTimer({ enabled }),
      { initialProps: { enabled: true } },
    )

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 7 }))
    })

    rerender({ enabled: false })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget, pointerId: 7 }))
    })

    expect(pointerTarget.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(result.current.status).toBe('holding')
  })

  it('should_reset_to_idle_when_pointer_cancel_occurs_with_matching_pointer', () => {
    const pointerTarget = createPointerTarget()
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 9, pointerType: 'pen' }))
    })
    expect(result.current.status).toBe('holding')

    act(() => {
      result.current.handlePointerCancel(createPointerEvent({ currentTarget: pointerTarget, pointerId: 9, pointerType: 'pen' }))
    })

    expect(pointerTarget.releasePointerCapture).toHaveBeenCalledWith(9)
    expect(result.current.status).toBe('idle')
  })

  it('should_ignore_pointer_down_when_timer_is_stopped_but_not_running', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    const pointerTarget = createPointerTarget()
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 1 }))
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget, pointerId: 1 }))
    })

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 2 }))
    })

    expect(result.current.status).toBe('stopped')

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget, pointerId: 2 }))
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 3 }))
    })

    expect(result.current.status).toBe('stopped')
    expect(result.current.finalTime).toBe(1450)
  })

  it('should_skip_pointer_capture_release_when_target_does_not_report_capture', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    const uncapturedTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    }
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 1 }))
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 1 }))
    })

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 2 }))
      result.current.handlePointerUp(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 2 }))
    })

    expect(uncapturedTarget.releasePointerCapture).not.toHaveBeenCalled()
    expect(result.current.status).toBe('stopped')
  })

  it('should_ignore_pointer_cancel_idle_reset_when_timer_is_stopped_and_target_has_no_capture', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    const uncapturedTarget = {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    }
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 1 }))
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 1 }))
    })
    expect(result.current.status).toBe('running')

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 2 }))
    })

    expect(result.current.status).toBe('stopped')

    act(() => {
      result.current.handlePointerCancel(createPointerEvent({ currentTarget: uncapturedTarget, pointerId: 2 }))
    })

    expect(uncapturedTarget.releasePointerCapture).not.toHaveBeenCalled()
    expect(result.current.status).toBe('stopped')
  })

  it('should_ignore_pointer_cancel_when_pointer_does_not_match_active_pointer', () => {
    const pointerTarget = createPointerTarget()
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 3 }))
    })

    act(() => {
      result.current.handlePointerCancel(createPointerEvent({ currentTarget: pointerTarget, pointerId: 4 }))
    })

    expect(pointerTarget.releasePointerCapture).not.toHaveBeenCalled()
    expect(result.current.status).toBe('holding')
  })

  it('should_cancel_animation_frame_when_hook_is_unmounted_while_running', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)

    const { unmount } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')

    act(() => {
      vi.advanceTimersByTime(300)
    })

    dispatchSpaceKeyEvent('keyup')

    unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('should_return_to_idle_when_keyboard_hold_is_released_before_ready_state', () => {
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    dispatchSpaceKeyEvent('keydown')
    expect(result.current.status).toBe('holding')

    dispatchSpaceKeyEvent('keyup')

    expect(result.current.status).toBe('idle')
  })

  it('should_prevent_default_on_keypress_for_spacebar_when_target_is_not_interactive', () => {
    const keypressEvent = new KeyboardEvent('keypress', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
    })
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault')

    renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      window.dispatchEvent(keypressEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should_reset_to_idle_when_pointer_cancel_occurs_in_ready_state', () => {
    const pointerTarget = createPointerTarget()
    const { result } = renderHook(() => useCubeTimer({ enabled: true }))

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 12 }))
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.status).toBe('ready')

    act(() => {
      result.current.handlePointerCancel(createPointerEvent({ currentTarget: pointerTarget, pointerId: 12 }))
    })

    expect(result.current.status).toBe('idle')
  })
})
