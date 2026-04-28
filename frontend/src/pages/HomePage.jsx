/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Clock3,
  Gauge,
  MessageCircle,
  TimerReset,
  Trophy,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getHome } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { formatSeoulDateOnly, formatSeoulDateTimeWithPeriod } from '../utils/dateTime.js'
import { formatTimeMs } from '../utils/formatTime.js'

export function formatEventLabel(eventType) {
  if (eventType === 'WCA_333') {
    return '3x3x3'
  }

  return eventType
}

export function formatPostCategoryLabel(category) {
  if (category === 'NOTICE') {
    return '공지'
  }

  if (category === 'FREE') {
    return '자유'
  }

  return category
}

export function DashboardCard({ label, value, detail, icon: Icon, tone = 'default' }) {
  return (
    <article className={`dashboard-card dashboard-card-${tone}`}>
      {Icon ? (
        <span className="dashboard-card-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      ) : null}
      <p className="dashboard-card-label">{label}</p>
      <strong className="dashboard-card-value">{value}</strong>
      {detail ? <p className="dashboard-card-detail">{detail}</p> : null}
    </article>
  )
}

export function formatDateTime(value) {
  return formatSeoulDateTimeWithPeriod(value)
}

export function formatDateOnly(value) {
  return formatSeoulDateOnly(value)
}

export function formatNullableTime(timeMs) {
  if (typeof timeMs !== 'number') {
    return '-'
  }

  return formatTimeMs(timeMs)
}

export function formatRecordTime(record) {
  if (!record) {
    return '-'
  }

  if (record.penalty === 'DNF') {
    return 'DNF'
  }

  return formatNullableTime(record.effectiveTimeMs ?? record.timeMs)
}

function GuestLanding() {
  return (
    <div className="home-guest-panel">
      <div className="section-heading">
        <div>
          <h3>큐빙 허브 시작하기</h3>
          <p className="helper-text">로그인하면 기록 요약, 최근 솔브, 커뮤니티 활동을 한 화면에서 바로 확인할 수 있습니다.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <DashboardCard
          label="실시간 타이머"
          value="스크램블과 기록 저장"
          detail="3x3 기준 스크램블 조회와 기록 저장 흐름을 바로 이어갈 수 있습니다."
          icon={TimerReset}
          tone="primary"
        />
        <DashboardCard
          label="커뮤니티"
          value="팁과 공지 확인"
          detail="연습 팁, 공지, 자유글을 최신순으로 확인하고 직접 글을 남길 수 있습니다."
          icon={MessageCircle}
        />
        <DashboardCard
          label="랭킹"
          value="전체 기록 비교"
          detail="종목별 글로벌 랭킹을 보고 닉네임 검색과 페이지 이동을 할 수 있습니다."
          icon={Trophy}
          tone="accent"
        />
        <DashboardCard
          label="내 기록"
          value="로그인 후 기록 요약 확인"
          detail="PB, 평균, 최근 기록 5건을 로그인 후 바로 확인할 수 있습니다."
          icon={Gauge}
        />
      </div>

      <div className="home-guest-actions">
        <NavLink className="primary-button" to="/login">
          로그인
        </NavLink>
        <NavLink className="ghost-button" to="/signup">
          회원가입
        </NavLink>
      </div>
    </div>
  )
}

function RecentPostsSection({ recentPosts }) {
  return (
    <div className="panel">
      <div className="section-heading">
        <div>
          <h3>최신 커뮤니티 글</h3>
          <p className="helper-text">최근 올라온 게시글 3건을 먼저 확인할 수 있습니다.</p>
        </div>
        <NavLink className="ghost-button" to="/community">
          전체 게시글 보기
        </NavLink>
      </div>

      {recentPosts.length === 0 ? (
        <p className="helper-text home-empty-state">아직 게시글이 없습니다. 첫 글을 남겨보세요.</p>
      ) : (
        <div className="home-post-list">
          {recentPosts.map((post) => (
            <NavLink key={post.id} className="home-post-card" to={`/community/${post.id}`}>
              <span className="home-post-category">{formatPostCategoryLabel(post.category)}</span>
              <strong>{post.title}</strong>
              <p className="home-post-meta">
                {post.authorNickname} · {formatDateOnly(post.createdAt)}
              </p>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const [homeData, setHomeData] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retrySeed, setRetrySeed] = useState(0)
  const { isAuthenticated, isAuthLoading } = useAuth()

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    let isCancelled = false

    const loadHome = async () => {
      setIsLoading(true)

      try {
        const response = await getHome()

        if (isCancelled) {
          return
        }

        setHomeData(response.data)
        setErrorMessage(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadHome()

    return () => {
      isCancelled = true
    }
  }, [isAuthLoading, isAuthenticated, retrySeed])

  const handleRetry = () => {
    setRetrySeed((current) => current + 1)
  }

  if (isAuthLoading || isLoading) {
    return (
      <section className="page-grid home-page">
        <div className="panel">
          <p className="helper-text">홈 화면을 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page-grid home-page">
        <div className="panel home-error-panel">
          <p className="message error">{errorMessage}</p>
          <button className="ghost-button" type="button" onClick={handleRetry}>
            다시 시도
          </button>
        </div>
      </section>
    )
  }

  const todayScramble = homeData?.todayScramble
  const summary = homeData?.summary
  const recentRecords = homeData?.recentRecords ?? []
  const recentPosts = homeData?.recentPosts ?? []
  const isGuestHome = !summary

  return (
    <section className="page-grid home-page">
      <div className="panel home-scramble-panel">
        <div className="home-scramble-copy">
          <p className="home-scramble-badge">
            오늘의 스크램블
          </p>
          <h2>{formatEventLabel(todayScramble?.eventType)}</h2>
          <p className="home-scramble-text">{todayScramble?.scramble ?? '-'}</p>
        </div>
        <div className="home-scramble-actions">
          <p className="helper-text">
            {isGuestHome
              ? '로그인하면 개인 기록 요약과 최근 기록까지 함께 확인할 수 있습니다.'
              : '오늘 첫 솔브를 바로 시작하거나 최근 기록 흐름을 이어서 확인할 수 있습니다.'}
          </p>
          <NavLink className="primary-button home-action-link" to="/timer">
            <TimerReset size={18} aria-hidden="true" />
            <span>타이머로 이동</span>
            <ArrowRight size={16} aria-hidden="true" />
          </NavLink>
        </div>
      </div>

      <div className="panel">
        {isGuestHome ? (
          <GuestLanding />
        ) : (
          <div className="dashboard-grid">
            <DashboardCard
              label="프로필"
              value={summary.nickname}
              detail={`주종목 ${summary.mainEvent}`}
              icon={UserRound}
            />
            <DashboardCard
              label="솔빙 횟수"
              value={`${summary.totalSolveCount}회`}
              detail="저장된 전체 기록 기준"
              icon={Clock3}
              tone="primary"
            />
            <DashboardCard
              label="PB"
              value={formatNullableTime(summary.personalBestTimeMs)}
              detail="유효 시간 기준 최고 기록"
              icon={Trophy}
              tone="accent"
            />
            <DashboardCard
              label="전체 평균"
              value={formatNullableTime(summary.averageTimeMs)}
              detail="DNF 제외 평균 기록"
              icon={Gauge}
            />
          </div>
        )}
      </div>

      {isGuestHome ? (
        <RecentPostsSection recentPosts={recentPosts} />
      ) : (
        <div className="panel">
          <div className="section-heading">
            <div>
              <h3>최근 기록</h3>
            </div>
            <NavLink className="ghost-button home-record-link" to="/mypage">
              전체 기록 보기
            </NavLink>
          </div>

          {recentRecords.length === 0 ? (
            <p className="helper-text home-empty-state">아직 저장된 기록이 없습니다. 첫 기록을 만들어보세요.</p>
          ) : (
            <div className="record-table-wrap">
              <table className="record-table responsive-card-table home-record-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>기록</th>
                    <th>스크램블</th>
                    <th>종목</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((record) => (
                    <tr key={record.id}>
                      <td data-label="날짜">{formatDateTime(record.createdAt)}</td>
                      <td data-label="기록" className="record-table-cell-primary">{formatRecordTime(record)}</td>
                      <td data-label="스크램블" className="record-table-scramble">{record.scramble}</td>
                      <td data-label="종목">{formatEventLabel(record.eventType)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
