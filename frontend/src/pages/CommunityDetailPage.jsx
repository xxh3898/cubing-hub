import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deletePost, getPost } from '../api.js'
import { useAuth } from '../context/useAuth.js'

function formatCommunityDate(value) {
  const date = new Date(value)

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatCategoryLabel(category) {
  return category === 'NOTICE' ? '공지' : '자유'
}

export default function CommunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const postId = Number.parseInt(id, 10)

    if (Number.isNaN(postId)) {
      setPost(null)
      setErrorMessage('게시글을 찾을 수 없습니다.')
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadPost = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getPost(postId)

        if (isCancelled) {
          return
        }

        setPost(response.data ?? null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setPost(null)
        setErrorMessage(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPost()

    return () => {
      isCancelled = true
    }
  }, [id])

  const isAdmin = currentUser?.role === 'ROLE_ADMIN'
  const isAuthor = Boolean(post && currentUser?.nickname === post.authorNickname)
  const canDelete = Boolean(post && (isAdmin || isAuthor))

  const handleDeletePost = async () => {
    if (!post || !window.confirm('게시글을 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    setDeleteErrorMessage(null)

    try {
      await deletePost(post.id)
      navigate('/community', { replace: true })
    } catch (error) {
      setDeleteErrorMessage(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="page-grid community-detail-page">
        <div className="panel">
          <p className="helper-text">게시글을 불러오는 중입니다.</p>
        </div>
      </section>
    )
  }

  if (errorMessage || !post) {
    return (
      <section className="page-grid community-detail-page">
        <div className="panel">
          <p className="message error">{errorMessage ?? '게시글을 찾을 수 없습니다.'}</p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/community" className="ghost-button">목록으로</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-grid community-detail-page">
      <div className="panel community-detail-header-panel">
        <div className="community-detail-meta-row">
          <span className="eyebrow">{formatCategoryLabel(post.category)}</span>
        </div>
        <h2 className="community-detail-title">{post.title}</h2>
        <div className="community-detail-info">
          <span className="community-detail-author">{post.authorNickname}</span>
          <span className="community-detail-date">{formatCommunityDate(post.createdAt)}</span>
          <span className="community-detail-views">조회 {post.viewCount}</span>
        </div>
      </div>

      <div className="panel community-detail-content-panel">
        {deleteErrorMessage ? <p className="message error auth-message">{deleteErrorMessage}</p> : null}
        <div className="community-detail-content">
          {post.content.split('\n').map((line, index) => (
            <span key={`${post.id}-${index}`}>
              {line}
              <br />
            </span>
          ))}
        </div>
        <div className="community-detail-actions">
          {canDelete ? (
            <button
              className="ghost-button community-post-delete"
              type="button"
              onClick={handleDeletePost}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          ) : null}
          <Link to="/community" className="ghost-button community-back-button">목록으로</Link>
        </div>
      </div>

      <div className="panel community-comments-panel">
        <h3 className="community-comments-title">댓글</h3>
        <div className="community-comments-list">
          <p className="community-comments-empty">댓글 기능은 다음 커밋에서 연동됩니다.</p>
        </div>
      </div>
    </section>
  )
}
