import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setAccessToken } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    // 목업 로그인 동작
    setAccessToken('mock_token_12345')
    alert('로그인되었습니다. (목업)')
    navigate('/', { replace: true })
  }

  return (
    <section className="page-grid auth-page">
      <div className="panel auth-panel">
        <div className="auth-header">
          <h2>로그인</h2>
          <p className="helper-text">서비스 이용을 위해 로그인해주세요.</p>
        </div>
        <form onSubmit={handleLogin} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="login-email">이메일</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@cubinghub.com"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">비밀번호</label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit">
              로그인
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="helper-text">아직 계정이 없으신가요?</p>
          <Link to="/signup" className="ghost-button">회원가입</Link>
        </div>
      </div>
    </section>
  )
}
