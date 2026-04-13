import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signUp } from '../api.js'
import { eventOptions } from '../constants/eventOptions.js'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [mainEvent, setMainEvent] = useState('WCA_333')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/'

  const handleSignup = async (e) => {
    e.preventDefault()

    if (!email || !password || !passwordConfirm || !nickname) {
      setErrorMessage('모든 입력란을 채워주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signUp({ email, password, nickname, mainEvent })
      navigate('/login', {
        replace: true,
        state: {
          from: returnTo,
          notice: '회원가입이 완료되었습니다. 로그인해주세요.',
          email,
        },
      })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-grid auth-page">
      <div className="panel auth-panel">
        <div className="auth-header">
          <h2>회원가입</h2>
          <p className="helper-text">서비스 이용을 위해 계정을 생성합니다.</p>
        </div>
        {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
        <form onSubmit={handleSignup} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="signup-email">이메일</label>
            <input
              type="email"
              id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@cubinghub.com"
              required
              disabled={isSubmitting}
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
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="field">
            <label htmlFor="signup-main-event">주 종목</label>
            <select
              id="signup-main-event"
              value={mainEvent}
              onChange={(e) => setMainEvent(e.target.value)}
              disabled={isSubmitting}
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
              required
              disabled={isSubmitting}
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
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
              {isSubmitting ? '가입 중...' : '가입완료'}
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="helper-text">이미 계정이 있으신가요?</p>
          <Link to="/login" state={{ from: returnTo }} className="ghost-button">로그인하러 가기</Link>
        </div>
      </div>
    </section>
  )
}
