import { createContext, useContext, useMemo, useState } from 'react'

const FocusModeContext = createContext({
  isFocusMode: false,
  setIsFocusMode: () => {},
})

export function FocusModeProvider({ children }) {
  const [isFocusMode, setIsFocusMode] = useState(false)
  const value = useMemo(() => ({ isFocusMode, setIsFocusMode }), [isFocusMode])

  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
}

export function useFocusMode() {
  return useContext(FocusModeContext)
}
