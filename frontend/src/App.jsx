import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import AuthPage from './pages/AuthPage.jsx'
import TimerPage from './pages/TimerPage.jsx'

function AppLayout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Cubing Hub</p>
          <h1>Day 12 Client Integration</h1>
        </div>
        <div className="topbar-meta">
          <nav className="topnav" aria-label="Primary">
            <NavLink to="/timer">Timer</NavLink>
            <NavLink to="/auth">Auth</NavLink>
          </nav>
          <p className={`status-chip ${isAuthenticated ? 'is-authenticated' : 'is-guest'}`}>
            {isAuthenticated ? '로그인됨' : '비로그인'}
          </p>
        </div>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/timer" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/timer" element={<TimerPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AppLayout />
}
