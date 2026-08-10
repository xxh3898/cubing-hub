import { useEffect } from 'react'

export function isInteractiveTimerTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, button, select'))
}

function isSpaceKeyEvent(event) {
  return event.code === 'Space' && !isInteractiveTimerTarget(event.target)
}

export function useKeyboardTimerInput({ enabled, onPress, onRelease }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isSpaceKeyEvent(event) || event.repeat) {
        return
      }

      event.preventDefault()

      if (enabled) {
        onPress('KEYBOARD')
      }
    }

    const handleKeyUp = (event) => {
      if (!isSpaceKeyEvent(event)) {
        return
      }

      event.preventDefault()

      if (enabled) {
        onRelease()
      }
    }

    const handleKeyPress = (event) => {
      if (isSpaceKeyEvent(event)) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('keypress', handleKeyPress, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('keypress', handleKeyPress, true)
    }
  }, [enabled, onPress, onRelease])
}
