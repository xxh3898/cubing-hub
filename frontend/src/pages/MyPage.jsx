import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { mockCurrentUser, mockDashboardSummary, mockRecentRecords } from '../constants/mockDashboard.js'



function parseRecordTime(timeMs) {
  const totalSeconds = timeMs / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toFixed(2)

  if (minutes > 0) {
    return `${minutes}:${seconds.padStart(5, '0')}`
  }
  return seconds
}

export default function MyPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { clearAccessToken, currentUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logout()
    } catch (error) {
      window.alert(`${error.message}\n로컬 세션은 정리됩니다.`)
    } finally {
      setIsLoggingOut(false)
      clearAccessToken()
      navigate('/', { replace: true })
    }
  }

  return (
    <section className="page-grid mypage">
      <div className="panel mypage-profile-panel">
        <div className="mypage-profile-header">
          <h2>내 정보</h2>
          <button className="ghost-button mypage-logout" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>
        
        <div className="mypage-info">
          <p className="mypage-info-item">
            <span className="mypage-info-label">닉네임</span>
            <strong>{currentUser?.nickname ?? mockCurrentUser.nickname}</strong>
          </p>
          <p className="mypage-info-item">
            <span className="mypage-info-label">주 종목</span>
            <strong>{mockCurrentUser.mainEvent.replace('WCA_', '')}</strong>
          </p>
        </div>
      </div>

      <div className="panel mypage-dashboard-panel">
        <h2>기록 요약</h2>
        <div className="dashboard-summary-grid">
          <div className="dashboard-summary-card">
            <span className="dashboard-summary-label">전체 기록 수</span>
            <span className="dashboard-summary-value">{mockDashboardSummary.solveCount.total} 회</span>
          </div>
          <div className="dashboard-summary-card">
            <span className="dashboard-summary-label">최고 기록 (PB)</span>
            <span className="dashboard-summary-value pb-value">{parseRecordTime(mockDashboardSummary.personalBest.timeMs)}</span>
          </div>
          <div className="dashboard-summary-card">
            <span className="dashboard-summary-label">전체 평균</span>
            <span className="dashboard-summary-value">{parseRecordTime(mockDashboardSummary.average.timeMs)}</span>
          </div>
        </div>
      </div>

      <div className="panel mypage-records-panel">
        <div className="mypage-records-header">
          <h2>전체 기록</h2>
        </div>
        
        {mockRecentRecords.length === 0 ? (
          <p className="helper-text">아직 작성된 기록이 없습니다.</p>
        ) : (
          <div className="record-table-wrap">
            <table className="record-table">
              <thead>
                <tr>
                  <th>종목</th>
                  <th>기록 (초)</th>
                  <th>페널티</th>
                  <th>작성 일시</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.eventType.replace('WCA_', '')}</td>
                    <td>{parseRecordTime(record.timeMs)}</td>
                    <td>{record.penalty === 'NONE' ? '-' : record.penalty}</td>
                    <td>{record.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
