import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FeedbackPage() {
  const [type, setType] = useState('BUG')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    // 목업: 제출 성공 알림
    alert('소중한 의견이 무사히 전달되었습니다! 감사합니다.')
    navigate('/')
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
        <form onSubmit={handleSubmit} className="form-grid">
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
            <label htmlFor="feedback-title">제목</label>
            <input
              type="text"
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="간략한 제목을 적어주세요"
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
            >
              이전으로
            </button>
            <button type="submit" className="primary-button">
              제출하기
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
