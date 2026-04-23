import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteAdminMemo, getAdminMemo, updateAdminMemo } from '../api.js'
import { INPUT_LIMITS } from '../constants/inputLimits.js'

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function AdminMemoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const memoId = Number.parseInt(id, 10)
  const [detail, setDetail] = useState(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)

  useEffect(() => {
    if (Number.isNaN(memoId)) {
      setErrorMessage('관리자 메모를 찾을 수 없습니다.')
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadMemo = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getAdminMemo(memoId)

        if (isCancelled) {
          return
        }

        const nextDetail = response.data ?? null
        setDetail(nextDetail)
        setQuestion(nextDetail?.question ?? '')
        setAnswer(nextDetail?.answer ?? '')
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

    loadMemo()

    return () => {
      isCancelled = true
    }
  }, [memoId])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedQuestion = question.trim()
    const trimmedAnswer = answer.trim()

    if (!trimmedQuestion) {
      setErrorMessage('질문을 입력해주세요.')
      setSaveMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      const response = await updateAdminMemo(memoId, {
        question: trimmedQuestion,
        answer: trimmedAnswer,
      })
      setDetail(response.data)
      setQuestion(response.data.question)
      setAnswer(response.data.answer ?? '')
      setSaveMessage('관리자 메모를 저장했습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('이 메모를 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await deleteAdminMemo(memoId)
      navigate('/admin', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="page-grid admin-detail-page">
        <div className="panel">
          <p className="helper-text">관리자 메모를 불러오는 중입니다.</p>
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
          <span className={`admin-status-chip ${detail.answerStatus === 'ANSWERED' ? 'is-success' : 'is-pending'}`}>
            {detail.answerStatus === 'ANSWERED' ? '답변 완료' : '미답변'}
          </span>
        </div>
        <h2>관리자 메모 상세</h2>
        <div className="admin-detail-meta">
          <span>생성일 {formatDateTime(detail.createdAt)}</span>
          <span>수정일 {formatDateTime(detail.updatedAt)}</span>
          <span>답변일 {formatDateTime(detail.answeredAt)}</span>
        </div>
      </div>

      <div className="panel admin-detail-content-panel">
        <form className="form-grid admin-detail-form" onSubmit={handleSubmit}>
          {errorMessage ? <p className="message error">{errorMessage}</p> : null}
          {saveMessage ? <p className="message success">{saveMessage}</p> : null}
          <div className="field">
            <label htmlFor="memo-question">질문</label>
            <textarea
              id="memo-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              maxLength={INPUT_LIMITS.adminMemoQuestion}
              disabled={isSaving || isDeleting}
            />
          </div>
          <div className="field">
            <label htmlFor="memo-answer">답변</label>
            <textarea
              id="memo-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={10}
              maxLength={INPUT_LIMITS.adminMemoAnswer}
              disabled={isSaving || isDeleting}
            />
          </div>
          <div className="community-detail-actions">
            <Link to="/admin" className="ghost-button">목록으로</Link>
            <button type="button" className="ghost-button" onClick={handleDelete} disabled={isSaving || isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isDeleting}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
