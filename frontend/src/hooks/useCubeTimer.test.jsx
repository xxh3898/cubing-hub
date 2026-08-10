import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCubeTimer } from './useCubeTimer.js'

let animationFrameCallbacks = []
let now = 0

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

function renderTimer(initialEnabled = true) {
  const clock = () => now

  return renderHook(
    ({ enabled }) => useCubeTimer({ enabled, clock }),
    { initialProps: { enabled: initialEnabled } },
  )
}

describe('useCubeTimer', () => {
  beforeEach(() => {
    now = 0
    animationFrameCallbacks = []
    vi.useFakeTimers()
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

  it('should_transition_keyboard_input_and_share_the_canonical_stopped_value_with_display', () => {
    now = 1000
    const { result } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    expect(result.current).toMatchObject({ status: 'holding', inputMethod: 'KEYBOARD' })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.status).toBe('ready')

    dispatchSpaceKeyEvent('keyup')
    expect(result.current.status).toBe('running')

    now = 2234.7
    dispatchSpaceKeyEvent('keydown')

    expect(result.current).toMatchObject({
      status: 'stopped',
      finalTime: 1235,
      displayTime: 1235,
      formattedTime: '01.235',
      inputMethod: 'KEYBOARD',
    })
  })

  it('should_preserve_touch_provenance_when_keyboard_stops_a_touch_started_solve', () => {
    now = 1000
    const pointerTarget = createPointerTarget()
    const { result } = renderTimer()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget }))
      vi.advanceTimersByTime(300)
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget }))
    })
    expect(result.current).toMatchObject({ status: 'running', inputMethod: 'TOUCH' })

    now = 2234.5
    dispatchSpaceKeyEvent('keydown')

    expect(result.current).toMatchObject({
      status: 'stopped',
      finalTime: 1235,
      inputMethod: 'TOUCH',
    })
  })

  it('should_return_to_idle_when_hold_is_released_before_the_threshold', () => {
    const { result } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(299)
    })
    dispatchSpaceKeyEvent('keyup')

    expect(result.current).toMatchObject({
      status: 'idle',
      finalTime: null,
      inputMethod: null,
    })
  })

  it('should_return_to_idle_when_touch_is_released_before_the_hold_threshold', () => {
    const pointerTarget = createPointerTarget()
    const { result } = renderTimer()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget }))
      vi.advanceTimersByTime(299)
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget }))
    })

    expect(result.current).toMatchObject({ status: 'idle', finalTime: null, inputMethod: null })
  })

  it('should_ignore_mouse_and_interactive_target_input', () => {
    const { result } = renderTimer()
    const button = document.createElement('button')
    document.body.append(button)

    act(() => {
      result.current.handlePointerDown(createPointerEvent({ pointerType: 'mouse' }))
      result.current.handlePointerUp(createPointerEvent({ pointerType: 'mouse' }))
    })
    dispatchSpaceKeyEvent('keydown', { target: button })
    dispatchSpaceKeyEvent('keyup', { target: button })

    expect(result.current.status).toBe('idle')
    button.remove()
  })

  it('should_ignore_repeated_space_and_all_input_while_the_timer_is_disabled', () => {
    const { result, rerender } = renderTimer(false)

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      result.current.handlePointerDown(createPointerEvent({ pointerType: 'touch' }))
      result.current.handlePointerDown(createPointerEvent({ pointerType: 'pen' }))
    })
    expect(result.current).toMatchObject({ status: 'idle', finalTime: null })

    rerender({ enabled: true })
    dispatchSpaceKeyEvent('keydown', { repeat: true })

    expect(result.current.status).toBe('idle')
  })

  it('should_ignore_a_second_press_while_ready_and_subsequent_input_after_stop', () => {
    now = 1000
    const pointerTarget = createPointerTarget()
    const { result } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.status).toBe('ready')

    dispatchSpaceKeyEvent('keydown')
    expect(result.current.status).toBe('ready')

    dispatchSpaceKeyEvent('keyup')
    now = 2234.7
    act(() => {
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 7 }))
    })
    expect(result.current.status).toBe('stopped')

    act(() => {
      result.current.handlePointerUp(createPointerEvent({ currentTarget: pointerTarget, pointerId: 7 }))
      result.current.handlePointerDown(createPointerEvent({ currentTarget: pointerTarget, pointerId: 8 }))
    })
    expect(result.current).toMatchObject({ status: 'stopped', finalTime: 1235 })
  })

  it('should_cancel_holding_or_ready_on_blur_but_preserve_a_running_solve', () => {
    now = 1000
    const { result } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    dispatchWindowBlur()
    expect(result.current.status).toBe('idle')

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.status).toBe('ready')

    dispatchWindowBlur()
    expect(result.current.status).toBe('idle')

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    dispatchSpaceKeyEvent('keyup')
    expect(result.current.status).toBe('running')

    dispatchWindowBlur()
    expect(result.current.status).toBe('running')
  })

  it('should_update_only_running_display_on_animation_frame_and_clean_up_after_reset', () => {
    now = 1000
    const { result } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    dispatchSpaceKeyEvent('keyup')

    now = 62001
    act(() => {
      animationFrameCallbacks[0]()
    })
    expect(result.current.formattedTime).toBe('1:01.001')

    act(() => {
      result.current.resetTimer()
      animationFrameCallbacks[0]()
    })

    expect(result.current).toMatchObject({ status: 'idle', displayTime: 0, finalTime: null })
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('should_cancel_the_animation_frame_when_unmounted_while_running', () => {
    now = 1000
    const { unmount } = renderTimer()

    dispatchSpaceKeyEvent('keydown')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    dispatchSpaceKeyEvent('keyup')

    unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('should_release_pointer_capture_without_transition_when_timer_becomes_disabled', () => {
    const pointerTarget = createPointerTarget()
    const { result, rerender } = renderTimer()

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

  it('should_support_pen_input_and_cancel_an_incomplete_hold', () => {
    const pointerTarget = createPointerTarget()
    const { result } = renderTimer()

    act(() => {
      result.current.handlePointerDown(createPointerEvent({
        currentTarget: pointerTarget,
        pointerId: 7,
        pointerType: 'pen',
      }))
    })
    expect(result.current).toMatchObject({ status: 'holding', inputMethod: 'TOUCH' })

    act(() => {
      result.current.handlePointerCancel(createPointerEvent({
        currentTarget: pointerTarget,
        pointerId: 7,
        pointerType: 'pen',
      }))
    })

    expect(pointerTarget.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(result.current).toMatchObject({ status: 'idle', finalTime: null, inputMethod: null })
  })

  it('should_restore_a_pending_stopped_solve_without_starting_a_new_timer', () => {
    const { result } = renderTimer()

    act(() => {
      result.current.restoreStoppedSolve({ timeMs: 1235, inputMethod: 'TOUCH' })
    })

    expect(result.current).toMatchObject({
      status: 'stopped',
      finalTime: 1235,
      displayTime: 1235,
      inputMethod: 'TOUCH',
    })
  })

  it('should_prevent_default_on_non_interactive_space_keypress', () => {
    const keypressEvent = new KeyboardEvent('keypress', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
    })
    const preventDefaultSpy = vi.spyOn(keypressEvent, 'preventDefault')

    renderTimer()

    act(() => {
      window.dispatchEvent(keypressEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})
