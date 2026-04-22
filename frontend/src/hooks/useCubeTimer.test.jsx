import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCubeTimer } from './useCubeTimer.js'

function dispatchSpaceKeyEvent(type, options = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent(type, {
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
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
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
})
