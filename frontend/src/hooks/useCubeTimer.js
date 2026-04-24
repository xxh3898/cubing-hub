import { useCallback, useEffect, useRef, useState } from 'react'

const HOLD_DELAY_MS = 300

function isTouchLikePointer(pointerType) {
  return pointerType === 'touch' || pointerType === 'pen'
}

function isInteractiveTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, button, select'))
}

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

export function useCubeTimer({ enabled }) {
  const [status, setStatus] = useState('idle')
  const [displayTime, setDisplayTime] = useState(0)
  const [finalTime, setFinalTime] = useState(null)

  const holdTimeoutRef = useRef(null)
  const frameRef = useRef(null)
  const startTimeRef = useRef(null)
  const activePointerIdRef = useRef(null)

  const clearHoldTimeout = useCallback(() => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }, [])

  const stopAnimation = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const clearActivePointer = useCallback(() => {
    activePointerIdRef.current = null
  }, [])

  const resetTimer = useCallback(() => {
    clearHoldTimeout()
    stopAnimation()
    clearActivePointer()
    startTimeRef.current = null
    setStatus('idle')
    setDisplayTime(0)
    setFinalTime(null)
  }, [clearActivePointer, clearHoldTimeout, stopAnimation])

  const startAnimation = useCallback(() => {
    const tick = () => {
      if (startTimeRef.current == null) {
        return
      }

      setDisplayTime(performance.now() - startTimeRef.current)
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
  }, [])

  const transitionToHolding = useCallback(() => {
    setStatus('holding')
    clearHoldTimeout()
    holdTimeoutRef.current = window.setTimeout(() => {
      setStatus('ready')
    }, HOLD_DELAY_MS)
  }, [clearHoldTimeout])

  const transitionToIdle = useCallback(() => {
    clearHoldTimeout()
    setStatus('idle')
  }, [clearHoldTimeout])

  const transitionToRunning = useCallback(() => {
    clearHoldTimeout()
    startTimeRef.current = performance.now()
    setDisplayTime(0)
    setFinalTime(null)
    setStatus('running')
    startAnimation()
  }, [clearHoldTimeout, startAnimation])

  const transitionToStopped = useCallback(() => {
    /* v8 ignore next -- transitionToStopped is only reached after a running start timestamp exists */
    if (startTimeRef.current == null) {
      return
    }

    stopAnimation()
    const nextFinalTime = performance.now() - startTimeRef.current
    setDisplayTime(nextFinalTime)
    setFinalTime(nextFinalTime)
    setStatus('stopped')
  }, [stopAnimation])

  const handleKeyDown = useCallback((event) => {
    if (event.code !== 'Space' || event.repeat || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()

    if (!enabled) {
      return
    }

    if (status === 'idle') {
      transitionToHolding()
      return
    }

    if (status === 'running') {
      transitionToStopped()
    }
  }, [enabled, status, transitionToHolding, transitionToStopped])

  const handleKeyUp = useCallback((event) => {
    if (event.code !== 'Space' || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()

    if (!enabled) {
      return
    }

    if (status === 'holding') {
      transitionToIdle()
      return
    }

    if (status === 'ready') {
      transitionToRunning()
    }
  }, [enabled, status, transitionToIdle, transitionToRunning])

  const handleKeyPress = useCallback((event) => {
    if (event.code !== 'Space' || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()
  }, [])

  const handleWindowBlur = useCallback(() => {
    clearActivePointer()

    if (status === 'holding' || status === 'ready') {
      resetTimer()
      return
    }

    clearHoldTimeout()
  }, [clearActivePointer, clearHoldTimeout, resetTimer, status])

  const handlePointerDown = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current != null || !enabled) {
      return
    }

    event.preventDefault()
    activePointerIdRef.current = event.pointerId
    event.currentTarget?.setPointerCapture?.(event.pointerId)

    if (status === 'idle') {
      transitionToHolding()
      return
    }

    if (status === 'running') {
      transitionToStopped()
    }
  }, [enabled, status, transitionToHolding, transitionToStopped])

  const handlePointerUp = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current !== event.pointerId) {
      return
    }

    event.preventDefault()
    clearActivePointer()

    if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }

    if (!enabled) {
      return
    }

    if (status === 'holding') {
      transitionToIdle()
      return
    }

    if (status === 'ready') {
      transitionToRunning()
    }
  }, [clearActivePointer, enabled, status, transitionToIdle, transitionToRunning])

  const handlePointerCancel = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current !== event.pointerId) {
      return
    }

    clearActivePointer()
    clearHoldTimeout()

    if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }

    if (status === 'holding' || status === 'ready') {
      setStatus('idle')
    }
  }, [clearActivePointer, clearHoldTimeout, status])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup', handleKeyUp, { capture: true })
    window.addEventListener('keypress', handleKeyPress, { capture: true })
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup', handleKeyUp, { capture: true })
      window.removeEventListener('keypress', handleKeyPress, { capture: true })
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [handleKeyDown, handleKeyPress, handleKeyUp, handleWindowBlur])

  useEffect(() => () => {
    clearHoldTimeout()
    stopAnimation()
  }, [clearHoldTimeout, stopAnimation])

  return {
    status,
    displayTime,
    finalTime,
    formattedTime: formatTime(displayTime),
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetTimer,
  }
}
