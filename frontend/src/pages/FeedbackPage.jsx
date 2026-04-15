import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFeedback } from '../api.js'
import { useAuth } from '../context/useAuth.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function FeedbackPage() {
  const { currentUser } = useAuth()
  const [type, setType] = useState('BUG')
  const [replyEmail, setReplyEmail] = useState(currentUser?.email ?? '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const defaultReplyEmail = currentUser?.email ?? ''

  useEffect(() => {
    setReplyEmail((previousReplyEmail) => previousReplyEmail || defaultReplyEmail)
  }, [defaultReplyEmail])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedReplyEmail = replyEmail.trim()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedReplyEmail || !trimmedTitle || !trimmedContent) {
      setFeedbackMessage({ type: 'error', text: '회신 이메일, 제목, 내용을 모두 입력해주세요.' })
      return
    }

    if (!EMAIL_PATTERN.test(trimmedReplyEmail)) {
      setFeedbackMessage({ type: 'error', text: '올바른 이메일 주소를 입력해주세요.' })
      return
    }

    setIsSubmitting(true)
    setFeedbackMessage(null)

    try {
      const response = await createFeedback({
        type,
        replyEmail: trimmedReplyEmail,
        title: trimmedTitle,
        content: trimmedContent,
      })

      setType('BUG')
      setReplyEmail(defaultReplyEmail)
      setTitle('')
      setContent('')
      setFeedbackMessage({ type: 'success', text: response.message })
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-grid feedback-page">
      <div className="panel feedback-header-panel">
        <div className="feedback-header-copy">
          <p className="eyebrow">Feedback</p>
          <h2>개발자에게 전달하기</h2>
          <p className="helper-text">
            버그 제보, 편의성 개선, 혹은 단순한 피드백 무엇이든 환영합니다!
            서비스를 개선하는 데에 큰 도움이 됩니다.
          </p>
        </div>
      </div>

      <div className="panel feedback-form-panel">
        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          {feedbackMessage ? <p className={`message ${feedbackMessage.type}`}>{feedbackMessage.text}</p> : null}

          <div className="field">
            <label htmlFor="feedback-type">피드백 종류</label>
            <select
              id="feedback-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="BUG">버그 및 오류 제보</option>
              <option value="FEATURE">새로운 기능 제안</option>
              <option value="UX">사용성 개선 아이디어</option>
              <option value="OTHER">기타</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="feedback-reply-email">회신 이메일</label>
            <input
              type="email"
              id="feedback-reply-email"
              value={replyEmail}
              onChange={(e) => setReplyEmail(e.target.value)}
              placeholder="회신 받을 이메일 주소를 입력해주세요"
              maxLength={255}
              autoComplete="email"
            />
            <p className="helper-text">필요하면 이 주소로 답변을 보냅니다.</p>
          </div>

          <div className="field">
            <label htmlFor="feedback-title">제목</label>
            <input
              type="text"
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="간략한 제목을 적어주세요"
              maxLength={100}
            />
          </div>

          <div className="field">
            <label htmlFor="feedback-content">내용</label>
            <textarea
              id="feedback-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="어떤 상황에서 어떤 문제가 발생했는지, 혹은 어떤 기능이 있으면 좋을지 자유롭게 적어주세요!"
              rows={8}
            />
          </div>

          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              이전으로
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
