/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, MessageCircleReply, MessageSquareText, RefreshCw } from 'lucide-react'
import { getQna } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { formatSeoulDateTime } from '../utils/dateTime.js'

const QNA_PAGE_SIZE = 8

export function formatDateTime(value) {
  return formatSeoulDateTime(value)
}

export function toPreview(text, maxLength = 120) {
  if (!text) {
    return ''
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
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

export default function QnaPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [qnaPage, setQnaPage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isCancelled = false

    const loadQna = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getQna({
          page: currentPage,
          size: QNA_PAGE_SIZE,
        })

        if (isCancelled) {
          return
        }

        const nextPage = response.data
        const normalizedPage = nextPage.totalPages > 0 ? Math.min(currentPage, nextPage.totalPages) : 1

        if (normalizedPage !== currentPage) {
          setCurrentPage(normalizedPage)
          return
        }

        setQnaPage(nextPage)
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

    loadQna()

    return () => {
      isCancelled = true
    }
  }, [currentPage, reloadKey])

  const items = qnaPage?.items ?? []

  return (
    <section className="page-grid qna-page">
      <div className="panel qna-header-panel">
        <span className="qna-header-icon" aria-hidden="true">
          <CircleHelp size={22} />
        </span>
        <div className="qna-header-copy">
          <p className="eyebrow">Public Q&A</p>
          <h2>공개 질문과 답변</h2>
          <p className="helper-text">큐빙허브에 들어온 질문 중 함께 보면 좋은 답변을 모았습니다.</p>
        </div>
        <div className="qna-header-summary" aria-label="Q&A 요약">
          <span className="qna-summary-pill">
            <MessageSquareText size={16} aria-hidden="true" />
            <span>
              <strong>{qnaPage?.totalElements ?? '-'}</strong>
              <span>공개 답변</span>
            </span>
          </span>
          <Link to="/feedback" className="ghost-button qna-feedback-link">
            <MessageCircleReply size={16} aria-hidden="true" />
            질문 남기기
          </Link>
        </div>
      </div>

      <div className="panel qna-board-panel">
        <div className="section-heading qna-board-heading">
          <div>
            <h3>답변 모음</h3>
            <p className="helper-text">공개된 답변만 표시됩니다.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="qna-state-card">
            <p className="helper-text">공개 질문 목록을 불러오는 중입니다.</p>
          </div>
        ) : errorMessage ? (
          <div className="qna-state-card">
            <p className="message error">{errorMessage}</p>
            <div className="community-pagination">
              <button className="ghost-button community-page-button" type="button" onClick={() => setReloadKey((current) => current + 1)}>
                <RefreshCw size={16} aria-hidden="true" />
                다시 시도
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="qna-state-card">
            <p className="helper-text">아직 공개된 질문과 답변이 없습니다.</p>
          </div>
        ) : (
          <div className="qna-card-list">
            {items.map((item) => (
              <Link key={item.id} to={`/qna/${item.id}`} className="qna-card">
                <div className="qna-card-header">
                  <span className="qna-type-chip">{formatFeedbackType(item.type)}</span>
                  <span className="helper-text">{formatDateTime(item.publishedAt)}</span>
                </div>
                <h3>{item.title}</h3>
                <p className="qna-card-question">{toPreview(item.content)}</p>
                <div className="qna-card-answer">
                  <strong>
                    <MessageCircleReply size={15} aria-hidden="true" />
                    {item.answererLabel}
                  </strong>
                  <p>{toPreview(item.answer, 140)}</p>
                </div>
                <div className="qna-card-meta">
                  <span>{item.questionerLabel}</span>
                  <span>{item.answererLabel}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <GroupedPagination
          className="community-pagination"
          buttonClassName="community-page-button"
          currentPage={currentPage}
          totalPages={qnaPage?.totalPages ?? 0}
          hasPrevious={qnaPage?.hasPrevious ?? currentPage > 1}
          hasNext={qnaPage?.hasNext ?? false}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  )
}
