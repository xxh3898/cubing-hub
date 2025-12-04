import { useEffect } from 'react'
import AppRoutes from './routes/routes'
import useMemberStore from './stores/useMemberStore'

function App() {
  const { initialize } = useMemberStore();

  useEffect(() => {
    initialize(); 
  }, [])

  return (
    <AppRoutes />
  )
}

export default App