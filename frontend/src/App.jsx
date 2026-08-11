import { Suspense, lazy } from 'react'
import {
  BookOpen,
  CircleHelp,
  Compass,
  Home,
  LoaderCircle,
  MessageCircle,
  Shield,
  Timer,
  Trophy,
  UserCircle,
} from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { useAuth } from './context/useAuth.js'
import { FocusModeProvider, useFocusMode } from './context/FocusModeContext.jsx'

const CommunityPage = lazy(() => import('./pages/CommunityPage.jsx'))
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const LearningPage = lazy(() => import('./pages/LearningPage.jsx'))
const RankingsPage = lazy(() => import('./pages/RankingsPage.jsx'))
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage.jsx'))
const CommunityWritePage = lazy(() => import('./pages/CommunityWritePage.jsx'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage.jsx'))
const QnaPage = lazy(() => import('./pages/QnaPage.jsx'))
const QnaDetailPage = lazy(() => import('./pages/QnaDetailPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AdminFeedbackDetailPage = lazy(() => import('./pages/AdminFeedbackDetailPage.jsx'))
const AdminMemoDetailPage = lazy(() => import('./pages/AdminMemoDetailPage.jsx'))
const TimerPage = lazy(() => import('./pages/TimerPage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'))
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'))
const MyPage = lazy(() => import('./pages/MyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

function getReturnPath(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

function AuthLoadingPage() {
  return (
    <section className="page-grid auth-page">
      <div className="auth-status-shell">
        <div className="panel auth-panel auth-status-panel">
          <span className="auth-header-icon auth-status-icon" aria-hidden="true">
            <LoaderCircle size={20} />
          </span>
          <div className="auth-header">
            <h2>인증 확인 중</h2>
            <p className="helper-text">현재 로그인 상태를 확인하고 있습니다.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function RouteLoadingPage() {
  return (
    <section className="page-grid auth-page">
      <div className="auth-status-shell">
        <div className="panel auth-panel auth-status-panel">
          <span className="auth-header-icon auth-status-icon" aria-hidden="true">
            <LoaderCircle size={20} />
          </span>
          <div className="auth-header">
            <h2>페이지 준비 중</h2>
            <p className="helper-text">페이지를 불러오는 중입니다.</p>
          </div>
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

function AdminRoute({ children }) {
  const { hasAuthToken, isAuthenticated, isAuthLoading, currentUser } = useAuth()
  const location = useLocation()
  const returnTo = getReturnPath(location)

  if (isAuthLoading) {
    return <AuthLoadingPage />
  }

  if (!hasAuthToken || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: returnTo }} />
  }

  if (currentUser?.role !== 'ROLE_ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}

function AppLayout() {
  const { currentUser, hasAuthToken, isAuthLoading } = useAuth()
  const { isFocusMode } = useFocusMode()
  const location = useLocation()
  const accountLabel = isAuthLoading ? '계정 확인 중' : (currentUser?.nickname ?? '로그인')
  const isAdmin = currentUser?.role === 'ROLE_ADMIN'
  const accountPath = hasAuthToken ? '/mypage' : '/login'
  const primaryNavItems = [
    { to: '/', label: '홈', icon: Home },
    { to: '/timer', label: '타이머', icon: Timer },
    { to: '/mypage', label: '마이페이지', icon: UserCircle },
    { to: '/rankings', label: '랭킹', icon: Trophy },
  ]
  const exploreItems = [
    { to: '/learning', label: '학습', icon: BookOpen },
    { to: '/community', label: '커뮤니티', icon: MessageCircle },
    { to: '/qna', label: 'Q&A', icon: CircleHelp },
  ]
  const mobileTabItems = primaryNavItems
  const isExploreActive = exploreItems.some((item) => location.pathname.startsWith(item.to))

  return (
    <div className={`app-shell${isFocusMode ? ' is-focus-mode' : ''}`}>
      <header className="app-topbar">
        <div className="app-nav-inner">
          <NavLink className="brand-link" to="/" aria-label="Cubing Hub 홈">
            <img className="brand-logo" src="/CUBINGHUB.png" alt="" aria-hidden="true" />
            <span>Cubing Hub</span>
          </NavLink>

          <nav className="topnav desktop-nav" aria-label="Primary">
            {primaryNavItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
            <details className={`explore-menu${isExploreActive ? ' is-active' : ''}`}>
              <summary>
                <Compass size={16} aria-hidden="true" />
                <span>탐색</span>
              </summary>
              <div className="explore-menu-popover">
                {exploreItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <NavLink key={item.to} to={item.to}>
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </details>
          </nav>

          <div className="topbar-meta">
            {isAdmin ? (
              <NavLink className="utility-link" to="/admin">
                <Shield size={16} aria-hidden="true" />
                <span>관리자</span>
              </NavLink>
            ) : null}
            <NavLink className={`status-chip ${hasAuthToken ? 'is-authenticated' : 'is-guest'}`} to={accountPath}>
              <UserCircle size={18} aria-hidden="true" />
              <span>{accountLabel}</span>
            </NavLink>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <Suspense fallback={<RouteLoadingPage />}>
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
            <Route
              path="/community/:id/edit"
              element={(
                <ProtectedRoute>
                  <CommunityWritePage />
                </ProtectedRoute>
              )}
            />
            <Route path="/community/:id" element={<CommunityDetailPage />} />
            <Route path="/qna" element={<QnaPage />} />
            <Route path="/qna/:id" element={<QnaDetailPage />} />
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
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/mypage"
              element={(
                <ProtectedRoute>
                  <MyPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/feedback"
              element={(
                <ProtectedRoute>
                  <FeedbackPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin"
              element={(
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              )}
            />
            <Route
              path="/admin/feedbacks/:id"
              element={(
                <AdminRoute>
                  <AdminFeedbackDetailPage />
                </AdminRoute>
              )}
            />
            <Route
              path="/admin/memos/:id"
              element={(
                <AdminRoute>
                  <AdminMemoDetailPage />
                </AdminRoute>
              )}
            />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="app-footer">
        <div>
          <p className="app-footer-brand">Cubing Hub</p>
        </div>
        <nav className="app-footer-links" aria-label="Footer">
          <NavLink to="/community">공지사항</NavLink>
          <NavLink to="/qna">Q&A</NavLink>
          <NavLink className="footer-feedback-link" to="/feedback">
            개발자 피드백
          </NavLink>
        </nav>
        <p className="app-footer-copy">© 2026 Cubing Hub. All rights reserved.</p>
      </footer>

      <nav className="mobile-tabbar" aria-label="Mobile primary">
        {mobileTabItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        <details className={`mobile-more-menu${isExploreActive ? ' is-active' : ''}`}>
          <summary>
            <Compass size={20} aria-hidden="true" />
            <span>더보기</span>
          </summary>
          <div className="mobile-more-sheet">
            {exploreItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink key={item.to} to={item.to}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </details>
      </nav>

      <ToastContainer
        position="top-right"
        autoClose={3600}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        limit={3}
        ariaLabel="서비스 알림"
        className="app-toast-container"
        toastClassName={(context) => `app-toast app-toast-${context?.type ?? 'default'}`}
      />
    </div>
  )
}

export default function App() {
  return (
    <FocusModeProvider>
      <AppLayout />
    </FocusModeProvider>
  )
}
