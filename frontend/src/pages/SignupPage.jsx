import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventOptions } from '../constants/eventOptions.js'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [mainEvent, setMainEvent] = useState('WCA_333')
  const navigate = useNavigate()

  const handleSignup = (e) => {
    e.preventDefault()
    
    if (!email || !password || !passwordConfirm || !nickname) {
      alert('모든 입력란을 채워주세요.')
      return
    }

    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    // [TODO] API 연동 시 아래 주석 해제 및 활용
    // const payload = { email, password, nickname, mainEvent }
    // await signUp(payload)

    // 목업 회원가입 동작
    alert('회원가입이 완료되었습니다! 로그인해주세요. (목업)')
    navigate('/login', { replace: true })
  }

  return (
    <section className="page-grid auth-page">
      <div className="panel auth-panel">
        <div className="auth-header">
          <h2>회원가입</h2>
          <p className="helper-text">서비스 이용을 위해 계정을 생성합니다.</p>
        </div>
        <form onSubmit={handleSignup} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="signup-email">이메일</label>
            <input
              type="email"
              id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@cubinghub.com"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-nickname">닉네임</label>
            <input
              type="text"
              id="signup-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="사용할 닉네임을 입력하세요"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-main-event">주 종목</label>
            <select
              id="signup-main-event"
              value={mainEvent}
              onChange={(e) => setMainEvent(e.target.value)}
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="signup-password">비밀번호</label>
            <input
              type="password"
              id="signup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
            <input
              type="password"
              id="signup-password-confirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit">
              가입완료
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="helper-text">이미 계정이 있으신가요?</p>
          <Link to="/login" className="ghost-button">로그인하러 가기</Link>
        </div>
      </div>
    </section>
  )
}
