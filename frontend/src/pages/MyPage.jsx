import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { deleteRecord, getMyProfile, getMyRecords, logout, updateRecordPenalty } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { eventOptions } from '../constants/eventOptions.js'
import { useAuth } from '../context/useAuth.js'
import { buildTrendChartData, filterLatestRecordsByEvent, formatRecordTime } from '../utils/recordStats.js'

const RECORDS_PAGE_SIZE = 10
const TREND_FETCH_SIZE = 100
const TREND_RECORD_LIMIT = 30

function getPenaltyLabel(penalty) {
  if (penalty === 'PLUS_TWO') {
    return '+2'
  }

  if (penalty === 'DNF') {
    return 'DNF'
  }

  return '-'
}

function getDisplayRecordTime(record) {
  if (record.penalty === 'DNF') {
    return 'DNF'
  }

  return formatRecordTime(record.effectiveTimeMs ?? record.timeMs)
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').slice(0, 16)
}

export default function MyPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [recordsPage, setRecordsPage] = useState(null)
  const [trendRecords, setTrendRecords] = useState([])
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)
  const [trendError, setTrendError] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingTrend, setIsLoadingTrend] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingRecordId, setUpdatingRecordId] = useState(null)
  const [deletingRecordId, setDeletingRecordId] = useState(null)
  const [profileReloadKey, setProfileReloadKey] = useState(0)
  const [recordsReloadKey, setRecordsReloadKey] = useState(0)
  const { clearAccessToken, currentUser } = useAuth()
  const navigate = useNavigate()
  const mainEventRecordType = useMemo(
    () => resolveEventType(profileData?.mainEvent),
    [profileData?.mainEvent],
  )
  const trendChartData = useMemo(() => buildTrendChartData(trendRecords), [trendRecords])
  const hasTrendChartData = trendChartData.some((point) => typeof point.value === 'number')

  useEffect(() => {
    let isCancelled = false

    const loadProfile = async () => {
      setIsLoadingProfile(true)
      setProfileError(null)

      try {
        const response = await getMyProfile()

        if (isCancelled) {
          return
        }

        setProfileData(response.data)
        setProfileError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setProfileError(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      isCancelled = true
    }
  }, [profileReloadKey])

  useEffect(() => {
    let isCancelled = false

    const loadRecords = async () => {
      setIsLoadingRecords(true)

      try {
        setRecordsError(null)

        const response = await getMyRecords({ page: currentPage, size: RECORDS_PAGE_SIZE })

        if (isCancelled) {
          return
        }

        const nextPage = response.data
        const normalizedPage = nextPage.totalPages > 0 ? Math.min(currentPage, nextPage.totalPages) : 1

        if (normalizedPage !== currentPage) {
          setCurrentPage(normalizedPage)
          return
        }

        setRecordsPage(nextPage)
        setRecordsError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setRecordsError(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoadingRecords(false)
        }
      }
    }

    loadRecords()

    return () => {
      isCancelled = true
    }
  }, [currentPage, recordsReloadKey])

  useEffect(() => {
    if (!mainEventRecordType) {
      setTrendRecords([])
      setTrendError(null)
      setIsLoadingTrend(false)
      return
    }

    let isCancelled = false

    const loadTrendRecords = async () => {
      setIsLoadingTrend(true)
      setTrendError(null)

      try {
        const response = await getMyRecords({ page: 1, size: TREND_FETCH_SIZE })

        if (isCancelled) {
          return
        }

        setTrendRecords(
          filterLatestRecordsByEvent(response.data.items, mainEventRecordType, TREND_RECORD_LIMIT),
        )
        setTrendError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setTrendRecords([])
        setTrendError(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoadingTrend(false)
        }
      }
    }

    loadTrendRecords()

    return () => {
      isCancelled = true
    }
  }, [mainEventRecordType, recordsReloadKey])

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

  const syncProfileAndRecords = async (page) => {
    const [profileResponse, recordsResponse, trendResponse] = await Promise.all([
      getMyProfile(),
      getMyRecords({ page, size: RECORDS_PAGE_SIZE }),
      getMyRecords({ page: 1, size: TREND_FETCH_SIZE }),
    ])
    const nextRecordsPage = recordsResponse.data
    const nextProfileData = profileResponse.data
    const nextMainEventRecordType = resolveEventType(nextProfileData.mainEvent)

    setProfileData(nextProfileData)
    setProfileError(null)
    setTrendRecords(
      filterLatestRecordsByEvent(trendResponse.data.items, nextMainEventRecordType, TREND_RECORD_LIMIT),
    )
    setTrendError(null)

    if (page > 1) {
      const normalizedPage = nextRecordsPage.totalPages > 0 ? Math.min(page, nextRecordsPage.totalPages) : 1

      if (normalizedPage !== page) {
        setCurrentPage(normalizedPage)
        return
      }
    }

    setRecordsPage(nextRecordsPage)
    setRecordsError(null)
  }

  const handleUpdateRecordPenalty = async (recordId, penalty) => {
    setUpdatingRecordId(recordId)
    setFeedbackMessage(null)

    try {
      const response = await updateRecordPenalty(recordId, { penalty })
      await syncProfileAndRecords(currentPage)
      setFeedbackMessage({ type: 'success', text: response.message })
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: error.message })
    } finally {
      setUpdatingRecordId(null)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) {
      return
    }

    setDeletingRecordId(recordId)
    setFeedbackMessage(null)

    try {
      const response = await deleteRecord(recordId)
      await syncProfileAndRecords(currentPage)
      setFeedbackMessage({ type: 'success', text: response.message })
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: error.message })
    } finally {
      setDeletingRecordId(null)
    }
  }

  const handleRetryProfile = () => {
    setProfileReloadKey((current) => current + 1)
  }

  const handleRetryRecords = () => {
    setRecordsReloadKey((current) => current + 1)
  }

  const records = recordsPage?.items ?? []
  const summary = profileData?.summary
  const nickname = profileData?.nickname ?? currentUser?.nickname ?? '-'
  const mainEvent = profileData?.mainEvent ?? '-'
  const totalPages = recordsPage?.totalPages ?? 0

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
            <strong>{nickname}</strong>
          </p>
          <p className="mypage-info-item">
            <span className="mypage-info-label">주 종목</span>
            <strong>{mainEvent}</strong>
          </p>
        </div>
      </div>

      <div className="panel mypage-dashboard-panel">
        <h2>기록 요약</h2>
        {feedbackMessage ? <p className={`message ${feedbackMessage.type}`}>{feedbackMessage.text}</p> : null}
        {profileError ? (
          <>
            <p className="message error">{profileError}</p>
            <button className="ghost-button" type="button" onClick={handleRetryProfile}>
              다시 시도
            </button>
          </>
        ) : isLoadingProfile ? (
          <p className="helper-text">마이페이지 요약을 불러오는 중입니다.</p>
        ) : (
          <div className="dashboard-summary-grid">
            <div className="dashboard-summary-card">
              <span className="dashboard-summary-label">전체 기록 수</span>
              <span className="dashboard-summary-value">{summary?.totalSolveCount ?? 0} 회</span>
            </div>
            <div className="dashboard-summary-card">
              <span className="dashboard-summary-label">최고 기록 (PB)</span>
              <span className="dashboard-summary-value pb-value">{formatRecordTime(summary?.personalBestTimeMs)}</span>
            </div>
            <div className="dashboard-summary-card">
              <span className="dashboard-summary-label">전체 평균</span>
              <span className="dashboard-summary-value">{formatRecordTime(summary?.averageTimeMs)}</span>
            </div>
          </div>
        )}

        <div className="mypage-trend-panel">
          <div className="mypage-trend-header">
            <div>
              <h3>기록 추세</h3>
              <p className="helper-text">{`${mainEvent} 최근 ${trendRecords.length}개 기준`}</p>
            </div>
          </div>
          {trendError ? (
            <>
              <p className="message error">{trendError}</p>
              <button className="ghost-button" type="button" onClick={handleRetryRecords}>
                다시 시도
              </button>
            </>
          ) : isLoadingTrend ? (
            <p className="helper-text">기록 그래프를 불러오는 중입니다.</p>
          ) : trendRecords.length === 0 ? (
            <p className="helper-text">아직 그래프로 표시할 주 종목 기록이 없습니다.</p>
          ) : !hasTrendChartData ? (
            <p className="helper-text">최근 기록이 모두 DNF라 그래프를 그릴 수 없습니다.</p>
          ) : (
            <div className="mypage-trend-chart" aria-label="기록 추세 그래프">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendChartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(18, 32, 43, 0.12)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => formatRecordTime(value)} tickLine={false} axisLine={false} width={64} />
                  <Tooltip content={<RecordTrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#ff6b35"
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 0, fill: '#ff6b35' }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="panel mypage-records-panel">
        <div className="mypage-records-header">
          <h2>전체 기록</h2>
          <p className="helper-text">총 {recordsPage?.totalElements ?? 0}건</p>
        </div>

        {recordsError ? (
          <>
            <p className="message error">{recordsError}</p>
            <button className="ghost-button" type="button" onClick={handleRetryRecords}>
              다시 시도
            </button>
          </>
        ) : isLoadingRecords ? (
          <p className="helper-text">마이페이지 기록을 불러오는 중입니다.</p>
        ) : records.length === 0 ? (
          <p className="helper-text">아직 작성된 기록이 없습니다.</p>
        ) : (
          <>
            <div className="record-table-wrap">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>기록 (초)</th>
                    <th>페널티</th>
                    <th>기록 일시</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const isUpdating = updatingRecordId === record.id
                    const isDeleting = deletingRecordId === record.id
                    const isMutating = isUpdating || isDeleting

                    return (
                      <tr key={record.id}>
                        <td>{record.eventType.replace('WCA_', '')}</td>
                        <td>{getDisplayRecordTime(record)}</td>
                        <td>{getPenaltyLabel(record.penalty)}</td>
                        <td>{formatDateTime(record.createdAt)}</td>
                        <td>
                          <div className="mypage-record-actions">
                            {['NONE', 'PLUS_TWO', 'DNF'].map((penalty) => (
                              <button
                                key={penalty}
                                className={record.penalty === penalty ? 'secondary-button mypage-penalty-button' : 'ghost-button mypage-penalty-button'}
                                type="button"
                                onClick={() => handleUpdateRecordPenalty(record.id, penalty)}
                                disabled={isMutating || record.penalty === penalty}
                              >
                                {penalty === 'NONE' ? '기본' : penalty === 'PLUS_TWO' ? '+2' : 'DNF'}
                              </button>
                            ))}
                            <button
                              className="ghost-button timer-delete-button"
                              type="button"
                              onClick={() => handleDeleteRecord(record.id)}
                              disabled={isMutating}
                            >
                              {isDeleting ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <GroupedPagination
              className="mypage-pagination"
              buttonClassName="mypage-page-button"
              currentPage={currentPage}
              totalPages={totalPages}
              hasPrevious={recordsPage?.hasPrevious ?? currentPage > 1}
              hasNext={recordsPage?.hasNext ?? false}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </section>
  )
}

function resolveEventType(mainEvent) {
  if (!mainEvent) {
    return null
  }

  const matchedOption = eventOptions.find(
    (option) => option.value === mainEvent || option.label === mainEvent,
  )

  return matchedOption?.value ?? mainEvent
}

function RecordTrendTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload

  return (
    <div className="mypage-trend-tooltip">
      <p className="mypage-trend-tooltip-time">{point.displayTime}</p>
      <p className="mypage-trend-tooltip-date">{formatDateTime(point.createdAt)}</p>
    </div>
  )
}
