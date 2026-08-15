/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, LineChart as ChartLine, LogOut, Settings, Timer, Trophy } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import {
  changeMyPassword,
  deleteRecord,
  getMyGrowth,
  getMyGrowthPbProgression,
  getMyGrowthTrend,
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
import { formatSeoulDateTime } from '../utils/dateTime.js'
import { formatRecordTime } from '../utils/recordStats.js'

const RECORDS_PAGE_SIZE = 10
const TREND_FETCH_SIZE = 100
const DEFAULT_MAIN_EVENT = eventOptions[0].value
const GROWTH_EVENT_TYPE = 'WCA_333'
const GROWTH_TREND_PERIOD = '30D'
const GROWTH_PB_PAGE_SIZE = 50
const CHART_LINE_COLOR = '#005da7'
const CHART_ACTIVE_DOT_COLOR = '#fd8b00'
const CHART_GRID_COLOR = 'rgba(193, 199, 211, 0.56)'
const ACCOUNT_TABS = [
  { key: 'profile', label: '프로필 수정' },
  { key: 'password', label: '비밀번호 변경' },
]

function getProfileInitial(nickname) {
  return nickname?.trim()?.charAt(0)?.toUpperCase() || '?'
}

export function getPenaltyLabel(penalty) {
  if (penalty === 'PLUS_TWO') {
    return '+2'
  }

  if (penalty === 'DNF') {
    return 'DNF'
  }

  return '-'
}

export function getDisplayRecordTime(record) {
  if (record.penalty === 'DNF') {
    return 'DNF'
  }

  return formatRecordTime(record.effectiveTimeMs ?? record.timeMs)
}

export function formatDateTime(value) {
  return formatSeoulDateTime(value)
}

export function formatTrendAxisTick(value) {
  return formatRecordTime(value)
}

export function formatGrowthMetric(status, valueMs) {
  if (status === 'DNF') {
    return 'DNF'
  }

  if (status === 'AVAILABLE' && typeof valueMs === 'number') {
    return formatRecordTime(valueMs)
  }

  if (status === 'INSUFFICIENT_DATA' || status === 'INSUFFICIENT_SAMPLE') {
    return '데이터 부족'
  }

  return '기록 없음'
}

export function formatGrowthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '-'
  }

  const [year, month, day] = value.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일`
}

export function getNextPracticeAction(summary) {
  const totalSolveCount = summary?.activity?.totalSolveCount ?? 0

  if (summary?.recentAo12?.status === 'AVAILABLE' && typeof summary.recentAo12.valueMs === 'number') {
    return `다음 12회에서 ${formatRecordTime(summary.recentAo12.valueMs)} 이하 만들기`
  }

  if (summary?.recentAo5?.status === 'AVAILABLE' && typeof summary.recentAo5.valueMs === 'number') {
    return '12회까지 기록 이어가기'
  }

  return totalSolveCount < 5 ? '첫 Ao5 만들기' : '12회까지 기록 이어가기'
}

export function getDirectionLabel(direction) {
  if (direction === 'FASTER') {
    return '빨라짐'
  }

  if (direction === 'SLOWER') {
    return '느려짐'
  }

  if (direction === 'UNCHANGED') {
    return '비슷함'
  }

  return '비교 데이터 부족'
}

export function buildFirstPageFromRecentRecords(sourcePage) {
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
  const [profileError, setProfileError] = useState(null)
  const [profileFormError, setProfileFormError] = useState(null)
  const [recordsError, setRecordsError] = useState(null)
  const [growthError, setGrowthError] = useState(null)
  const [passwordFormError, setPasswordFormError] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingGrowth, setIsLoadingGrowth] = useState(true)
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
  const [growthReloadKey, setGrowthReloadKey] = useState(0)
  const [growthSummary, setGrowthSummary] = useState(null)
  const [growthTrend, setGrowthTrend] = useState(null)
  const [pbProgression, setPbProgression] = useState(null)
  const [isLoadingMorePb, setIsLoadingMorePb] = useState(false)
  const { clearAccessToken, currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()
  const growthTrendPoints = useMemo(() => growthTrend?.points ?? [], [growthTrend])
  const hasGrowthTrendData = growthTrendPoints.some((point) => typeof point.medianTimeMs === 'number')

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
    let isCancelled = false

    const loadGrowth = async () => {
      setIsLoadingGrowth(true)
      setGrowthError(null)

      try {
        const [summaryResponse, trendResponse, progressionResponse] = await Promise.all([
          getMyGrowth({ eventType: GROWTH_EVENT_TYPE }),
          getMyGrowthTrend({ eventType: GROWTH_EVENT_TYPE, period: GROWTH_TREND_PERIOD }),
          getMyGrowthPbProgression({ eventType: GROWTH_EVENT_TYPE, page: 1, size: GROWTH_PB_PAGE_SIZE }),
        ])

        if (isCancelled) {
          return
        }

        setGrowthSummary(summaryResponse.data)
        setGrowthTrend(trendResponse.data)
        setPbProgression(progressionResponse.data)
        setGrowthError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setGrowthSummary(null)
        setGrowthTrend(null)
        setPbProgression(null)
        setGrowthError(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoadingGrowth(false)
        }
      }
    }

    loadGrowth()

    return () => {
      isCancelled = true
    }
  }, [growthReloadKey])

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
    setProfileData(nextProfileData)
    setProfileError(null)
    setRecentRecordsSource(nextRecentRecordsSource)
    setRecentRecordsSourceError(null)
    setGrowthReloadKey((current) => current + 1)

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

  const handleRetryGrowth = () => {
    setGrowthReloadKey((current) => current + 1)
  }

  const handleLoadMorePb = async () => {
    if (!pbProgression?.hasNext || isLoadingMorePb) {
      return
    }

    setIsLoadingMorePb(true)

    try {
      const response = await getMyGrowthPbProgression({
        eventType: GROWTH_EVENT_TYPE,
        page: pbProgression.page + 1,
        size: GROWTH_PB_PAGE_SIZE,
      })

      setPbProgression((current) => current
        ? {
            ...response.data,
            content: [...(current.content ?? []), ...(response.data.content ?? [])],
          }
        : response.data)
    } catch (error) {
      setGrowthError(error.message)
    } finally {
      setIsLoadingMorePb(false)
    }
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
  const nickname = profileData?.nickname ?? currentUser?.nickname ?? '-'
  const mainEvent = getEventLabel(profileData?.mainEvent)
  const totalPages = recordsPage?.totalPages ?? 0

  return (
    <section className="page-grid mypage">
      <div className="mypage-page-header">
        <p className="eyebrow">My Growth</p>
        <h2>나의 성장</h2>
        <p className="helper-text">나의 큐빙 기록과 성장 흐름을 확인하세요.</p>
      </div>

      <div className="panel mypage-profile-panel">
        <div className="mypage-profile-card-main">
          <div className="mypage-profile-identity">
            <span className="mypage-avatar" aria-hidden="true">
              {getProfileInitial(nickname)}
            </span>
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

          <div className="mypage-profile-actions">
            <button
              className="secondary-button mypage-account-trigger"
              type="button"
              onClick={() => handleOpenAccountModal()}
              disabled={isLoadingProfile || isSavingProfile || isChangingPassword}
            >
              <Settings size={16} aria-hidden="true" />
              계정 관리
            </button>
            <button className="ghost-button mypage-logout" onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut size={16} aria-hidden="true" />
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
        {profileError ? (
          <div className="mypage-growth-feedback">
            <p className="message error">{profileError}</p>
            <button className="ghost-button" type="button" onClick={handleRetryProfile}>다시 시도</button>
          </div>
        ) : null}
      </div>

      <div className="panel mypage-dashboard-panel" aria-live="polite">
        <div className="mypage-panel-heading">
          <div>
            <p className="eyebrow">WCA 3x3x3</p>
            <h2>성장 대시보드</h2>
            <p className="helper-text">WCA 3x3x3 Practice 기록을 기준으로 현재 기록 흐름을 확인합니다.</p>
          </div>
        </div>

        {growthError ? (
          <div className="mypage-growth-feedback">
            <p className="message error">{growthError}</p>
            <button className="ghost-button" type="button" onClick={handleRetryGrowth}>다시 시도</button>
          </div>
        ) : isLoadingGrowth ? (
          <p className="helper-text">성장 데이터를 불러오는 중입니다.</p>
        ) : growthSummary?.activity?.totalSolveCount === 0 ? (
          <div className="mypage-growth-empty">
            <h3>아직 성장 데이터를 만들 기록이 없습니다.</h3>
            <p className="helper-text">타이머에서 첫 기록을 남겨보세요.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/timer')}>연습 시작</button>
          </div>
        ) : (
          <>
            <section className="mypage-growth-section" aria-labelledby="growth-current-performance">
              <div className="mypage-growth-section-heading">
                <div>
                  <h3 id="growth-current-performance">현재 기록</h3>
                  <p className="helper-text">현재 남아 있는 WCA 3x3x3 Practice 기록 기준입니다.</p>
                </div>
              </div>
              <div className="dashboard-summary-grid">
                <GrowthMetricCard icon={<Trophy size={18} />} label="Current PB" status={growthSummary?.currentPb?.status} valueMs={growthSummary?.currentPb?.effectiveTimeMs} accent />
                <GrowthMetricCard icon={<Timer size={18} />} label="Recent Ao5" status={growthSummary?.recentAo5?.status} valueMs={growthSummary?.recentAo5?.valueMs} />
                <GrowthMetricCard icon={<Gauge size={18} />} label="Recent Ao12" status={growthSummary?.recentAo12?.status} valueMs={growthSummary?.recentAo12?.valueMs} />
              </div>
            </section>

            <section className="mypage-growth-section" aria-labelledby="growth-direction">
              <div className="mypage-growth-section-heading">
                <div>
                  <h3 id="growth-direction">최근 기록 흐름</h3>
                  <p className="helper-text">완료된 7일 구간의 중앙 기록을 비교합니다.</p>
                </div>
                <span className="mypage-direction-label">비교: {getDirectionLabel(growthSummary?.performanceComparison?.direction)}</span>
              </div>
              <div className="mypage-comparison-grid">
                <GrowthPeriodCard label="최근 7일" period={growthSummary?.performanceComparison?.recentPeriod} />
                <GrowthPeriodCard label="이전 7일" period={growthSummary?.performanceComparison?.previousPeriod} />
              </div>
            </section>

            <section className="mypage-growth-section" aria-labelledby="growth-trend">
              <div className="mypage-growth-section-heading">
                <div>
                  <span className="mypage-trend-title-row"><ChartLine size={19} aria-hidden="true" /><h3 id="growth-trend">30일 추세</h3></span>
                  <p className="helper-text">날짜별 중앙 기록과 solve 수입니다. 기록 없는 날과 DNF-only 날은 중앙 기록이 없습니다.</p>
                </div>
              </div>
              {hasGrowthTrendData ? (
                <>
                  <div className="mypage-trend-chart" aria-label="최근 30일 중앙 기록 그래프">
                    <ResponsiveContainer width="100%" height={260}>
                      <RechartsLineChart data={growthTrendPoints} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                        <XAxis dataKey="date" tickFormatter={formatGrowthTrendAxisTick} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis dataKey="medianTimeMs" tickFormatter={formatTrendAxisTick} tickLine={false} axisLine={false} width={64} />
                        <Tooltip content={<GrowthTrendTooltip />} />
                        <Line type="monotone" dataKey="medianTimeMs" stroke={CHART_LINE_COLOR} strokeWidth={3} dot={{ r: 2, strokeWidth: 0, fill: CHART_LINE_COLOR }} activeDot={{ r: 5, fill: CHART_ACTIVE_DOT_COLOR }} connectNulls={false} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mypage-chart-summary">최근 30일 중 기록이 있는 날 {growthTrendPoints.filter((point) => point.recordCount > 0).length}일, 중앙 기록이 있는 날 {growthTrendPoints.filter((point) => typeof point.medianTimeMs === 'number').length}일</p>
                  <details className="mypage-trend-details">
                    <summary>30일 추세를 텍스트로 보기</summary>
                    <ul>
                      {growthTrendPoints.map((point) => (
                        <li key={point.date}>{formatGrowthDate(point.date)}: {typeof point.medianTimeMs === 'number' ? `중앙 ${formatRecordTime(point.medianTimeMs)}` : point.recordCount === 0 ? '기록 없음' : 'DNF-only'} · solve {point.recordCount}회</li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="helper-text">아직 숫자로 표시할 일별 중앙 기록이 없습니다. DNF-only 기록은 solve 수로만 남습니다.</p>
              )}
            </section>

            <section className="mypage-growth-section" aria-labelledby="growth-consistency">
              <div className="mypage-growth-section-heading"><div><h3 id="growth-consistency">최근 일관성</h3><p className="helper-text">최근 12회와 이전 12회의 IQR 및 penalty 수를 표시합니다.</p></div></div>
              {growthSummary?.consistency?.status === 'AVAILABLE' ? (
                <div className="mypage-consistency-grid">
                  <GrowthConsistencyCard label="최근 12회" window={growthSummary.consistency.current} />
                  <GrowthConsistencyCard label="이전 12회" window={growthSummary.consistency.previous} />
                </div>
              ) : <p className="helper-text">데이터 부족: 최근 일관성을 계산할 충분한 기록이 없습니다.</p>}
            </section>

            <section className="mypage-growth-section" aria-labelledby="growth-pb-progression">
              <div className="mypage-growth-section-heading"><div><h3 id="growth-pb-progression">PB Progression</h3><p className="helper-text">현재 남아 있는 기록 기준입니다. penalty 변경이나 기록 삭제에 따라 다시 구성될 수 있습니다.</p></div></div>
              {(pbProgression?.content ?? []).length === 0 ? <p className="helper-text">아직 표시할 PB progression이 없습니다.</p> : (
                <ol className="mypage-pb-progression-list">
                  {pbProgression.content.map((point) => <li key={point.recordId}><span>{formatRecordTime(point.effectiveTimeMs)}</span><time dateTime={point.createdAt}>{formatDateTime(point.createdAt)}</time></li>)}
                </ol>
              )}
              {pbProgression?.hasNext ? <button className="ghost-button mypage-pb-more-button" type="button" onClick={handleLoadMorePb} disabled={isLoadingMorePb}>{isLoadingMorePb ? '불러오는 중...' : '더 보기'}</button> : null}
            </section>

            <section className="mypage-growth-section" aria-labelledby="growth-activity">
              <div className="mypage-growth-section-heading"><div><h3 id="growth-activity">연습 활동</h3><p className="helper-text">Asia/Seoul 달력일 기준 activity입니다.</p></div></div>
              <div className="mypage-activity-grid">
                <GrowthActivityItem label="전체 solve" value={`${growthSummary?.activity?.totalSolveCount ?? 0}회`} />
                <GrowthActivityItem label="최근 7일" value={`${growthSummary?.activity?.last7DaysSolveCount ?? 0}회`} />
                <GrowthActivityItem label="이전 7일" value={`${growthSummary?.activity?.previous7DaysSolveCount ?? 0}회`} />
                <GrowthActivityItem label="최근 30일" value={`${growthSummary?.activity?.last30DaysSolveCount ?? 0}회`} />
                <GrowthActivityItem label="활동 일수" value={`${growthSummary?.activity?.activeDaysLast30Days ?? 0}일`} />
                <GrowthActivityItem label="첫 기록일" value={formatDateTime(growthSummary?.activity?.firstRecordedAt)} />
                <GrowthActivityItem label="최근 기록일" value={formatDateTime(growthSummary?.activity?.latestRecordedAt)} />
              </div>
              {growthTrendPoints.length > 0 ? (
                <div className="mypage-activity-chart" aria-label="최근 30일 일별 solve 수 그래프">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={growthTrendPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatGrowthTrendAxisTick} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                      <Tooltip content={<GrowthActivityTooltip />} />
                      <Bar dataKey="recordCount" name="solve 수" fill={CHART_LINE_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mypage-chart-summary">일별 solve 수: 기록 없는 날은 0회로 표시합니다.</p>
                </div>
              ) : null}
            </section>

            <section className="mypage-next-practice" aria-labelledby="growth-next-practice"><div><h3 id="growth-next-practice">다음 연습</h3><p>{getNextPracticeAction(growthSummary)}</p></div><button className="primary-button" type="button" onClick={() => navigate('/timer')}>연습 시작</button></section>
          </>
        )}
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

export function resolveEventType(mainEvent) {
  if (!mainEvent) {
    return null
  }

  const matchedOption = eventOptions.find(
    (option) => option.value === mainEvent || option.label === mainEvent,
  )

  return matchedOption?.value ?? mainEvent
}

export function getEventLabel(mainEvent) {
  if (!mainEvent) {
    return '-'
  }

  const matchedOption = eventOptions.find(
    (option) => option.value === mainEvent || option.label === mainEvent,
  )

  return matchedOption?.label ?? mainEvent
}

export function formatGrowthTrendAxisTick(value) {
  return typeof value === 'string' ? value.slice(5).replace('-', '/') : ''
}

export function GrowthMetricCard({ icon, label, status, valueMs, accent = false }) {
  return (
    <div className="dashboard-summary-card">
      <span className={`dashboard-summary-icon${accent ? ' accent' : ''}`} aria-hidden="true">{icon}</span>
      <span className="dashboard-summary-label">{label}</span>
      <span className={`dashboard-summary-value${accent ? ' pb-value' : ''}`}>{formatGrowthMetric(status, valueMs)}</span>
    </div>
  )
}

export function GrowthPeriodCard({ label, period }) {
  return (
    <div className="mypage-growth-period-card">
      <span className="dashboard-summary-label">{label}</span>
      <strong>{typeof period?.medianTimeMs === 'number' ? formatRecordTime(period.medianTimeMs) : '데이터 부족'}</strong>
      <p>{period?.fromDate && period?.toDateExclusive ? `${formatGrowthDate(period.fromDate)} ~ ${formatGrowthDate(period.toDateExclusive)}` : '완료된 구간 없음'}</p>
      <span>solve {period?.recordCount ?? 0}회 · DNF {period?.dnfCount ?? 0}회</span>
    </div>
  )
}

export function GrowthConsistencyCard({ label, window }) {
  return (
    <div className="mypage-growth-period-card">
      <span className="dashboard-summary-label">{label}</span>
      <strong>{window?.status === 'AVAILABLE' && typeof window.iqrMs === 'number' ? `IQR ${formatRecordTime(window.iqrMs)}` : '데이터 부족'}</strong>
      <span>DNF {window?.dnfCount ?? 0}회 · +2 {window?.plusTwoCount ?? 0}회</span>
    </div>
  )
}

export function GrowthActivityItem({ label, value }) {
  return <div className="mypage-activity-item"><span>{label}</span><strong>{value}</strong></div>
}

export function GrowthTrendTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload
  const median = typeof point.medianTimeMs === 'number'
    ? formatRecordTime(point.medianTimeMs)
    : point.recordCount === 0 ? '기록 없음' : 'DNF-only'

  return (
    <div className="mypage-trend-tooltip">
      <p className="mypage-trend-tooltip-time">{formatGrowthDate(point.date)} · {median}</p>
      <p className="mypage-trend-tooltip-date">solve {point.recordCount}회 · DNF {point.dnfCount}회 · +2 {point.plusTwoCount}회</p>
    </div>
  )
}

export function GrowthActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0].payload

  return (
    <div className="mypage-trend-tooltip">
      <p className="mypage-trend-tooltip-time">{formatGrowthDate(point.date)}</p>
      <p className="mypage-trend-tooltip-date">solve {point.recordCount}회 · DNF {point.dnfCount}회 · +2 {point.plusTwoCount}회</p>
    </div>
  )
}

export function RecordTrendTooltip({ active, payload }) {
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
