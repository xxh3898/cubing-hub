import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { deleteRecord, getMyRecords, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { eventOptions, findEventOption } from '../constants/eventOptions.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'
import { calculateAverageOf, filterLatestRecordsByEvent, formatAverageResult, formatRecordTime } from '../utils/recordStats.js'
import { buildVisualCubeUrl } from '../utils/visualCube.js'

const RECENT_STATS_FETCH_SIZE = 100
const RECENT_STATS_LIMIT = 12

function getTimerMessage(status, isSupported, hasScramble) {
  if (!isSupported) {
    return '이 종목은 아직 구현되지 않았습니다.'
  }

  if (!hasScramble) {
    return '스크램블을 불러와야 타이머를 시작할 수 있습니다.'
  }

  if (status === 'holding') {
    return '계속 누르고 있으면 준비 상태로 전환됩니다.'
  }

  if (status === 'ready') {
    return '손을 떼면 타이머가 시작됩니다.'
  }

  if (status === 'running') {
    return '기록을 멈추려면 스페이스바를 누르거나 타이머 영역을 다시 누르세요.'
  }

  if (status === 'stopped') {
    return ''
  }

  return '스페이스바 또는 타이머 영역을 길게 누른 뒤 손을 떼면 시작됩니다.'
}

function getStatusLabel(status) {
  if (status === 'holding') {
    return '홀드'
  }

  if (status === 'ready') {
    return '준비'
  }

  if (status === 'running') {
    return '진행 중'
  }

  if (status === 'stopped') {
    return '정지'
  }

  return '대기'
}

function getPenaltyLabel(penalty) {
  if (penalty === 'PLUS_TWO') {
    return '+2'
  }

  if (penalty === 'DNF') {
    return 'DNF'
  }

  return '기본'
}

function getDisplayTime(record) {
  if (record.penalty === 'DNF') {
    return 'DNF'
  }

  return formatRecordTime(record.effectiveTimeMs ?? record.timeMs, { padSeconds: true })
}

export default function TimerPage() {
  const { isAuthenticated } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState('WCA_333')
  const [scrambleData, setScrambleData] = useState(null)
  const [scrambleMessage, setScrambleMessage] = useState(null)
  const [isLoadingScramble, setIsLoadingScramble] = useState(false)
  const [hasScrambleVisualError, setHasScrambleVisualError] = useState(false)
  const [saveNotice, setSaveNotice] = useState(null)
  const [recentSavedRecords, setRecentSavedRecords] = useState([])
  const [recentStatsRecords, setRecentStatsRecords] = useState([])
  const [recentStatsError, setRecentStatsError] = useState(null)
  const [isLoadingRecentStats, setIsLoadingRecentStats] = useState(false)
  const [updatingRecordId, setUpdatingRecordId] = useState(null)
  const [deletingRecordId, setDeletingRecordId] = useState(null)
  const lastAutoSavedRecordRef = useRef(null)

  const currentEvent = useMemo(() => findEventOption(selectedEvent), [selectedEvent])
  const isSupported = Boolean(currentEvent?.supported)
  const hasScramble = Boolean(scrambleData?.scramble)
  const timerEnabled = isSupported && hasScramble && !isLoadingScramble
  const ao5 = useMemo(() => calculateAverageOf(recentStatsRecords, 5), [recentStatsRecords])
  const ao12 = useMemo(() => calculateAverageOf(recentStatsRecords, 12), [recentStatsRecords])
  const scrambleVisualUrl = useMemo(() => {
    if (selectedEvent !== 'WCA_333' || !scrambleData?.scramble) {
      return null
    }

    const visualUrl = new URL(buildVisualCubeUrl({ puzzle: '3x3' }))
    visualUrl.searchParams.set('alg', scrambleData.scramble)
    visualUrl.searchParams.set('sch', 'wrgyob')
    return visualUrl.toString()
  }, [scrambleData?.scramble, selectedEvent])

  const {
    status,
    finalTime,
    formattedTime,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetTimer,
  } = useCubeTimer({
    enabled: timerEnabled,
  })

  const loadRecentStatistics = useCallback(async (eventType) => {
    if (!isAuthenticated || !eventType) {
      setRecentStatsRecords([])
      setRecentStatsError(null)
      return
    }

    setIsLoadingRecentStats(true)
    setRecentStatsError(null)

    try {
      const response = await getMyRecords({ page: 1, size: RECENT_STATS_FETCH_SIZE })
      setRecentStatsRecords(filterLatestRecordsByEvent(response.data.items, eventType, RECENT_STATS_LIMIT))
      setRecentStatsError(null)
    } catch (error) {
      setRecentStatsRecords([])
      setRecentStatsError(error.message)
    } finally {
      setIsLoadingRecentStats(false)
    }
  }, [isAuthenticated])

  const loadScramble = async (eventType) => {
    setIsLoadingScramble(true)
    setScrambleMessage(null)
    setSaveNotice(null)

    try {
      const response = await getScramble(eventType)
      setScrambleData(response.data)
    } catch (error) {
      setScrambleData(null)
      setScrambleMessage({ type: 'error', text: error.message })
    } finally {
      setIsLoadingScramble(false)
    }
  }

  useEffect(() => {
    resetTimer()
    setSaveNotice(null)

    if (!isSupported) {
      setScrambleData(null)
      setScrambleMessage({ type: 'info', text: '이 종목은 아직 구현되지 않았습니다.' })
      return
    }

    loadScramble(selectedEvent)
  }, [isSupported, resetTimer, selectedEvent])

  useEffect(() => {
    setHasScrambleVisualError(false)
  }, [scrambleVisualUrl])

  useEffect(() => {
    if (!isAuthenticated || !isSupported) {
      setRecentStatsRecords([])
      setRecentStatsError(null)
      setIsLoadingRecentStats(false)
      return
    }

    loadRecentStatistics(selectedEvent)
  }, [isAuthenticated, isSupported, loadRecentStatistics, selectedEvent])

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value)
  }

  const handleScrambleRetry = () => {
    if (isSupported) {
      loadScramble(selectedEvent)
    }
  }

  const handleDeleteRecentRecord = async (recordId) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) {
      return
    }

    setDeletingRecordId(recordId)
    setSaveNotice(null)

    try {
      const response = await deleteRecord(recordId)
      setRecentSavedRecords((current) => current.filter((record) => record.id !== recordId))
      await loadRecentStatistics(selectedEvent)
      toast.success(response.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDeletingRecordId(null)
    }
  }

  const handleUpdateRecentRecordPenalty = async (recordId, penalty) => {
    setUpdatingRecordId(recordId)
    setSaveNotice(null)

    try {
      const response = await updateRecordPenalty(recordId, { penalty })
      setRecentSavedRecords((current) =>
        current.map((record) =>
          record.id === recordId
            ? {
                ...record,
                penalty: response.data.penalty,
                timeMs: response.data.timeMs,
                effectiveTimeMs: response.data.effectiveTimeMs,
              }
            : record,
        ),
      )
      await loadRecentStatistics(selectedEvent)
      toast.success(response.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUpdatingRecordId(null)
    }
  }

  useEffect(() => {
    if (status !== 'stopped' || !finalTime || !scrambleData?.scramble || !isSupported) {
      return
    }

    if (!isAuthenticated) {
      setSaveNotice('로그인 후 기록이 자동 저장됩니다.')
      return
    }

    const nextSaveKey = `${selectedEvent}:${Math.round(finalTime)}:${scrambleData.scramble}`

    if (lastAutoSavedRecordRef.current === nextSaveKey) {
      return
    }

    const persistRecord = async () => {
      setSaveNotice(null)

      try {
        const roundedTime = Math.max(1, Math.round(finalTime))
        const response = await saveRecord({
          eventType: selectedEvent,
          timeMs: roundedTime,
          penalty: 'NONE',
          scramble: scrambleData.scramble,
        })

        setRecentSavedRecords((current) => [
          {
            id: response.data?.id ?? Date.now(),
            eventType: selectedEvent,
            timeMs: roundedTime,
            effectiveTimeMs: roundedTime,
            penalty: 'NONE',
            scramble: scrambleData.scramble,
          },
          ...current,
        ].slice(0, 5))
        await loadRecentStatistics(selectedEvent)
        toast.success(`${response.message} 타이머 초기화 후 다음 기록을 시작할 수 있습니다.`)
        lastAutoSavedRecordRef.current = `${selectedEvent}:${roundedTime}:${scrambleData.scramble}`
      } catch (error) {
        toast.error(error.message)
      }
    }

    persistRecord()
  }, [finalTime, isAuthenticated, isSupported, loadRecentStatistics, scrambleData, selectedEvent, status])

  useEffect(() => {
    if (status !== 'stopped') {
      setSaveNotice(null)
    }
  }, [status])

  const timerMessage = getTimerMessage(status, isSupported, hasScramble)
  const statusLabel = getStatusLabel(status)

  return (
    <section className="page-grid timer-page">
      <div className="panel timer-layout">
        <div className="timer-scramble-panel timer-scramble-full">
          <div className="timer-scramble-content">
            <div className="timer-scramble-copy">
              <p className="eyebrow">현재 스크램블</p>
              <p className="scramble-text timer-scramble-text">
                {isLoadingScramble
                  ? '스크램블을 불러오는 중입니다...'
                  : scrambleData?.scramble ?? '지원 종목을 선택하거나 스크램블을 다시 불러와 주세요.'}
              </p>
              {scrambleVisualUrl && hasScrambleVisualError ? (
                <p className="helper-text timer-visual-fallback">스크램블 이미지를 불러오지 못해 텍스트만 표시합니다.</p>
              ) : null}
            </div>
            {scrambleVisualUrl && !hasScrambleVisualError ? (
              <div className="timer-scramble-visual">
                <img
                  src={scrambleVisualUrl}
                  alt="현재 스크램블 시각화"
                  onError={() => setHasScrambleVisualError(true)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <section className="timer-main">
          <div className="timer-toolbar">
            <div className="field timer-event-field">
              <label htmlFor="event-type">종목</label>
              <select id="event-type" value={selectedEvent} onChange={handleEventChange}>
                {eventOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="timer-actions timer-actions-row timer-toolbar-actions">
              <button className="ghost-button" type="button" onClick={handleScrambleRetry} disabled={!isSupported || isLoadingScramble}>
                스크램블 초기화
              </button>
              <button className="secondary-button" type="button" onClick={resetTimer}>
                타이머 초기화
              </button>
            </div>
          </div>

          <div
            className={`timer-display timer-focus-display timer-touch-surface is-${status}`}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
          >
            <p className="timer-caption">{statusLabel}</p>
            <h2 className="timer-value">{formattedTime}</h2>
            <p className="helper-text timer-helper">{timerMessage}</p>
            {saveNotice ? <p className="helper-text timer-save-notice">{saveNotice}</p> : null}
          </div>

          <section className="timer-recent-panel">
            <div className="section-heading timer-recent-heading">
              <div>
                <h3>최근 기록</h3>
                <p className="helper-text">선택 종목 기준 최신 12개 기록으로 Ao5, Ao12를 계산합니다.</p>
              </div>
            </div>
            <div className="timer-stats-grid">
              <article className="timer-stat-card">
                <span className="timer-stat-label">Ao5</span>
                <strong className="timer-stat-value">{formatAverageResult(ao5, { padSeconds: true })}</strong>
              </article>
              <article className="timer-stat-card">
                <span className="timer-stat-label">Ao12</span>
                <strong className="timer-stat-value">{formatAverageResult(ao12, { padSeconds: true })}</strong>
              </article>
            </div>
            {recentStatsError ? <p className="message error">{recentStatsError}</p> : null}
            {!recentStatsError && !isAuthenticated ? (
              <p className="helper-text">로그인 후 Ao5, Ao12가 계산됩니다.</p>
            ) : null}
            {!recentStatsError && isAuthenticated && !isSupported ? (
              <p className="helper-text">이 종목은 아직 Ao 통계를 지원하지 않습니다.</p>
            ) : null}
            {!recentStatsError && isAuthenticated && isSupported && isLoadingRecentStats ? (
              <p className="helper-text">최근 기록 통계를 계산하는 중입니다.</p>
            ) : null}
            {!recentStatsError && isAuthenticated && isSupported && !isLoadingRecentStats && recentStatsRecords.length === 0 ? (
              <p className="helper-text">아직 Ao를 계산할 저장 기록이 없습니다.</p>
            ) : null}
            {recentSavedRecords.length === 0 ? (
              <p className="helper-text">현재 세션에서 저장된 기록이 아직 없습니다.</p>
            ) : (
              <div className="timer-recent-list">
                {recentSavedRecords.map((record) => (
                  <article key={record.id} className="timer-recent-item">
                    <div className="timer-recent-meta">
                      <p className="timer-recent-time">{getDisplayTime(record)}</p>
                      <span className="timer-recent-penalty">{getPenaltyLabel(record.penalty)}</span>
                    </div>
                    <div className="timer-recent-actions">
                      {['NONE', 'PLUS_TWO', 'DNF'].map((penalty) => {
                        const isMutating = updatingRecordId === record.id || deletingRecordId === record.id

                        return (
                          <button
                            key={penalty}
                            className={record.penalty === penalty ? 'secondary-button timer-penalty-button' : 'ghost-button timer-penalty-button'}
                            type="button"
                            onClick={() => handleUpdateRecentRecordPenalty(record.id, penalty)}
                            disabled={isMutating || record.penalty === penalty}
                          >
                            {getPenaltyLabel(penalty)}
                          </button>
                        )
                      })}
                      <button
                        className="ghost-button timer-delete-button"
                        type="button"
                        onClick={() => handleDeleteRecentRecord(record.id)}
                        disabled={updatingRecordId === record.id || deletingRecordId === record.id}
                      >
                        {deletingRecordId === record.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {scrambleMessage ? <p className={`message ${scrambleMessage.type}`}>{scrambleMessage.text}</p> : null}
        </section>
      </div>
    </section>
  )
}
