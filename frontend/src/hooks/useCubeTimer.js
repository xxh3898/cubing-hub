import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

const HOLD_DELAY_MS = 300

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

  const clearHoldTimeout = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }

  const stopAnimation = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }

  const resetTimer = useCallback(() => {
    clearHoldTimeout()
    stopAnimation()
    startTimeRef.current = null
    setStatus('idle')
    setDisplayTime(0)
    setFinalTime(null)
  }, [])

  const startAnimation = useEffectEvent(() => {
    const tick = () => {
      if (startTimeRef.current == null) {
        return
      }

      setDisplayTime(performance.now() - startTimeRef.current)
      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
  })

  const handleKeyDown = useEffectEvent((event) => {
    if (!enabled || event.code !== 'Space' || event.repeat || isInteractiveTarget(event.target)) {
      return
    }

    if (status === 'idle') {
      event.preventDefault()
      setStatus('holding')
      clearHoldTimeout()
      holdTimeoutRef.current = window.setTimeout(() => {
        setStatus('ready')
      }, HOLD_DELAY_MS)
      return
    }

    if (status === 'running') {
      event.preventDefault()
      stopAnimation()
      const nextFinalTime = performance.now() - startTimeRef.current
      setDisplayTime(nextFinalTime)
      setFinalTime(nextFinalTime)
      setStatus('stopped')
    }
  })

  const handleKeyUp = useEffectEvent((event) => {
    if (!enabled || event.code !== 'Space' || isInteractiveTarget(event.target)) {
      return
    }

    if (status === 'holding') {
      event.preventDefault()
      clearHoldTimeout()
      setStatus('idle')
      return
    }

    if (status === 'ready') {
      event.preventDefault()
      clearHoldTimeout()
      startTimeRef.current = performance.now()
      setDisplayTime(0)
      setFinalTime(null)
      setStatus('running')
      startAnimation()
    }
  })

  const handleWindowBlur = useEffectEvent(() => {
    resetTimer()
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
      clearHoldTimeout()
      stopAnimation()
    }
  }, [])

  return {
    status,
    displayTime,
    finalTime,
    formattedTime: formatTime(displayTime),
    resetTimer,
  }
}
