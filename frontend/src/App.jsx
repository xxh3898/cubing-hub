import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import CommunityPage from './pages/CommunityPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LearningPage from './pages/LearningPage.jsx'
import RankingsPage from './pages/RankingsPage.jsx'
import CommunityDetailPage from './pages/CommunityDetailPage.jsx'
import CommunityWritePage from './pages/CommunityWritePage.jsx'
import TimerPage from './pages/TimerPage.jsx'
import { mockCurrentUser } from './constants/mockDashboard.js'

function PlaceholderPage({ title, description, metaItems = [] }) {
  return (
    <section className="page-grid">
      <div className="panel">
        <p className="eyebrow">Cubing Hub</p>
        <h2>{title}</h2>
        <p className="helper-text">{description}</p>
      </div>
      <div className="panel">
        <div className="placeholder-meta">
          {metaItems.map((item) => (
            <article key={item.label} className="placeholder-card">
              <p className="placeholder-label">{item.label}</p>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function AppLayout() {
  const { isAuthenticated } = useAuth()
  const accountLabel = isAuthenticated ? mockCurrentUser.nickname : '로그인'

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
          <NavLink className={`status-chip ${isAuthenticated ? 'is-authenticated' : 'is-guest'}`} to={isAuthenticated ? '/mypage' : '/login'}>
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
          <Route path="/community/write" element={<CommunityWritePage />} />
          <Route path="/community/:id" element={<CommunityDetailPage />} />
          <Route
            path="/login"
            element={
              <PlaceholderPage
                title="로그인"
                description="이메일과 비밀번호로 계정에 로그인할 수 있습니다."
              />
            }
          />
          <Route
            path="/signup"
            element={
              <PlaceholderPage
                title="회원가입"
                description="기록 저장과 커뮤니티 이용을 위한 계정을 만들 수 있습니다."
              />
            }
          />
          <Route
            path="/mypage"
            element={
              <PlaceholderPage
                title="마이페이지"
                description="내 기록과 기본 프로필 정보를 한곳에서 확인할 수 있습니다."
              />
            }
          />
          <Route
            path="/feedback"
            element={
              <PlaceholderPage
                title="개발자 피드백"
                description="서비스 사용 중 느낀 점과 개선 의견을 전달할 수 있습니다."
              />
            }
          />
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
