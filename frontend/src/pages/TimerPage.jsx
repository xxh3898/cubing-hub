import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteRecord, getScramble, saveRecord, updateRecordPenalty } from '../api.js'
import { eventOptions, findEventOption } from '../constants/eventOptions.js'
import { useAuth } from '../context/useAuth.js'
import { useCubeTimer } from '../hooks/useCubeTimer.js'

function formatRecordedTime(milliseconds) {
  const totalMilliseconds = Math.max(0, Math.floor(milliseconds))
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const remainingMilliseconds = totalMilliseconds % 1000

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
  }

  return `${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
}

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
    return '기록을 멈추려면 스페이스바를 다시 누르세요.'
  }

  if (status === 'stopped') {
    return ''
  }

  return '스페이스바를 길게 눌러 준비 상태를 만든 뒤 손을 떼면 시작됩니다.'
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

  return formatRecordedTime(record.effectiveTimeMs ?? record.timeMs)
}

export default function TimerPage() {
  const { isAuthenticated } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState('WCA_333')
  const [scrambleData, setScrambleData] = useState(null)
  const [scrambleMessage, setScrambleMessage] = useState(null)
  const [isLoadingScramble, setIsLoadingScramble] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [recentSavedRecords, setRecentSavedRecords] = useState([])
  const [updatingRecordId, setUpdatingRecordId] = useState(null)
  const [deletingRecordId, setDeletingRecordId] = useState(null)
  const lastAutoSavedRecordRef = useRef(null)

  const currentEvent = useMemo(() => findEventOption(selectedEvent), [selectedEvent])
  const isSupported = Boolean(currentEvent?.supported)
  const hasScramble = Boolean(scrambleData?.scramble)
  const timerEnabled = isSupported && hasScramble && !isLoadingScramble

  const { status, finalTime, formattedTime, resetTimer } = useCubeTimer({
    enabled: timerEnabled,
  })

  const loadScramble = async (eventType) => {
    setIsLoadingScramble(true)
    setScrambleMessage(null)
    setSaveMessage(null)

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
    setSaveMessage(null)

    if (!isSupported) {
      setScrambleData(null)
      setScrambleMessage({ type: 'info', text: '이 종목은 아직 구현되지 않았습니다.' })
      return
    }

    loadScramble(selectedEvent)
  }, [isSupported, resetTimer, selectedEvent])

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
    setSaveMessage(null)

    try {
      const response = await deleteRecord(recordId)
      setRecentSavedRecords((current) => current.filter((record) => record.id !== recordId))
      setSaveMessage({ type: 'success', text: response.message })
    } catch (error) {
      setSaveMessage({ type: 'error', text: error.message })
    } finally {
      setDeletingRecordId(null)
    }
  }

  const handleUpdateRecentRecordPenalty = async (recordId, penalty) => {
    setUpdatingRecordId(recordId)
    setSaveMessage(null)

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
      setSaveMessage({ type: 'success', text: response.message })
    } catch (error) {
      setSaveMessage({ type: 'error', text: error.message })
    } finally {
      setUpdatingRecordId(null)
    }
  }

  useEffect(() => {
    if (status !== 'stopped' || !finalTime || !scrambleData?.scramble || !isSupported) {
      return
    }

    if (!isAuthenticated) {
      setSaveMessage({ type: 'info', text: '로그인 후 기록이 자동 저장됩니다.' })
      return
    }

    const nextSaveKey = `${selectedEvent}:${Math.round(finalTime)}:${scrambleData.scramble}`

    if (lastAutoSavedRecordRef.current === nextSaveKey) {
      return
    }

    const persistRecord = async () => {
      setSaveMessage(null)

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
        setSaveMessage({ type: 'success', text: `${response.message} 타이머 초기화 후 다음 기록을 시작할 수 있습니다.` })
        lastAutoSavedRecordRef.current = `${selectedEvent}:${roundedTime}:${scrambleData.scramble}`
      } catch (error) {
        setSaveMessage({ type: 'error', text: error.message })
      }
    }

    persistRecord()
  }, [finalTime, isAuthenticated, isSupported, scrambleData, selectedEvent, status])

  const timerMessage = getTimerMessage(status, isSupported, hasScramble)
  const statusLabel = getStatusLabel(status)

  return (
    <section className="page-grid timer-page">
      <div className="panel timer-layout">
        <div className="timer-scramble-panel timer-scramble-full">
          <div className="timer-scramble-copy">
            <p className="eyebrow">현재 스크램블</p>
            <p className="scramble-text timer-scramble-text">
              {isLoadingScramble
                ? '스크램블을 불러오는 중입니다...'
                : scrambleData?.scramble ?? '지원 종목을 선택하거나 스크램블을 다시 불러와 주세요.'}
            </p>
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

            <div className="timer-toolbar-status">
              {saveMessage ? <p className={`message ${saveMessage.type}`}>{saveMessage.text}</p> : null}
            </div>
          </div>

          <div className={`timer-display timer-focus-display is-${status}`}>
            <p className="timer-caption">{statusLabel}</p>
            <h2 className="timer-value">{formattedTime}</h2>
            <p className="helper-text timer-helper">{timerMessage}</p>
          </div>

          <section className="timer-recent-panel">
            <div className="section-heading timer-recent-heading">
              <div>
                <h3>최근 기록</h3>
              </div>
            </div>
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
