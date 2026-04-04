import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CommunityWritePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('FREE')
  const navigate = useNavigate()

  const currentUsername = 'guest_user' // 인증 연동 시 교체 예정
  const isAdmin = currentUsername === 'admin'

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    // 관리자가 아닌데 공지사항으로 올리려 할 때의 방어 로직
    if (category === 'NOTICE' && !isAdmin) {
      alert('공지사항은 관리자만 작성할 수 있습니다.')
      return
    }

    // 목업: 등록 성공 처리
    alert('게시글이 성공적으로 등록되었습니다. (목업)')
    navigate('/community')
  }

  return (
    <section className="page-grid community-write-page">
      <div className="panel community-write-panel">
        <h2 className="community-write-title">새 게시글 작성</h2>
        <form onSubmit={handleSubmit} className="form-grid community-write-form">
          <div className="field">
            <label htmlFor="category">카테고리</label>
            <select 
              id="category" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="FREE">자유게시판</option>
              {isAdmin && <option value="NOTICE">공지사항</option>}
              {/* 추가 카테고리가 있다면 여기에 추가 */}
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
            />
          </div>
          <div className="community-write-actions">
            <button 
              type="button" 
              className="ghost-button" 
              onClick={() => navigate('/community')}
            >
              취소
            </button>
            <button type="submit" className="primary-button">
              등록
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
