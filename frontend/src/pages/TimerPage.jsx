import { useEffect, useMemo, useState } from 'react'
import { getScramble, saveRecord } from '../api.js'
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
    return '기록 저장 버튼으로 현재 결과를 저장할 수 있습니다.'
  }

  return '스페이스바를 길게 눌러 준비 상태를 만든 뒤 손을 떼면 시작됩니다.'
}

export default function TimerPage() {
  const { accessToken, isAuthenticated } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState('WCA_333')
  const [scrambleData, setScrambleData] = useState(null)
  const [scrambleMessage, setScrambleMessage] = useState(null)
  const [isLoadingScramble, setIsLoadingScramble] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

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

  const handleSaveRecord = async () => {
    if (!isAuthenticated || !finalTime || !scrambleData?.scramble || !isSupported) {
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await saveRecord(accessToken, {
        eventType: selectedEvent,
        timeMs: Math.max(1, Math.round(finalTime)),
        penalty: 'NONE',
        scramble: scrambleData.scramble,
      })

      setSaveMessage({ type: 'success', text: `${response.message} 다음 스크램블을 불러옵니다.` })
      resetTimer()
      await loadScramble(selectedEvent)
    } catch (error) {
      setSaveMessage({ type: 'error', text: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  const timerMessage = getTimerMessage(status, isSupported, hasScramble)

  return (
    <section className="page-grid">
      <div className="panel split-grid">
        <section className="timer-hero">
          <div className="field">
            <label htmlFor="event-type">큐브 종목</label>
            <select id="event-type" value={selectedEvent} onChange={handleEventChange}>
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={`timer-display is-${status}`}>
            <p className="timer-caption">{status.toUpperCase()}</p>
            <h2 className="timer-value">{formattedTime}</h2>
            <p className="helper-text">{timerMessage}</p>
          </div>

          <div className="scramble-box">
            <p>Current Scramble</p>
            <p className="scramble-text">
              {isLoadingScramble
                ? '스크램블을 불러오는 중입니다...'
                : scrambleData?.scramble ?? '지원 종목을 선택하거나 재시도를 눌러주세요.'}
            </p>
          </div>

          {scrambleMessage ? <p className={`message ${scrambleMessage.type}`}>{scrambleMessage.text}</p> : null}
          {saveMessage ? <p className={`message ${saveMessage.type}`}>{saveMessage.text}</p> : null}

          <div className="timer-actions">
            <button className="ghost-button" type="button" onClick={handleScrambleRetry} disabled={!isSupported || isLoadingScramble}>
              스크램블 재시도
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={handleSaveRecord}
              disabled={!isAuthenticated || !finalTime || !hasScramble || !isSupported || isSaving}
            >
              {isSaving ? '저장 중...' : '기록 저장'}
            </button>
            <button className="secondary-button" type="button" onClick={resetTimer}>
              타이머 초기화
            </button>
          </div>
        </section>

        <aside className="panel stat-list">
          <div className="stat-row">
            <span>현재 종목</span>
            <strong>{currentEvent?.label ?? selectedEvent}</strong>
          </div>
          <div className="stat-row">
            <span>지원 여부</span>
            <strong>{isSupported ? '지원됨' : '미지원'}</strong>
          </div>
          <div className="stat-row">
            <span>로그인 상태</span>
            <strong>{isAuthenticated ? '저장 가능' : '타이머만 사용 가능'}</strong>
          </div>
          <div className="stat-row">
            <span>현재 스크램블</span>
            <strong>{hasScramble ? '준비됨' : '없음'}</strong>
          </div>
          <div className="stat-row">
            <span>마지막 기록</span>
            <strong>{finalTime ? formatRecordedTime(finalTime) : '없음'}</strong>
          </div>
          <p className="helper-text">
            Day 12에서는 `WCA_333`만 실제 저장 흐름을 지원합니다. 다른 종목은 의도적으로 막아둡니다.
          </p>
        </aside>
      </div>
    </section>
  )
}
