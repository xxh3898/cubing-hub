import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { createComment, deleteComment, deletePost, getComments, getPost } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { useAuth } from '../context/useAuth.js'

const COMMENT_PAGE_SIZE = 5

function formatCommunityDate(value) {
  const date = new Date(value)

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatCategoryLabel(category) {
  return category === 'NOTICE' ? '공지' : '자유'
}

export default function CommunityDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentCommentPage, setCurrentCommentPage] = useState(1)
  const [commentsPage, setCommentsPage] = useState(null)
  const [isCommentsLoading, setIsCommentsLoading] = useState(true)
  const [commentsErrorMessage, setCommentsErrorMessage] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [commentActionErrorMessage, setCommentActionErrorMessage] = useState(null)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [commentReloadKey, setCommentReloadKey] = useState(0)

  const postId = Number.parseInt(id, 10)
  const isAdmin = currentUser?.role === 'ROLE_ADMIN'
  const isAuthor = Boolean(post && currentUser?.nickname === post.authorNickname)
  const canEditPost = Boolean(post && (isAdmin || isAuthor))
  const canDeletePost = Boolean(post && (isAdmin || isAuthor))
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
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
  }, [postId])

  useEffect(() => {
    if (Number.isNaN(postId)) {
      setCommentsPage(null)
      setCommentsErrorMessage('게시글을 찾을 수 없습니다.')
      setIsCommentsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadComments = async () => {
      setIsCommentsLoading(true)
      setCommentsErrorMessage(null)

      try {
        const response = await getComments(postId, {
          page: currentCommentPage,
          size: COMMENT_PAGE_SIZE,
        })

        if (isCancelled) {
          return
        }

        const nextPage = response.data
        const normalizedPage = nextPage.totalPages > 0 ? Math.min(currentCommentPage, nextPage.totalPages) : 1

        if (normalizedPage !== currentCommentPage) {
          setCurrentCommentPage(normalizedPage)
          return
        }

        setCommentsPage(nextPage)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setCommentsPage(null)
        setCommentsErrorMessage(error.message)
      } finally {
        if (!isCancelled) {
          setIsCommentsLoading(false)
        }
      }
    }

    loadComments()

    return () => {
      isCancelled = true
    }
  }, [commentReloadKey, currentCommentPage, postId])

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

  const handleRetryComments = () => {
    setCommentReloadKey((current) => current + 1)
  }

  const handleAddComment = async (event) => {
    event.preventDefault()

    const nextContent = commentInput.trim()

    if (!nextContent || !post) {
      setCommentActionErrorMessage('댓글 내용을 입력해주세요.')
      return
    }

    setIsCommentSubmitting(true)
    setCommentActionErrorMessage(null)

    try {
      await createComment(post.id, {
        content: nextContent,
      })
      setCommentInput('')
      setCurrentCommentPage(1)
      setCommentReloadKey((current) => current + 1)
    } catch (error) {
      setCommentActionErrorMessage(error.message)
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!post || !window.confirm('댓글을 삭제하시겠습니까?')) {
      return
    }

    setDeletingCommentId(commentId)
    setCommentActionErrorMessage(null)

    try {
      await deleteComment(post.id, commentId)
      setCommentReloadKey((current) => current + 1)
    } catch (error) {
      setCommentActionErrorMessage(error.message)
    } finally {
      setDeletingCommentId(null)
    }
  }

  const canDeleteComment = (commentAuthorNickname) => {
    if (!currentUser) {
      return false
    }

    return isAdmin || currentUser.nickname === commentAuthorNickname
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

  const commentItems = commentsPage?.items ?? []
  const totalCommentPages = commentsPage?.totalPages ?? 0

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
        {post.attachments?.length ? (
          <div className="community-attachment-gallery">
            {post.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="community-attachment-card"
              >
                <img src={attachment.imageUrl} alt={attachment.originalFileName} className="community-attachment-image" />
                <span className="community-attachment-name">{attachment.originalFileName}</span>
              </a>
            ))}
          </div>
        ) : null}
        <div className="community-detail-content">
          {post.content.split('\n').map((line, index) => (
            <span key={`${post.id}-${index}`}>
              {line}
              <br />
            </span>
          ))}
        </div>
        <div className="community-detail-actions">
          {canEditPost ? (
            <Link to={`/community/${post.id}/edit`} className="ghost-button">
              수정
            </Link>
          ) : null}
          {canDeletePost ? (
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
        <h3 className="community-comments-title">댓글 {commentsPage?.totalElements ?? 0}</h3>

        {isCommentsLoading ? (
          <p className="helper-text">댓글을 불러오는 중입니다.</p>
        ) : commentsErrorMessage ? (
          <>
            <p className="message error">{commentsErrorMessage}</p>
            <div className="community-pagination">
              <button className="ghost-button community-page-button" type="button" onClick={handleRetryComments}>
                다시 시도
              </button>
            </div>
          </>
        ) : commentItems.length === 0 ? (
          <p className="community-comments-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
        ) : (
          <>
            <div className="community-comments-list">
              {commentItems.map((comment) => (
                <div key={comment.id} className="community-comment-item">
                  <div className="community-comment-header">
                    <div className="community-comment-meta">
                      <span className="community-comment-author">{comment.authorNickname}</span>
                      <span className="community-comment-date">{formatCommunityDate(comment.createdAt)}</span>
                    </div>
                    {canDeleteComment(comment.authorNickname) ? (
                      <button
                        className="community-comment-delete"
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                        aria-label="댓글 삭제"
                      >
                        {deletingCommentId === comment.id ? '삭제 중...' : '삭제'}
                      </button>
                    ) : null}
                  </div>
                  <div className="community-comment-content">{comment.content}</div>
                </div>
              ))}
            </div>

            <GroupedPagination
              className="community-pagination"
              buttonClassName="community-page-button"
              currentPage={currentCommentPage}
              totalPages={totalCommentPages}
              hasPrevious={commentsPage?.hasPrevious ?? currentCommentPage > 1}
              hasNext={commentsPage?.hasNext ?? false}
              onPageChange={setCurrentCommentPage}
            />
          </>
        )}

        {!currentUser ? (
          <div className="community-comment-login-cta">
            <p className="helper-text">댓글 작성은 로그인 후 이용할 수 있습니다.</p>
            <Link to="/login" state={{ from: returnTo }} className="ghost-button">
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <form className="community-comment-form" onSubmit={handleAddComment}>
            {commentActionErrorMessage ? <p className="message error">{commentActionErrorMessage}</p> : null}
            <textarea
              className="community-comment-input"
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              placeholder="댓글을 작성해주세요."
              rows={3}
              maxLength={500}
              disabled={isCommentSubmitting}
            />
            <div className="community-comment-form-actions">
              <button type="submit" className="primary-button" disabled={isCommentSubmitting}>
                {isCommentSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
