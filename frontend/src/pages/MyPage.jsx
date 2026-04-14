import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteRecord, getMyProfile, getMyRecords, logout, updateRecordPenalty } from '../api.js'
import { useAuth } from '../context/useAuth.js'

const RECORDS_PAGE_SIZE = 10

function parseRecordTime(timeMs) {
  if (typeof timeMs !== 'number') {
    return '-'
  }

  const totalMilliseconds = Math.max(0, Math.floor(timeMs))
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const remainingMilliseconds = totalMilliseconds % 1000

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
  }

  return `${seconds}.${String(remainingMilliseconds).padStart(3, '0')}`
}

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

  return parseRecordTime(record.effectiveTimeMs ?? record.timeMs)
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
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingRecordId, setUpdatingRecordId] = useState(null)
  const [deletingRecordId, setDeletingRecordId] = useState(null)
  const { clearAccessToken, currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let isCancelled = false

    const loadProfile = async () => {
      setIsLoadingProfile(true)

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
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadRecords = async () => {
      setIsLoadingRecords(true)

      try {
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
  }, [currentPage])

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
    const [profileResponse, recordsResponse] = await Promise.all([
      getMyProfile(),
      getMyRecords({ page, size: RECORDS_PAGE_SIZE }),
    ])
    const nextRecordsPage = recordsResponse.data

    setProfileData(profileResponse.data)
    setProfileError(null)

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

  const records = recordsPage?.items ?? []
  const summary = profileData?.summary
  const nickname = profileData?.nickname ?? currentUser?.nickname ?? '-'
  const mainEvent = profileData?.mainEvent ?? '-'
  const totalPages = recordsPage?.totalPages ?? 0
  const pageLabel = totalPages > 0 ? `${currentPage} / ${totalPages}` : '1 / 1'

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
          <p className="message error">{profileError}</p>
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
              <span className="dashboard-summary-value pb-value">{parseRecordTime(summary?.personalBestTimeMs)}</span>
            </div>
            <div className="dashboard-summary-card">
              <span className="dashboard-summary-label">전체 평균</span>
              <span className="dashboard-summary-value">{parseRecordTime(summary?.averageTimeMs)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="panel mypage-records-panel">
        <div className="mypage-records-header">
          <h2>전체 기록</h2>
          <p className="helper-text">총 {recordsPage?.totalElements ?? 0}건</p>
        </div>

        {recordsError ? (
          <p className="message error">{recordsError}</p>
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

            <div className="mypage-pagination">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
              >
                이전
              </button>
              <span className="helper-text mypage-pagination-label">{pageLabel} 페이지</span>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setCurrentPage((page) => page + 1)}
                disabled={!recordsPage?.hasNext}
              >
                다음
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
