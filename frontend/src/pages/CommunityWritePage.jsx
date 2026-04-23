import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPost, getPost, updatePost } from '../api.js'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { useAuth } from '../context/useAuth.js'

export default function CommunityWritePage() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('FREE')
  const [formErrorMessage, setFormErrorMessage] = useState(null)
  const [loadErrorMessage, setLoadErrorMessage] = useState(null)
  const [isPageLoading, setIsPageLoading] = useState(Boolean(id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const isEditMode = typeof id === 'string'
  const postId = isEditMode ? Number.parseInt(id, 10) : null
  const isAdmin = currentUser?.role === 'ROLE_ADMIN'
  const cancelPath = isEditMode && !Number.isNaN(postId) ? `/community/${postId}` : '/community'

  useEffect(() => {
    if (!isAdmin && category === 'NOTICE') {
      setCategory('FREE')
    }
  }, [category, isAdmin])

  useEffect(() => {
    if (!isEditMode) {
      setTitle('')
      setContent('')
      setCategory('FREE')
      setLoadErrorMessage(null)
      setFormErrorMessage(null)
      setIsPageLoading(false)
      return undefined
    }

    if (Number.isNaN(postId)) {
      setLoadErrorMessage('게시글을 찾을 수 없습니다.')
      setIsPageLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadPost = async () => {
      setIsPageLoading(true)
      setLoadErrorMessage(null)
      setFormErrorMessage(null)

      try {
        const response = await getPost(postId)

        if (isCancelled) {
          return
        }

        const nextPost = response.data ?? null

        if (!nextPost) {
          setLoadErrorMessage('게시글을 찾을 수 없습니다.')
          return
        }

        const canEditPost = isAdmin || currentUser?.nickname === nextPost.authorNickname

        if (!canEditPost) {
          setLoadErrorMessage('게시글 수정/삭제 권한이 없습니다.')
          return
        }

        setCategory(nextPost.category)
        setTitle(nextPost.title)
        setContent(nextPost.content)
      } catch (error) {
        if (!isCancelled) {
          setLoadErrorMessage(error.message)
        }
      } finally {
        if (!isCancelled) {
          setIsPageLoading(false)
        }
      }
    }

    loadPost()

    return () => {
      isCancelled = true
    }
  }, [currentUser?.nickname, isAdmin, isEditMode, postId])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextTitle = title.trim()
    const nextContent = content.trim()

    if (!nextTitle || !nextContent) {
      setFormErrorMessage('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (category === 'NOTICE' && !isAdmin) {
      setFormErrorMessage('공지사항은 관리자만 작성할 수 있습니다.')
      return
    }

    if (isEditMode && Number.isNaN(postId)) {
      setLoadErrorMessage('게시글을 찾을 수 없습니다.')
      return
    }

    setIsSubmitting(true)
    setFormErrorMessage(null)

    try {
      if (isEditMode) {
        await updatePost(postId, {
          category,
          title: nextTitle,
          content: nextContent,
        })
        navigate(`/community/${postId}`, { replace: true })
      } else {
        const response = await createPost({
          category,
          title: nextTitle,
          content: nextContent,
        })

        const createdPostId = response.data?.id
        navigate(createdPostId ? `/community/${createdPostId}` : '/community', { replace: true })
      }
    } catch (error) {
      setFormErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEditMode && isPageLoading) {
    return (
      <section className="page-grid community-write-page">
        <div className="panel community-write-panel">
          <h2 className="community-write-title">게시글 수정</h2>
          <p className="helper-text">게시글 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (isEditMode && loadErrorMessage) {
    return (
      <section className="page-grid community-write-page">
        <div className="panel community-write-panel">
          <h2 className="community-write-title">게시글 수정</h2>
          <p className="message error auth-message">{loadErrorMessage}</p>
          <div className="community-write-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate('/community')}
            >
              목록으로
            </button>
          </div>
        </div>
      </section>
    )
  }

  const pageTitle = isEditMode ? '게시글 수정' : '새 게시글 작성'
  const submitLabel = isEditMode ? '수정' : '등록'
  const submittingLabel = isEditMode ? '수정 중...' : '등록 중...'

  return (
    <section className="page-grid community-write-page">
      <div className="panel community-write-panel">
        <h2 className="community-write-title">{pageTitle}</h2>
        {formErrorMessage ? <p className="message error auth-message">{formErrorMessage}</p> : null}
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
              onClick={() => navigate(cancelPath)}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
