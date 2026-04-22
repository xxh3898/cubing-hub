import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCubeTimer } from './useCubeTimer.js'

function CubeTimerHarness({ enabled = true }) {
  const {
    status,
    handlePointerCancel,
    handlePointerDown,
    handlePointerUp,
  } = useCubeTimer({ enabled })

  return (
    <button
      type="button"
      data-testid="timer-touch-surface"
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {status}
    </button>
  )
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

  it('should_transition_to_running_when_spacebar_is_held_and_released', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    render(<CubeTimerHarness />)

    fireEvent.keyDown(window, { code: 'Space' })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('holding')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('ready')

    fireEvent.keyUp(window, { code: 'Space' })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('running')
  })

  it('should_transition_to_running_when_touch_hold_completes_and_pointer_is_released', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    render(<CubeTimerHarness />)

    fireEvent.pointerDown(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('holding')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('ready')

    fireEvent.pointerUp(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('running')
  })

  it('should_return_to_idle_when_touch_is_released_before_hold_delay', async () => {
    render(<CubeTimerHarness />)

    fireEvent.pointerDown(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('holding')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })

    fireEvent.pointerUp(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('idle')
  })

  it('should_stop_timer_when_touch_starts_while_running', async () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2450)

    render(<CubeTimerHarness />)

    fireEvent.pointerDown(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    fireEvent.pointerUp(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('running')

    fireEvent.pointerDown(screen.getByTestId('timer-touch-surface'), {
      pointerId: 2,
      pointerType: 'touch',
    })
    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('stopped')
  })

  it('should_ignore_mouse_pointer_events_when_touch_handlers_receive_mouse_input', () => {
    render(<CubeTimerHarness />)

    fireEvent.pointerDown(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(screen.getByTestId('timer-touch-surface'), {
      pointerId: 1,
      pointerType: 'mouse',
    })

    expect(screen.getByTestId('timer-touch-surface')).toHaveTextContent('idle')
  })
})
