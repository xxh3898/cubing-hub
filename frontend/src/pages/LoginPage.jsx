import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearRefreshCookie, login } from '../api.js'
import { INPUT_LIMITS, PASSWORD_MIN_LENGTH } from '../constants/inputLimits.js'
import { useAuth } from '../context/useAuth.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { setAccessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/'
  const noticeMessage = typeof location.state?.notice === 'string' ? location.state.notice : null
  const prefilledEmail = typeof location.state?.email === 'string' ? location.state.email : ''

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail)
    }
  }, [prefilledEmail])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setErrorMessage('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await login({ email, password })
      const nextAccessToken = response.data?.accessToken

      if (!nextAccessToken) {
        throw new Error('로그인 응답에 access token이 없습니다.')
      }

      await setAccessToken(nextAccessToken)
      navigate(returnTo, { replace: true })
    } catch (error) {
      if (error?.isNetworkError) {
        try {
          await clearRefreshCookie()
          setErrorMessage('세션 쿠키를 정리했습니다. 다시 로그인해주세요.')
          return
        } catch {
          // fallback to the original network error message below
        }
      }

      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-grid auth-page">
      <div className="panel auth-panel">
        <div className="auth-header">
          <h2>로그인</h2>
          <p className="helper-text">서비스 이용을 위해 로그인해주세요.</p>
        </div>
        {noticeMessage ? <p className="message success auth-message">{noticeMessage}</p> : null}
        {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
        <form onSubmit={handleLogin} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="login-email">이메일</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@cubinghub.com"
              maxLength={INPUT_LIMITS.email}
              required
              disabled={isSubmitting}
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
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={INPUT_LIMITS.password}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="helper-text">비밀번호를 잊으셨나요?</p>
          <Link to="/reset-password" className="ghost-button">비밀번호 재설정</Link>
          <p className="helper-text">아직 계정이 없으신가요?</p>
          <Link to="/signup" state={{ from: returnTo }} className="ghost-button">회원가입</Link>
        </div>
      </div>
    </section>
  )
}
