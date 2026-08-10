import { useCallback, useRef } from 'react'

export function isTouchLikePointer(pointerType) {
  return pointerType === 'touch' || pointerType === 'pen'
}

function releasePointerCapture(event) {
  if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }
}

export function useTouchTimerInput({ enabled, onPress, onRelease, onCancel }) {
  const activePointerIdRef = useRef(null)

  const clearActivePointer = useCallback(() => {
    activePointerIdRef.current = null
  }, [])

  const handlePointerDown = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current != null || !enabled) {
      return
    }

    event.preventDefault()
    activePointerIdRef.current = event.pointerId
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    onPress('TOUCH')
  }, [enabled, onPress])

  const handlePointerUp = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current !== event.pointerId) {
      return
    }

    event.preventDefault()
    clearActivePointer()
    releasePointerCapture(event)

    if (enabled) {
      onRelease()
    }
  }, [clearActivePointer, enabled, onRelease])

  const handlePointerCancel = useCallback((event) => {
    if (!isTouchLikePointer(event.pointerType) || activePointerIdRef.current !== event.pointerId) {
      return
    }

    clearActivePointer()
    releasePointerCapture(event)
    onCancel()
  }, [clearActivePointer, onCancel])

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    clearActivePointer,
  }
}
