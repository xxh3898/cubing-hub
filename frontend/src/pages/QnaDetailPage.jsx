import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getQnaDetail } from '../api.js'

function formatDateTime(value) {
  const date = new Date(value)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatFeedbackType(type) {
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

export default function QnaDetailPage() {
  const { id } = useParams()
  const feedbackId = Number.parseInt(id, 10)
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (Number.isNaN(feedbackId)) {
      setErrorMessage('질문을 찾을 수 없습니다.')
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadDetail = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getQnaDetail(feedbackId)

        if (!isCancelled) {
          setDetail(response.data ?? null)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error.message)
          setDetail(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      isCancelled = true
    }
  }, [feedbackId])

  if (isLoading) {
    return (
      <section className="page-grid qna-detail-page">
        <div className="panel">
          <p className="helper-text">질문 상세를 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage || !detail) {
    return (
      <section className="page-grid qna-detail-page">
        <div className="panel">
          <p className="message error">{errorMessage ?? '질문을 찾을 수 없습니다.'}</p>
          <div className="community-detail-actions">
            <Link to="/qna" className="ghost-button">목록으로</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-grid qna-detail-page">
      <div className="panel qna-detail-header-panel">
        <p className="eyebrow">{formatFeedbackType(detail.type)}</p>
        <h2>{detail.title}</h2>
        <div className="qna-detail-meta">
          <span>{detail.questionerLabel}</span>
          <span>공개일 {formatDateTime(detail.publishedAt)}</span>
        </div>
      </div>

      <div className="panel qna-detail-panel">
        <div className="qna-detail-block">
          <div className="section-heading">
            <h3>질문</h3>
            <span className="helper-text">{formatDateTime(detail.createdAt)}</span>
          </div>
          <div className="qna-detail-content">
            {detail.content.split('\n').map((line, index) => (
              <span key={`question-${index}`}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>

        <div className="qna-detail-block">
          <div className="section-heading">
            <h3>답변</h3>
            <span className="helper-text">{detail.answererLabel} · {formatDateTime(detail.answeredAt)}</span>
          </div>
          <div className="qna-detail-content">
            {detail.answer.split('\n').map((line, index) => (
              <span key={`answer-${index}`}>
                {line}
                <br />
              </span>
            ))}
          </div>
        </div>

        <div className="community-detail-actions">
          <Link to="/qna" className="ghost-button">목록으로</Link>
          <Link to="/feedback" className="primary-button">질문 남기기</Link>
        </div>
      </div>
    </section>
  )
}
