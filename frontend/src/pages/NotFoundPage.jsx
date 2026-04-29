import { Compass, Home, Undo2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="page-grid auth-page">
      <div className="auth-status-shell">
        <div className="panel auth-panel auth-status-panel">
          <span className="auth-header-icon auth-status-icon" aria-hidden="true">
            <Compass size={20} />
          </span>
          <div className="auth-header">
            <p className="eyebrow">404 Not Found</p>
            <h2>요청하신 페이지를 찾을 수 없어요.</h2>
            <p className="helper-text">주소가 변경되었거나 삭제된 페이지일 수 있습니다. 아래 버튼으로 이동해 주세요.</p>
          </div>

          <div className="auth-actions">
            <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
              <Undo2 size={16} aria-hidden="true" />
              <span>이전 페이지</span>
            </button>
            <Link className="primary-button auth-submit" to="/">
              <Home size={16} aria-hidden="true" />
              <span>홈으로 이동</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
