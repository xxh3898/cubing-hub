import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createFeedback, retryFeedbackNotification } from '../api.js'
import { useAuth } from '../context/useAuth.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function FeedbackPage() {
  const { currentUser } = useAuth()
  const [type, setType] = useState('BUG')
  const [replyEmail, setReplyEmail] = useState(currentUser?.email ?? '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formMessage, setFormMessage] = useState(null)
  const [notificationState, setNotificationState] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetryingNotification, setIsRetryingNotification] = useState(false)
  const navigate = useNavigate()
  const defaultReplyEmail = currentUser?.email ?? ''

  useEffect(() => {
    setReplyEmail((previousReplyEmail) => previousReplyEmail || defaultReplyEmail)
  }, [defaultReplyEmail])

  const updateFeedbackField = (setter) => (value) => {
    setter(value)

    if (formMessage) {
      setFormMessage(null)
    }
  }

  const handleTypeChange = (event) => {
    updateFeedbackField(setType)(event.target.value)
  }

  const handleReplyEmailChange = (event) => {
    updateFeedbackField(setReplyEmail)(event.target.value)
  }

  const handleTitleChange = (event) => {
    updateFeedbackField(setTitle)(event.target.value)
  }

  const handleContentChange = (event) => {
    updateFeedbackField(setContent)(event.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedReplyEmail = replyEmail.trim()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedReplyEmail || !trimmedTitle || !trimmedContent) {
      setFormMessage('회신 이메일, 제목, 내용을 모두 입력해주세요.')
      return
    }

    if (!EMAIL_PATTERN.test(trimmedReplyEmail)) {
      setFormMessage('올바른 이메일 주소를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setFormMessage(null)

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
      const nextNotificationState = toNotificationState(response)
      setNotificationState(nextNotificationState)
      showToastMessage(nextNotificationState.type, response.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotificationRetry = async () => {
    if (!notificationState?.notificationRetryAvailable) {
      return
    }

    setIsRetryingNotification(true)

    try {
      const response = await retryFeedbackNotification(notificationState.feedbackId)
      const nextNotificationState = toNotificationState(response)
      setNotificationState(nextNotificationState)
      showToastMessage(nextNotificationState.type, response.message)
    } catch (error) {
      showToastMessage(error.status === 409 ? 'success' : 'error', error.message)
      setNotificationState((previousState) => {
        if (!previousState) {
          return null
        }

        const nextNotificationStatus = error.status === 409 ? 'SUCCESS' : previousState.notificationStatus

        return {
          ...previousState,
          notificationStatus: nextNotificationStatus,
          statusLabel: getNotificationStatusLabel(nextNotificationStatus),
          type: nextNotificationStatus === 'SUCCESS' ? 'success' : 'error',
          notificationRetryAvailable:
            [403, 404, 409].includes(error.status)
              ? false
              : previousState.notificationRetryAvailable,
        }
      })
    } finally {
      setIsRetryingNotification(false)
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
          {formMessage ? <p className="message error">{formMessage}</p> : null}
          {notificationState ? (
            <div className="feedback-notification-status">
              <div className="feedback-notification-summary">
                <span className={`feedback-notification-badge is-${notificationState.type}`}>
                  {notificationState.statusLabel}
                </span>
              </div>
              <div className="feedback-notification-meta">
                <span>{`피드백 ID #${notificationState.feedbackId}`}</span>
                <span>{`알림 시도 ${notificationState.notificationAttemptCount}회`}</span>
              </div>
              {notificationState.notificationRetryAvailable ? (
                <button
                  type="button"
                  className="ghost-button feedback-retry-button"
                  onClick={handleNotificationRetry}
                  disabled={isSubmitting || isRetryingNotification}
                >
                  {isRetryingNotification ? '재시도 중...' : 'Discord 알림 재시도'}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="feedback-type">피드백 종류</label>
            <select
              id="feedback-type"
              value={type}
              onChange={handleTypeChange}
              disabled={isSubmitting || isRetryingNotification}
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
              onChange={handleReplyEmailChange}
              placeholder="회신 받을 이메일 주소를 입력해주세요"
              maxLength={255}
              autoComplete="email"
              disabled={isSubmitting || isRetryingNotification}
            />
            <p className="helper-text">필요하면 이 주소로 답변을 보냅니다.</p>
          </div>

          <div className="field">
            <label htmlFor="feedback-title">제목</label>
            <input
              type="text"
              id="feedback-title"
              value={title}
              onChange={handleTitleChange}
              placeholder="간략한 제목을 적어주세요"
              maxLength={100}
              disabled={isSubmitting || isRetryingNotification}
            />
          </div>

          <div className="field">
            <label htmlFor="feedback-content">내용</label>
            <textarea
              id="feedback-content"
              value={content}
              onChange={handleContentChange}
              placeholder="어떤 상황에서 어떤 문제가 발생했는지, 혹은 어떤 기능이 있으면 좋을지 자유롭게 적어주세요!"
              rows={8}
              disabled={isSubmitting || isRetryingNotification}
            />
          </div>

          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting || isRetryingNotification}
            >
              이전으로
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting || isRetryingNotification}>
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function toNotificationState(response) {
  const notificationStatus = response.data.notificationStatus

  return {
    feedbackId: response.data.id,
    notificationAttemptCount: response.data.notificationAttemptCount,
    notificationRetryAvailable: response.data.notificationRetryAvailable,
    notificationStatus,
    statusLabel: getNotificationStatusLabel(notificationStatus),
    type: notificationStatus === 'SUCCESS' ? 'success' : 'error',
  }
}

function getNotificationStatusLabel(notificationStatus) {
  return notificationStatus === 'SUCCESS'
    ? 'Discord 알림 전송 완료'
    : 'Discord 알림 전송 실패'
}

function showToastMessage(type, message) {
  if (type === 'success') {
    toast.success(message)
    return
  }

  if (type === 'info') {
    toast.info(message)
    return
  }

  toast.error(message)
}
