import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import CommunityPage from './pages/CommunityPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LearningPage from './pages/LearningPage.jsx'
import RankingsPage from './pages/RankingsPage.jsx'
import CommunityDetailPage from './pages/CommunityDetailPage.jsx'
import CommunityWritePage from './pages/CommunityWritePage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'
import TimerPage from './pages/TimerPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import MyPage from './pages/MyPage.jsx'

function getReturnPath(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

function AuthLoadingPage() {
  return (
    <section className="page-grid auth-page">
      <div className="panel auth-panel auth-status-panel">
        <div className="auth-header">
          <h2>인증 확인 중</h2>
          <p className="helper-text">현재 로그인 상태를 확인하고 있습니다.</p>
        </div>
      </div>
    </section>
  )
}

function ProtectedRoute({ children }) {
  const { hasAuthToken, isAuthenticated, isAuthLoading } = useAuth()
  const location = useLocation()
  const returnTo = getReturnPath(location)

  if (isAuthLoading) {
    return <AuthLoadingPage />
  }

  if (!hasAuthToken) {
    return <Navigate to="/login" replace state={{ from: returnTo }} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: returnTo }} />
  }

  return children
}

function GuestOnlyRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuth()
  const location = useLocation()
  const fallbackPath = typeof location.state?.from === 'string' ? location.state.from : '/'

  if (isAuthLoading) {
    return <AuthLoadingPage />
  }

  if (isAuthenticated) {
    return <Navigate to={fallbackPath} replace />
  }

  return children
}

function AppLayout() {
  const { currentUser, hasAuthToken, isAuthLoading } = useAuth()
  const accountLabel = isAuthLoading ? '계정 확인 중' : (currentUser?.nickname ?? '로그인')

  return (
    <div className="app-shell">
      <header className="topbar app-topbar">
        <div className="brand-block">
          <p className="eyebrow">Cubing Hub</p>
          <h1>Cubing Hub</h1>
          <p className="helper-text">기록, 학습, 랭킹, 커뮤니티를 한 흐름으로 연결한 서비스 화면입니다.</p>
        </div>
        <div className="topbar-meta">
          <nav className="topnav" aria-label="Primary">
            <NavLink to="/">홈</NavLink>
            <NavLink to="/timer">타이머</NavLink>
            <NavLink to="/rankings">랭킹</NavLink>
            <NavLink to="/learning">학습</NavLink>
            <NavLink to="/community">커뮤니티</NavLink>
          </nav>
          <NavLink className={`status-chip ${hasAuthToken ? 'is-authenticated' : 'is-guest'}`} to={hasAuthToken ? '/mypage' : '/login'}>
            {accountLabel}
          </NavLink>
        </div>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route
            path="/community/write"
            element={(
              <ProtectedRoute>
                <CommunityWritePage />
              </ProtectedRoute>
            )}
          />
          <Route path="/community/:id" element={<CommunityDetailPage />} />
          <Route
            path="/login"
            element={(
              <GuestOnlyRoute>
                <LoginPage />
              </GuestOnlyRoute>
            )}
          />
          <Route
            path="/signup"
            element={(
              <GuestOnlyRoute>
                <SignupPage />
              </GuestOnlyRoute>
            )}
          />
          <Route
            path="/mypage"
            element={(
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            )}
          />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div>
          <p className="eyebrow">Feedback</p>
          <p className="helper-text">서비스에 대한 의견과 개선점을 개발자에게 전달할 수 있습니다.</p>
        </div>
        <NavLink className="footer-feedback-link" to="/feedback">
          개발자 피드백
        </NavLink>
      </footer>
    </div>
  )
}

export default function App() {
  return <AppLayout />
}
