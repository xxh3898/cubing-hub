/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminFeedback, updateAdminFeedbackAnswer, updateAdminFeedbackVisibility } from '../api.js'
import { INPUT_LIMITS } from '../constants/inputLimits.js'

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatFeedbackType(type) {
  switch (type) {
    case 'BUG':
      return '버그'
    case 'FEATURE':
      return '기능'
    case 'UX':
      return '사용성'
    default:
      return '기타'
  }
}

export default function AdminFeedbackDetailPage() {
  const { id } = useParams()
  const feedbackId = Number.parseInt(id, 10)
  const [detail, setDetail] = useState(null)
  const [answer, setAnswer] = useState('')
  const [visibility, setVisibility] = useState('PRIVATE')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)

  useEffect(() => {
    if (Number.isNaN(feedbackId)) {
      setErrorMessage('피드백을 찾을 수 없습니다.')
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadFeedback = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getAdminFeedback(feedbackId)

        if (isCancelled) {
          return
        }

        const nextDetail = response.data ?? null
        setDetail(nextDetail)
        setAnswer(nextDetail?.answer ?? '')
        setVisibility(nextDetail?.visibility ?? 'PRIVATE')
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadFeedback()

    return () => {
      isCancelled = true
    }
  }, [feedbackId])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedAnswer = answer.trim()

    if (!trimmedAnswer) {
      setSaveMessage(null)
      setErrorMessage('답변을 입력해주세요.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      let nextDetail = detail

      if (trimmedAnswer !== (detail.answer ?? '')) {
        const answerResponse = await updateAdminFeedbackAnswer(feedbackId, {
          answer: trimmedAnswer,
        })
        nextDetail = answerResponse.data
      }

      if (visibility !== nextDetail.visibility) {
        const visibilityResponse = await updateAdminFeedbackVisibility(feedbackId, {
          visibility,
        })
        nextDetail = visibilityResponse.data
      }

      setDetail(nextDetail)
      setAnswer(nextDetail.answer ?? '')
      setVisibility(nextDetail.visibility)
      setSaveMessage('답변과 공개 설정을 저장했습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="page-grid admin-detail-page">
        <div className="panel">
          <p className="helper-text">피드백 상세를 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage && !detail) {
    return (
      <section className="page-grid admin-detail-page">
        <div className="panel">
          <p className="message error">{errorMessage}</p>
          <div className="community-detail-actions">
            <Link to="/admin" className="ghost-button">관리자 목록으로</Link>
          </div>
        </div>
      </section>
    )
  }

  if (!detail) {
    return null
  }

  return (
    <section className="page-grid admin-detail-page">
      <div className="panel admin-detail-header-panel">
        <div className="admin-card-badges">
          <span className="qna-type-chip">{formatFeedbackType(detail.type)}</span>
          <span className={`admin-status-chip ${detail.answered ? 'is-success' : 'is-pending'}`}>
            {detail.answered ? '답변 완료' : '미답변'}
          </span>
          <span className={`admin-status-chip ${detail.visibility === 'PUBLIC' ? 'is-public' : 'is-private'}`}>
            {detail.visibility === 'PUBLIC' ? '공개' : '비공개'}
          </span>
        </div>
        <h2>{detail.title}</h2>
        <div className="admin-detail-meta">
          <span>작성자 {detail.submitterNickname}</span>
          <span>회신 이메일 {detail.replyEmail}</span>
          <span>접수일 {formatDateTime(detail.createdAt)}</span>
        </div>
      </div>

      <div className="panel admin-detail-content-panel">
        <div className="admin-detail-section">
          <div className="section-heading">
            <h3>질문 내용</h3>
            <span className="helper-text">Discord {detail.notificationStatus} · {detail.notificationAttemptCount}회</span>
          </div>
          <div className="qna-detail-content">
            {detail.content.split('\n').map((line, index) => (
              <span key={`feedback-content-${index}`}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>

        <form className="form-grid admin-detail-form" onSubmit={handleSubmit}>
          {errorMessage ? <p className="message error">{errorMessage}</p> : null}
          {saveMessage ? <p className="message success">{saveMessage}</p> : null}
          <div className="field">
            <label htmlFor="feedback-answer">답변</label>
            <textarea
              id="feedback-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={10}
              maxLength={INPUT_LIMITS.feedbackAnswer}
              disabled={isSaving}
            />
          </div>
          <div className="field">
            <label htmlFor="feedback-visibility">공개 여부</label>
            <select
              id="feedback-visibility"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              disabled={isSaving}
            >
              <option value="PRIVATE">비공개</option>
              <option value="PUBLIC">공개</option>
            </select>
            <p className="helper-text">공개를 선택하면 질문과 답변이 함께 `/qna`에 노출됩니다.</p>
          </div>
          <div className="admin-detail-meta">
            <span>답변일 {formatDateTime(detail.answeredAt)}</span>
            <span>공개일 {formatDateTime(detail.publishedAt)}</span>
          </div>
          <div className="community-detail-actions">
            <Link to="/admin" className="ghost-button">목록으로</Link>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? '저장 중...' : '답변 저장'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
