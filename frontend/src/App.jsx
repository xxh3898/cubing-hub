import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import TimerPage from './pages/TimerPage.jsx'
import { mockCurrentUser, mockDashboardSummary } from './constants/mockDashboard.js'
import { mockLearningTabs } from './constants/mockLearning.js'
import { mockRankingPages } from './constants/mockRankings.js'
import { formatTimeMs } from './utils/formatTime.js'

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

function AppHomeSkeleton() {
  return (
    <PlaceholderPage
      title="홈"
      description="오늘의 스크램블과 개인 기록 요약을 빠르게 확인할 수 있는 대시보드입니다."
      metaItems={[
        { label: '오늘의 스크램블', value: mockDashboardSummary.todayScramble.eventType },
        { label: '총 솔빙 횟수', value: String(mockDashboardSummary.solveCount.total) },
        { label: 'PB', value: formatTimeMs(mockDashboardSummary.personalBest.timeMs) },
        { label: '전체 평균', value: formatTimeMs(mockDashboardSummary.average.timeMs) },
      ]}
    />
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
          <Route path="/" element={<AppHomeSkeleton />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route
            path="/rankings"
            element={
              <PlaceholderPage
                title="랭킹"
                description="종목별 기록을 빠르게 비교할 수 있는 랭킹 보드입니다."
                metaItems={[
                  { label: '페이지 크기', value: `${mockRankingPages.pageSize}개` },
                  { label: '총 샘플 수', value: `${mockRankingPages.totalCount}개` },
                ]}
              />
            }
          />
          <Route
            path="/learning"
            element={
              <PlaceholderPage
                title="학습"
                description="F2L, OLL, PLL 케이스를 이미지와 회전기호로 정리한 학습 라이브러리입니다."
                metaItems={mockLearningTabs.map((tab) => ({
                  label: tab.label,
                  value: `${tab.itemCount} cases`,
                }))}
              />
            }
          />
          <Route
            path="/community"
            element={
              <PlaceholderPage
                title="커뮤니티"
                description="게시글을 목록으로 확인하고 주제별로 탐색할 수 있는 커뮤니티 보드입니다."
              />
            }
          />
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
