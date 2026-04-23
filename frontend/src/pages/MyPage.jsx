import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import {
  changeMyPassword,
  deleteRecord,
  getMyProfile,
  getMyRecords,
  logout,
  updateMyProfile,
  updateRecordPenalty,
} from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { INPUT_LIMITS, PASSWORD_MIN_LENGTH } from '../constants/inputLimits.js'
import { eventOptions } from '../constants/eventOptions.js'
import { useAuth } from '../context/useAuth.js'
import { buildTrendChartData, filterLatestRecordsByEvent, formatRecordTime } from '../utils/recordStats.js'

const RECORDS_PAGE_SIZE = 10
const TREND_FETCH_SIZE = 100
const TREND_RECORD_LIMIT = 30
const DEFAULT_MAIN_EVENT = eventOptions[0]?.value ?? ''
const ACCOUNT_TABS = [
  { key: 'profile', label: '프로필 수정' },
  { key: 'password', label: '비밀번호 변경' },
]

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

function buildFirstPageFromRecentRecords(sourcePage) {
  const totalElements = sourcePage?.totalElements ?? 0
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / RECORDS_PAGE_SIZE)

  return {
    items: sourcePage?.items?.slice(0, RECORDS_PAGE_SIZE) ?? [],
    page: 1,
    size: RECORDS_PAGE_SIZE,
    totalElements,
    totalPages,
    hasNext: totalPages > 1,
    hasPrevious: false,
  }
}

