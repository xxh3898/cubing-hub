import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPost } from '../api.js'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { useAuth } from '../context/useAuth.js'

export default function CommunityWritePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('FREE')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const isAdmin = currentUser?.role === 'ROLE_ADMIN'

  useEffect(() => {
    if (!isAdmin && category === 'NOTICE') {
      setCategory('FREE')
    }
  }, [category, isAdmin])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextTitle = title.trim()
    const nextContent = content.trim()

    if (!nextTitle || !nextContent) {
      setErrorMessage('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (category === 'NOTICE' && !isAdmin) {
      setErrorMessage('공지사항은 관리자만 작성할 수 있습니다.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await createPost({
        category,
        title: nextTitle,
        content: nextContent,
      })

      const postId = response.data?.id
      navigate(postId ? `/community/${postId}` : '/community', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-grid community-write-page">
      <div className="panel community-write-panel">
        <h2 className="community-write-title">새 게시글 작성</h2>
        {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
        <form onSubmit={handleSubmit} className="form-grid community-write-form">
          <div className="field">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="FREE">자유게시판</option>
              {isAdmin && <option value="NOTICE">공지사항</option>}
            </select>
          </div>
          <div className="field">
            <label htmlFor="title">제목</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>
          <div className="field">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="게시글 내용을 입력하세요"
              rows={10}
              maxLength={INPUT_LIMITS.postContent}
              disabled={isSubmitting}
            />
          </div>
          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate('/community')}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
