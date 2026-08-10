import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  createInitialTimerState,
  TIMER_COMMAND,
  TIMER_STATUS,
  timerReducer,
} from './timerMachine.js'
import { useKeyboardTimerInput } from './useKeyboardTimerInput.js'
import { useTouchTimerInput } from './useTouchTimerInput.js'

const HOLD_DELAY_MS = 300

function formatTime(milliseconds) {
  const totalMilliseconds = Math.max(0, Math.floor(milliseconds))
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const remainingMilliseconds = totalMilliseconds % 1000

  if (minutes > 0) {
    return `${String(minutes)}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
  }

  return `${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
}

function defaultClock() {
  return performance.now()
}

export function useCubeTimer({ enabled, clock = defaultClock }) {
  const [state, dispatch] = useReducer(timerReducer, undefined, createInitialTimerState)
  const stateRef = useRef(state)
  const holdTimeoutRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const dispatchCommand = useCallback((command) => {
    const previousState = stateRef.current
    const nextState = timerReducer(previousState, command)

    stateRef.current = nextState
    dispatch(command)

    return { previousState, nextState }
  }, [])

  const clearHoldTimeout = useCallback(() => {
    if (holdTimeoutRef.current != null) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }, [])

  const stopAnimation = useCallback(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const startAnimation = useCallback(() => {
    const tick = () => {
      if (stateRef.current.status !== TIMER_STATUS.RUNNING) {
        return
      }

      dispatchCommand({ type: TIMER_COMMAND.TICK, now: clock() })
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
  }, [clock, dispatchCommand])

  const pressInput = useCallback((inputMethod) => {
    if (!enabled) {
      return
    }

    const { previousState, nextState } = dispatchCommand({
      type: TIMER_COMMAND.PRESS,
      inputMethod,
      now: clock(),
    })

    if (previousState.status === TIMER_STATUS.IDLE && nextState.status === TIMER_STATUS.HOLDING) {
      clearHoldTimeout()
      holdTimeoutRef.current = window.setTimeout(() => {
        holdTimeoutRef.current = null
        dispatchCommand({ type: TIMER_COMMAND.HOLD_READY })
      }, HOLD_DELAY_MS)
    }

    if (previousState.status === TIMER_STATUS.RUNNING && nextState.status === TIMER_STATUS.STOPPED) {
      stopAnimation()
    }
  }, [clearHoldTimeout, clock, dispatchCommand, enabled, stopAnimation])

  const releaseInput = useCallback(() => {
    if (!enabled) {
      return
    }

    const previousState = stateRef.current

    if (previousState.status === TIMER_STATUS.HOLDING || previousState.status === TIMER_STATUS.READY) {
      clearHoldTimeout()
    }

    const { nextState } = dispatchCommand({
      type: TIMER_COMMAND.RELEASE,
      now: clock(),
    })

    if (previousState.status === TIMER_STATUS.READY && nextState.status === TIMER_STATUS.RUNNING) {
      startAnimation()
    }
  }, [clearHoldTimeout, clock, dispatchCommand, enabled, startAnimation])

  const cancelInput = useCallback(() => {
    clearHoldTimeout()
    dispatchCommand({ type: TIMER_COMMAND.CANCEL })
  }, [clearHoldTimeout, dispatchCommand])

  const {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    clearActivePointer,
  } = useTouchTimerInput({
    enabled,
    onPress: pressInput,
    onRelease: releaseInput,
    onCancel: cancelInput,
  })

  const resetTimer = useCallback(() => {
    clearHoldTimeout()
    stopAnimation()
    clearActivePointer()
    dispatchCommand({ type: TIMER_COMMAND.RESET })
  }, [clearActivePointer, clearHoldTimeout, dispatchCommand, stopAnimation])

  const restoreStoppedSolve = useCallback(({ timeMs, inputMethod }) => {
    clearHoldTimeout()
    stopAnimation()
    clearActivePointer()
    dispatchCommand({
      type: TIMER_COMMAND.RESTORE_STOPPED,
      timeMs,
      inputMethod,
    })
  }, [clearActivePointer, clearHoldTimeout, dispatchCommand, stopAnimation])

  useKeyboardTimerInput({
    enabled,
    onPress: pressInput,
    onRelease: releaseInput,
  })

  useEffect(() => {
    const handleWindowBlur = () => {
      clearActivePointer()
      cancelInput()
    }

    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [cancelInput, clearActivePointer])

  useEffect(() => () => {
    clearHoldTimeout()
    stopAnimation()
  }, [clearHoldTimeout, stopAnimation])

  return {
    status: state.status,
    displayTime: state.displayTime,
    finalTime: state.finalTime,
    inputMethod: state.inputMethod,
    formattedTime: formatTime(state.displayTime),
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetTimer,
    restoreStoppedSolve,
  }
}