export default function MyPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState(ACCOUNT_TABS[0].key)
  const [profileData, setProfileData] = useState(null)
  const [profileForm, setProfileForm] = useState({
    nickname: '',
    mainEvent: DEFAULT_MAIN_EVENT,
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    passwordConfirm: '',
  })
  const [recordsPage, setRecordsPage] = useState(null)
  const [trendRecords, setTrendRecords] = useState([])
  const [profileError, setProfileError] = useState(null)
  const [profileFormError, setProfileFormError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)
  const [trendError, setTrendError] = useState(null)
  const [passwordFormError, setPasswordFormError] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingTrend, setIsLoadingTrend] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingRecordId, setUpdatingRecordId] = useState(null)
  const [deletingRecordId, setDeletingRecordId] = useState(null)
  const [recentRecordsSource, setRecentRecordsSource] = useState(null)
  const [recentRecordsSourceError, setRecentRecordsSourceError] = useState(null)
  const [isLoadingRecentRecordsSource, setIsLoadingRecentRecordsSource] = useState(true)
  const [profileReloadKey, setProfileReloadKey] = useState(0)
  const [recordsReloadKey, setRecordsReloadKey] = useState(0)
  const { clearAccessToken, currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()
  const mainEventRecordType = useMemo(
    () => resolveEventType(profileData?.mainEvent),
    [profileData?.mainEvent],
  )
  const trendChartData = useMemo(() => buildTrendChartData(trendRecords), [trendRecords])
  const hasTrendChartData = trendChartData.some((point) => typeof point.value === 'number')

  useEffect(() => {
    if (!profileData) {
      return
    }

    setProfileForm({
      nickname: profileData.nickname ?? '',
      mainEvent: resolveEventType(profileData.mainEvent) ?? DEFAULT_MAIN_EVENT,
    })
  }, [profileData])

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

    const loadRecentRecordsSource = async () => {
      setIsLoadingRecentRecordsSource(true)
      setRecentRecordsSourceError(null)

      try {
        const response = await getMyRecords({ page: 1, size: TREND_FETCH_SIZE })

        if (isCancelled) {
          return
        }

        setRecentRecordsSource(response.data)
        setRecentRecordsSourceError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setRecentRecordsSource(null)
        setRecentRecordsSourceError(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoadingRecentRecordsSource(false)
        }
      }
    }

    loadRecentRecordsSource()

    return () => {
      isCancelled = true
    }
  }, [recordsReloadKey])

  useEffect(() => {
    if (currentPage === 1) {
      setIsLoadingRecords(isLoadingRecentRecordsSource)

      if (isLoadingRecentRecordsSource) {
        return
      }

      if (recentRecordsSourceError) {
        setRecordsPage(null)
        setRecordsError(recentRecordsSourceError)
        return
      }

      if (recentRecordsSource) {
        setRecordsPage(buildFirstPageFromRecentRecords(recentRecordsSource))
        setRecordsError(null)
      }

      return
    }

    let isCancelled = false

    const loadRecordsPage = async () => {
      setIsLoadingRecords(true)
      setRecordsError(null)

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

    loadRecordsPage()

    return () => {
      isCancelled = true
    }
  }, [currentPage, isLoadingRecentRecordsSource, recentRecordsSource, recentRecordsSourceError])

  useEffect(() => {
    if (!mainEventRecordType) {
      setTrendRecords([])
      setTrendError(null)
      setIsLoadingTrend(false)
      return
    }

    setIsLoadingTrend(isLoadingRecentRecordsSource)

    if (isLoadingRecentRecordsSource) {
      return
    }

    if (recentRecordsSourceError) {
      setTrendRecords([])
      setTrendError(recentRecordsSourceError)
      return
    }

    if (!recentRecordsSource) {
      setTrendRecords([])
      setTrendError(null)
      setIsLoadingTrend(false)
      return
    }

    setTrendRecords(
      filterLatestRecordsByEvent(recentRecordsSource.items, mainEventRecordType, TREND_RECORD_LIMIT),
    )
    setTrendError(null)
    setIsLoadingTrend(false)
  }, [mainEventRecordType, recentRecordsSource, recentRecordsSourceError, isLoadingRecentRecordsSource])

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
    const [profileResponse, recentRecordsResponse, recordsResponse] = await Promise.all([
      getMyProfile(),
      getMyRecords({ page: 1, size: TREND_FETCH_SIZE }),
      page > 1 ? getMyRecords({ page, size: RECORDS_PAGE_SIZE }) : Promise.resolve(null),
    ])
    const nextRecentRecordsSource = recentRecordsResponse.data
    const nextRecordsPage = page > 1 ? recordsResponse.data : buildFirstPageFromRecentRecords(nextRecentRecordsSource)
    const nextProfileData = profileResponse.data
    const nextMainEventRecordType = resolveEventType(nextProfileData.mainEvent)

    setProfileData(nextProfileData)
    setProfileError(null)
    setRecentRecordsSource(nextRecentRecordsSource)
    setRecentRecordsSourceError(null)
    setTrendRecords(
      filterLatestRecordsByEvent(nextRecentRecordsSource.items, nextMainEventRecordType, TREND_RECORD_LIMIT),
    )
    setTrendError(null)

    if (page > 1) {
      const normalizedPage = nextRecordsPage.totalPages > 0 ? Math.min(page, nextRecordsPage.totalPages) : 1

      if (normalizedPage !== page) {
        setCurrentPage(normalizedPage)
        return nextProfileData
      }
    }

    setRecordsPage(nextRecordsPage)
    setRecordsError(null)
    return nextProfileData
  }

  const handleUpdateRecordPenalty = async (recordId, penalty) => {
    setUpdatingRecordId(recordId)

    try {
      const response = await updateRecordPenalty(recordId, { penalty })
      await syncProfileAndRecords(currentPage)
      toast.success(response.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUpdatingRecordId(null)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) {
      return
    }

    setDeletingRecordId(recordId)

    try {
      const response = await deleteRecord(recordId)
      await syncProfileAndRecords(currentPage)
      toast.success(response.message)
    } catch (error) {
      toast.error(error.message)
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

  const handleOpenAccountModal = (tabKey = ACCOUNT_TABS[0].key) => {
    setActiveAccountTab(tabKey)
    setProfileFormError(null)
    setPasswordFormError(null)
    setIsAccountModalOpen(true)
  }

  const handleCloseAccountModal = () => {
    setIsAccountModalOpen(false)
    setProfileFormError(null)
    setPasswordFormError(null)
  }

  const handleProfileFieldChange = (field) => (event) => {
    setProfileForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
    setProfileFormError(null)
  }

  const handlePasswordFieldChange = (field) => (event) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
    setPasswordFormError(null)
  }

  const handleUpdateProfile = async (event) => {
    event.preventDefault()

    const nickname = profileForm.nickname.trim()

    if (!nickname || !profileForm.mainEvent) {
      setProfileFormError('닉네임과 주 종목을 모두 입력해주세요.')
      return
    }

    setIsSavingProfile(true)
    setProfileFormError(null)

    try {
      const response = await updateMyProfile({
        nickname,
        mainEvent: profileForm.mainEvent,
      })
      const nextProfileData = await syncProfileAndRecords(currentPage)
      updateCurrentUser({ nickname: nextProfileData.nickname })

      handleCloseAccountModal()
      toast.success(response.message)
    } catch (error) {
      setProfileFormError(error.message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.passwordConfirm) {
      setPasswordFormError('모든 입력란을 채워주세요.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.passwordConfirm) {
      setPasswordFormError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setIsChangingPassword(true)
    setPasswordFormError(null)

    try {
      const response = await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        passwordConfirm: '',
      })
      clearAccessToken()
      navigate('/login', {
        replace: true,
        state: {
          notice: response.message,
          email: currentUser?.email ?? '',
        },
      })
    } catch (error) {
      setPasswordFormError(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const records = recordsPage?.items ?? []
  const summary = profileData?.summary
  const nickname = profileData?.nickname ?? currentUser?.nickname ?? '-'
  const mainEvent = getEventLabel(profileData?.mainEvent)
  const totalPages = recordsPage?.totalPages ?? 0

  return (
    <section className="page-grid mypage">
      <div className="panel mypage-profile-panel">
        <div className="mypage-profile-header">
          <h2>내 정보</h2>
          <div className="mypage-profile-actions">
            <button
              className="secondary-button mypage-account-trigger"
              type="button"
              onClick={() => handleOpenAccountModal()}
              disabled={isLoadingProfile || isSavingProfile || isChangingPassword}
            >
              계정 관리
            </button>
            <button className="ghost-button mypage-logout" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
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
          <p className="helper-text">아직 저장된 기록이 없습니다.</p>
        ) : (
          <>
            <div className="record-table-wrap">
              <table className="record-table responsive-card-table mypage-records-table">
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
                        <td data-label="종목">{record.eventType.replace('WCA_', '')}</td>
                        <td data-label="기록" className="record-table-cell-primary">{getDisplayRecordTime(record)}</td>
                        <td data-label="페널티">{getPenaltyLabel(record.penalty)}</td>
                        <td data-label="기록 일시">{formatDateTime(record.createdAt)}</td>
                        <td data-label="관리" className="record-table-cell-actions">
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

      {isAccountModalOpen ? (
        <div
          className="mypage-modal-backdrop"
          role="presentation"
          onClick={handleCloseAccountModal}
        >
          <div
            className="mypage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mypage-account-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mypage-modal-header">
              <div>
                <p className="eyebrow">Account</p>
                <h2 id="mypage-account-modal-title">계정 관리</h2>
                <p className="helper-text">프로필과 비밀번호를 변경할 수 있습니다.</p>
              </div>
              <button className="ghost-button" type="button" onClick={handleCloseAccountModal}>
                닫기
              </button>
            </div>

            <div className="mypage-modal-tabs" role="tablist" aria-label="계정 관리 탭">
              {ACCOUNT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  id={`mypage-account-tab-${tab.key}`}
                  className={tab.key === activeAccountTab ? 'primary-button mypage-modal-tab' : 'ghost-button mypage-modal-tab'}
                  type="button"
                  role="tab"
                  aria-selected={tab.key === activeAccountTab}
                  aria-controls={`mypage-account-panel-${tab.key}`}
                  onClick={() => setActiveAccountTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeAccountTab === 'profile' ? (
              <div
                id="mypage-account-panel-profile"
                className="mypage-modal-panel"
                role="tabpanel"
                aria-labelledby="mypage-account-tab-profile"
              >
                <div className="mypage-modal-section">
                  <h3>프로필 수정</h3>
                  <p className="helper-text">닉네임과 주 종목을 변경하면 헤더와 마이페이지에 바로 반영됩니다.</p>
                </div>
                {profileFormError ? <p className="message error">{profileFormError}</p> : null}
                <form className="form-grid mypage-account-form" onSubmit={handleUpdateProfile}>
                  <div className="field">
                    <label htmlFor="mypage-nickname">닉네임</label>
                    <input
                      type="text"
                      id="mypage-nickname"
                      value={profileForm.nickname}
                      onChange={handleProfileFieldChange('nickname')}
                      placeholder="사용할 닉네임을 입력하세요"
                      maxLength={INPUT_LIMITS.nickname}
                      required
                      disabled={isLoadingProfile || isSavingProfile || isChangingPassword}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="mypage-main-event">주 종목</label>
                    <select
                      id="mypage-main-event"
                      value={profileForm.mainEvent}
                      onChange={handleProfileFieldChange('mainEvent')}
                      disabled={isLoadingProfile || isSavingProfile || isChangingPassword}
                    >
                      {eventOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mypage-account-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={isLoadingProfile || isSavingProfile || isChangingPassword}
                    >
                      {isSavingProfile ? '저장 중...' : '프로필 저장'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div
                id="mypage-account-panel-password"
                className="mypage-modal-panel"
                role="tabpanel"
                aria-labelledby="mypage-account-tab-password"
              >
                <div className="mypage-modal-section">
                  <h3>비밀번호 변경</h3>
                  <p className="helper-text">변경 후 자동으로 로그아웃되며, 새 비밀번호로 다시 로그인해야 합니다.</p>
                </div>
                {passwordFormError ? <p className="message error">{passwordFormError}</p> : null}
                <form className="form-grid mypage-account-form" onSubmit={handleChangePassword}>
                  <div className="field">
                    <label htmlFor="mypage-current-password">현재 비밀번호</label>
                    <input
                      type="password"
                      id="mypage-current-password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange('currentPassword')}
                      placeholder="현재 비밀번호를 입력하세요"
                      maxLength={INPUT_LIMITS.password}
                      required
                      disabled={isChangingPassword || isSavingProfile}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="mypage-new-password">새 비밀번호</label>
                    <input
                      type="password"
                      id="mypage-new-password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordFieldChange('newPassword')}
                      placeholder="새 비밀번호를 입력하세요"
                      minLength={PASSWORD_MIN_LENGTH}
                      maxLength={INPUT_LIMITS.password}
                      required
                      disabled={isChangingPassword || isSavingProfile}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="mypage-password-confirm">새 비밀번호 확인</label>
                    <input
                      type="password"
                      id="mypage-password-confirm"
                      value={passwordForm.passwordConfirm}
                      onChange={handlePasswordFieldChange('passwordConfirm')}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      minLength={PASSWORD_MIN_LENGTH}
                      maxLength={INPUT_LIMITS.password}
                      required
                      disabled={isChangingPassword || isSavingProfile}
                    />
                  </div>
                  <div className="mypage-account-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={isChangingPassword || isSavingProfile}
                    >
                      {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : null}
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

function getEventLabel(mainEvent) {
  if (!mainEvent) {
    return '-'
  }

  const matchedOption = eventOptions.find(
    (option) => option.value === mainEvent || option.label === mainEvent,
  )

  return matchedOption?.label ?? mainEvent
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
