import { useEffect, useState } from 'react'

const DEFAULT_DEBOUNCE_DELAY_MS = 300

export function useDebouncedValue(value, delay = DEFAULT_DEBOUNCE_DELAY_MS) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delay, value])

  return debouncedValue
}
