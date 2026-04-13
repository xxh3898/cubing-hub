import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { mockCommunityPosts } from '../constants/mockCommunity.js'
import { useAuth } from '../context/useAuth.js'

function formatCommunityDate(value) {
  const date = new Date(value)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function CommunityDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, isAuthenticated } = useAuth()
  const postId = parseInt(id, 10)
  const post = mockCommunityPosts.find((p) => p.id === postId)
  
  const [comments, setComments] = useState(post ? (post.comments || []) : [])
  const [newComment, setNewComment] = useState('')

  const currentUsername = currentUser?.nickname ?? null
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  if (!post) {
    return (
      <section className="page-grid community-detail-page">
        <div className="panel">
          <p className="message error">게시글을 찾을 수 없습니다.</p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/community" className="ghost-button">목록으로</Link>
          </div>
        </div>
      </section>
    )
  }

  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const newCommentObj = {
      id: Date.now(),
      authorNickname: currentUsername,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    }

    setComments([...comments, newCommentObj])
    setNewComment('')
  }

  const handleDeleteComment = (commentId) => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      setComments(comments.filter((comment) => comment.id !== commentId))
    }
  }

  const canDelete = (authorItem) => {
    return Boolean(currentUsername && authorItem === currentUsername)
  }

  const handleDeletePost = () => {
    if (window.confirm('게시글을 삭제하시겠습니까?')) {
      alert('게시글이 삭제되었습니다. (목업)')
      navigate('/community')
    }
  }

  return (
    <section className="page-grid community-detail-page">
      <div className="panel community-detail-header-panel">
        <div className="community-detail-meta-row">
          <span className="eyebrow">{post.category === 'NOTICE' ? '공지' : '자유'}</span>
        </div>
        <h2 className="community-detail-title">{post.title}</h2>
        <div className="community-detail-info">
          <span className="community-detail-author">{post.authorNickname}</span>
          <span className="community-detail-date">{formatCommunityDate(post.createdAt)}</span>
          <span className="community-detail-views">조회 {post.viewCount}</span>
        </div>
      </div>

      <div className="panel community-detail-content-panel">
        <div className="community-detail-content">
          {post.content.split('\n').map((line, index) => (
            <span key={index}>
              {line}
              <br />
            </span>
          ))}
        </div>
        <div className="community-detail-actions">
          {canDelete(post.authorNickname) && (
            <button 
              className="ghost-button community-post-delete"
              onClick={handleDeletePost}
            >
              삭제
            </button>
          )}
          <Link to="/community" className="ghost-button community-back-button">목록으로</Link>
        </div>
      </div>

      <div className="panel community-comments-panel">
        <h3 className="community-comments-title">댓글 {comments.length}</h3>
        
        <div className="community-comments-list">
          {comments.length === 0 ? (
            <p className="community-comments-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="community-comment-item">
                <div className="community-comment-header">
                  <div className="community-comment-meta">
                    <span className="community-comment-author">{comment.authorNickname}</span>
                    <span className="community-comment-date">{formatCommunityDate(comment.createdAt)}</span>
                  </div>
                  {canDelete(comment.authorNickname) && (
                    <button 
                      className="community-comment-delete" 
                      onClick={() => handleDeleteComment(comment.id)}
                      aria-label="댓글 삭제"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="community-comment-content">{comment.content}</div>
              </div>
            ))
          )}
        </div>

        {!isAuthenticated ? (
          <div className="community-comment-login-cta">
            <p className="helper-text">댓글 작성은 로그인 후 이용할 수 있습니다.</p>
            <Link to="/login" state={{ from: returnTo }} className="ghost-button">
              로그인하러 가기
            </Link>
          </div>
        ) : (
          <form className="community-comment-form" onSubmit={handleAddComment}>
            <textarea
              className="community-comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성해주세요."
              rows={3}
            />
            <div className="community-comment-form-actions">
              <button type="submit" className="primary-button" disabled={!newComment.trim()}>
                등록
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
