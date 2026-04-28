/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, FileQuestion, NotebookPen, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { createAdminMemo, getAdminFeedbacks, getAdminMemos } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { formatSeoulDateTime } from '../utils/dateTime.js'

const FEEDBACK_PAGE_SIZE = 8
const MEMO_PAGE_SIZE = 8

export function formatDateTime(value) {
  return formatSeoulDateTime(value)
}

export function toPreview(text, maxLength = 90) {
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

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('feedbacks')
  const [feedbackPage, setFeedbackPage] = useState(null)
  const [memoPage, setMemoPage] = useState(null)
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true)
  const [isMemoLoading, setIsMemoLoading] = useState(true)
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState(null)
  const [memoErrorMessage, setMemoErrorMessage] = useState(null)
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1)
  const [memoCurrentPage, setMemoCurrentPage] = useState(1)
  const [answeredFilter, setAnsweredFilter] = useState('ALL')
  const [visibilityFilter, setVisibilityFilter] = useState('ALL')
  const [feedbackReloadKey, setFeedbackReloadKey] = useState(0)
  const [memoReloadKey, setMemoReloadKey] = useState(0)
  const [newMemoQuestion, setNewMemoQuestion] = useState('')
  const [newMemoAnswer, setNewMemoAnswer] = useState('')
  const [memoFormErrorMessage, setMemoFormErrorMessage] = useState(null)
  const [isMemoCreating, setIsMemoCreating] = useState(false)

  const feedbackQuery = useMemo(() => ({
    answered: answeredFilter === 'ALL' ? undefined : answeredFilter === 'ANSWERED',
    visibility: visibilityFilter === 'ALL' ? undefined : visibilityFilter,
    page: feedbackCurrentPage,
    size: FEEDBACK_PAGE_SIZE,
  }), [answeredFilter, feedbackCurrentPage, visibilityFilter])

  useEffect(() => {
    let isCancelled = false

    const loadFeedbacks = async () => {
      setIsFeedbackLoading(true)
      setFeedbackErrorMessage(null)

      try {
        const response = await getAdminFeedbacks(feedbackQuery)

        if (isCancelled) {
          return
        }

        setFeedbackPage(response.data)
      } catch (error) {
        if (!isCancelled) {
          setFeedbackErrorMessage(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsFeedbackLoading(false)
        }
      }
    }

    loadFeedbacks()

    return () => {
      isCancelled = true
    }
  }, [feedbackQuery, feedbackReloadKey])

  useEffect(() => {
    let isCancelled = false

    const loadMemos = async () => {
      setIsMemoLoading(true)
      setMemoErrorMessage(null)

      try {
        const response = await getAdminMemos({
          page: memoCurrentPage,
          size: MEMO_PAGE_SIZE,
        })

        if (!isCancelled) {
          setMemoPage(response.data)
        }
      } catch (error) {
        if (!isCancelled) {
          setMemoErrorMessage(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsMemoLoading(false)
        }
      }
    }

    loadMemos()

    return () => {
      isCancelled = true
    }
  }, [memoCurrentPage, memoReloadKey])

  const handleCreateMemo = async (event) => {
    event.preventDefault()

    const question = newMemoQuestion.trim()
    const answer = newMemoAnswer.trim()

    if (!question) {
      setMemoFormErrorMessage('질문을 입력해주세요.')
      return
    }

    setIsMemoCreating(true)
    setMemoFormErrorMessage(null)

    try {
      const response = await createAdminMemo({
        question,
        answer,
      })
      setNewMemoQuestion('')
      setNewMemoAnswer('')
      navigate(`/admin/memos/${response.data.id}`)
    } catch (error) {
      setMemoFormErrorMessage(error.message)
    } finally {
      setIsMemoCreating(false)
    }
  }

  const feedbackItems = feedbackPage?.items ?? []
  const memoItems = memoPage?.items ?? []

  return (
    <section className="page-grid admin-page">
      <div className="panel admin-header-panel">
        <span className="admin-header-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div className="admin-header-copy">
          <p className="eyebrow">Admin Console</p>
          <h2>운영 관리</h2>
          <p className="helper-text">피드백 답변, 공개 여부, 내부 메모를 한곳에서 정리합니다.</p>
        </div>
        <div className="admin-console-summary" aria-label="관리자 현황 요약">
          <span>
            <strong>{feedbackPage?.totalElements ?? '-'}</strong>
            <span>피드백</span>
          </span>
          <span>
            <strong>{memoPage?.totalElements ?? '-'}</strong>
            <span>메모</span>
          </span>
        </div>
        <div className="admin-tab-row" role="tablist" aria-label="관리자 섹션">
          <button
            type="button"
            className={activeTab === 'feedbacks' ? 'primary-button' : 'ghost-button'}
            onClick={() => setActiveTab('feedbacks')}
          >
            <ClipboardList size={16} aria-hidden="true" />
            피드백
          </button>
          <button
            type="button"
            className={activeTab === 'memos' ? 'primary-button' : 'ghost-button'}
            onClick={() => setActiveTab('memos')}
          >
            <NotebookPen size={16} aria-hidden="true" />
            관리자 메모
          </button>
        </div>
      </div>

      {activeTab === 'feedbacks' ? (
        <div className="panel admin-board-panel">
          <div className="section-heading admin-board-heading">
            <div>
              <h3>피드백 목록</h3>
              <p className="helper-text">답변 상태와 공개 여부를 기준으로 빠르게 확인합니다.</p>
            </div>
          </div>
          <div className="admin-filter-row">
            <div className="field admin-filter-field">
              <label htmlFor="answered-filter">답변 여부</label>
              <select
                id="answered-filter"
                value={answeredFilter}
                onChange={(event) => {
                  setAnsweredFilter(event.target.value)
                  setFeedbackCurrentPage(1)
                }}
              >
                <option value="ALL">전체</option>
                <option value="ANSWERED">답변 완료</option>
                <option value="UNANSWERED">미답변</option>
              </select>
            </div>
            <div className="field admin-filter-field">
              <label htmlFor="visibility-filter">공개 여부</label>
              <select
                id="visibility-filter"
                value={visibilityFilter}
                onChange={(event) => {
                  setVisibilityFilter(event.target.value)
                  setFeedbackCurrentPage(1)
                }}
              >
                <option value="ALL">전체</option>
                <option value="PRIVATE">비공개</option>
                <option value="PUBLIC">공개</option>
              </select>
            </div>
          </div>

          {isFeedbackLoading ? (
            <p className="helper-text">관리자 피드백 목록을 불러오는 중입니다.</p>
          ) : feedbackErrorMessage ? (
            <>
              <p className="message error">{feedbackErrorMessage}</p>
              <button className="ghost-button" type="button" onClick={() => setFeedbackReloadKey((current) => current + 1)}>
                <RefreshCw size={16} aria-hidden="true" />
                다시 시도
              </button>
            </>
          ) : feedbackItems.length === 0 ? (
            <p className="helper-text">조건에 맞는 피드백이 없습니다.</p>
          ) : (
            <div className="admin-card-list">
              {feedbackItems.map((item) => (
                <Link key={item.id} to={`/admin/feedbacks/${item.id}`} className="admin-card">
                  <div className="admin-card-header">
                    <div className="admin-card-badges">
                      <span className="qna-type-chip">{formatFeedbackType(item.type)}</span>
                      <span className={`admin-status-chip ${item.answered ? 'is-success' : 'is-pending'}`}>
                        {item.answered ? '답변 완료' : '미답변'}
                      </span>
                      <span className={`admin-status-chip ${item.visibility === 'PUBLIC' ? 'is-public' : 'is-private'}`}>
                        {item.visibility === 'PUBLIC' ? '공개' : '비공개'}
                      </span>
                    </div>
                    <span className="helper-text">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="admin-card-question">{toPreview(item.content, 130)}</p>
                  {item.answer ? (
                    <p className="admin-card-answer">답변: {toPreview(item.answer, 110)}</p>
                  ) : (
                    <p className="helper-text">아직 답변이 없습니다.</p>
                  )}
                </Link>
              ))}
            </div>
          )}

          <GroupedPagination
            className="community-pagination"
            buttonClassName="community-page-button"
            currentPage={feedbackCurrentPage}
            totalPages={feedbackPage?.totalPages ?? 0}
            hasPrevious={feedbackPage?.hasPrevious ?? feedbackCurrentPage > 1}
            hasNext={feedbackPage?.hasNext ?? false}
            onPageChange={setFeedbackCurrentPage}
          />
        </div>
      ) : (
        <>
          <div className="panel admin-memo-create-panel">
            <div className="section-heading">
              <h3>
                <Plus size={18} aria-hidden="true" />
                새 관리자 메모
              </h3>
              <span className="helper-text">질문과 답변을 한 세트로 저장할 수 있습니다.</span>
            </div>
            <form className="form-grid" onSubmit={handleCreateMemo}>
              {memoFormErrorMessage ? <p className="message error">{memoFormErrorMessage}</p> : null}
              <div className="field">
                <label htmlFor="new-memo-question">질문</label>
                <textarea
                  id="new-memo-question"
                  value={newMemoQuestion}
                  onChange={(event) => setNewMemoQuestion(event.target.value)}
                  rows={4}
                  maxLength={INPUT_LIMITS.adminMemoQuestion}
                  disabled={isMemoCreating}
                />
              </div>
              <div className="field">
                <label htmlFor="new-memo-answer">답변</label>
                <textarea
                  id="new-memo-answer"
                  value={newMemoAnswer}
                  onChange={(event) => setNewMemoAnswer(event.target.value)}
                  rows={6}
                  maxLength={INPUT_LIMITS.adminMemoAnswer}
                  disabled={isMemoCreating}
                />
              </div>
              <div className="community-write-actions">
                <button type="submit" className="primary-button" disabled={isMemoCreating}>
                  {isMemoCreating ? '저장 중...' : '메모 만들기'}
                </button>
              </div>
            </form>
          </div>

          <div className="panel admin-board-panel">
            <div className="section-heading admin-board-heading">
              <div>
                <h3>
                  <FileQuestion size={18} aria-hidden="true" />
                  메모 목록
                </h3>
                <p className="helper-text">최근 수정된 메모부터 표시됩니다.</p>
              </div>
            </div>
            {isMemoLoading ? (
              <p className="helper-text">관리자 메모 목록을 불러오는 중입니다.</p>
            ) : memoErrorMessage ? (
              <>
                <p className="message error">{memoErrorMessage}</p>
                <button className="ghost-button" type="button" onClick={() => setMemoReloadKey((current) => current + 1)}>
                  <RefreshCw size={16} aria-hidden="true" />
                  다시 시도
                </button>
              </>
            ) : memoItems.length === 0 ? (
              <p className="helper-text">등록된 관리자 메모가 없습니다.</p>
            ) : (
              <div className="admin-card-list">
                {memoItems.map((item) => (
                  <Link key={item.id} to={`/admin/memos/${item.id}`} className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-badges">
                        <span className={`admin-status-chip ${item.answerStatus === 'ANSWERED' ? 'is-success' : 'is-pending'}`}>
                          {item.answerStatus === 'ANSWERED' ? '답변 완료' : '미답변'}
                        </span>
                      </div>
                      <span className="helper-text">{formatDateTime(item.updatedAt)}</span>
                    </div>
                    <h3>{toPreview(item.question, 90)}</h3>
                    {item.answer ? (
                      <p className="admin-card-answer">답변: {toPreview(item.answer, 130)}</p>
                    ) : (
                      <p className="helper-text">아직 답변이 없습니다.</p>
                    )}
                  </Link>
                ))}
              </div>
            )}

            <GroupedPagination
              className="community-pagination"
              buttonClassName="community-page-button"
              currentPage={memoCurrentPage}
              totalPages={memoPage?.totalPages ?? 0}
              hasPrevious={memoPage?.hasPrevious ?? memoCurrentPage > 1}
              hasNext={memoPage?.hasNext ?? false}
              onPageChange={setMemoCurrentPage}
            />
          </div>
        </>
      )}
    </section>
  )
}
