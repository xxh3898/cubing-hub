import { NavLink } from 'react-router-dom'
import {
  mockCurrentUser,
  mockDashboardSummary,
  mockRecentRecords,
} from '../constants/mockDashboard.js'
import { formatTimeMs } from '../utils/formatTime.js'

function formatEventLabel(eventType) {
  if (eventType === 'WCA_333') {
    return '3x3x3'
  }

  return eventType
}

function DashboardCard({ label, value, detail }) {
  return (
    <article className="dashboard-card">
      <p className="dashboard-card-label">{label}</p>
      <strong className="dashboard-card-value">{value}</strong>
      {detail ? <p className="dashboard-card-detail">{detail}</p> : null}
    </article>
  )
}

function formatRecordDate(value) {
  const [date, time] = value.split(' ')
  const [year, month, day] = date.split('-')
  const [rawHour, rawMinute] = time.split(':')
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12

  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일 ${period} ${displayHour}시 ${minute}분`
}

function formatDateOnly(value) {
  const [year, month, day] = value.split('-')

  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`
}

export default function HomePage() {
  const { todayScramble, solveCount, personalBest, average } = mockDashboardSummary

  return (
    <section className="page-grid home-page">
      <div className="panel home-scramble-panel">
        <div className="home-scramble-copy">
          <p className="eyebrow">오늘의 스크램블</p>
          <h2>{formatEventLabel(todayScramble.eventType)}</h2>
          <p className="home-scramble-text">{todayScramble.scramble}</p>
        </div>
        <div className="home-scramble-actions">
          <p className="helper-text">오늘 첫 솔브를 바로 시작하거나 최근 기록 흐름을 이어서 확인할 수 있습니다.</p>
          <NavLink className="primary-button home-action-link" to="/timer">
            타이머로 이동
          </NavLink>
        </div>
      </div>

      <div className="panel">
        <div className="dashboard-grid">
          <DashboardCard
            label="프로필"
            value={mockCurrentUser.nickname}
            detail={`주종목 ${formatEventLabel(mockCurrentUser.mainEvent)}`}
          />
          <DashboardCard
            label="솔빙 횟수"
            value={`${solveCount.total}회`}
            detail={`오늘 ${solveCount.daily}회 · 이번 달 ${solveCount.monthly}회`}
          />
          <DashboardCard
            label="PB"
            value={formatTimeMs(personalBest.timeMs)}
            detail={formatDateOnly(personalBest.achievedAt)}
          />
          <DashboardCard
            label="전체 평균"
            value={formatTimeMs(average.timeMs)}
            detail={`총 ${average.sampleSize}회`}
          />
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h3>최근 기록</h3>
          </div>
          <NavLink className="ghost-button home-record-link" to="/mypage">
            전체 기록 보기
          </NavLink>
        </div>

        <div className="record-table-wrap">
          <table className="record-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>기록</th>
                <th>스크램블</th>
                <th>종목</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatRecordDate(record.createdAt)}</td>
                  <td>{formatTimeMs(record.timeMs)}</td>
                  <td className="record-table-scramble">{record.scramble}</td>
                  <td>{formatEventLabel(record.eventType)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
