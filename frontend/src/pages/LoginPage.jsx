import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react'
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
        throw new Error('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      }

      await setAccessToken(nextAccessToken)
      navigate(returnTo, { replace: true })
    } catch (error) {
      if (error?.isNetworkError) {
        try {
          await clearRefreshCookie()
          setErrorMessage('세션이 만료되었습니다. 다시 로그인해주세요.')
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
      <div className="auth-shell">
        <aside className="auth-brand-panel" aria-label="CubingHub 인증 안내">
          <div className="auth-brand-mark" aria-hidden="true">
            <img src="/CUBINGHUB.png" alt="" />
          </div>
          <div className="auth-brand-copy">
            <p className="eyebrow">CubingHub</p>
            <h2>오늘 기록을 바로 이어가세요.</h2>
            <p className="helper-text">타이머, 랭킹, 커뮤니티 활동을 하나의 계정으로 연결합니다.</p>
          </div>
        </aside>

        <div className="panel auth-panel">
          <div className="auth-header">
            <span className="auth-header-icon" aria-hidden="true">
              <LogIn size={20} />
            </span>
            <p className="eyebrow">Login</p>
            <h2>로그인</h2>
            <p className="helper-text">서비스 이용을 위해 로그인해주세요.</p>
          </div>
          {noticeMessage ? <p className="message success auth-message">{noticeMessage}</p> : null}
          {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
          <form onSubmit={handleLogin} className="form-grid auth-form">
            <div className="field">
              <label htmlFor="login-email">이메일</label>
              <div className="auth-field-shell">
                <Mail size={17} aria-hidden="true" />
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
            </div>
            <div className="field">
              <label htmlFor="login-password">비밀번호</label>
              <div className="auth-field-shell">
                <KeyRound size={17} aria-hidden="true" />
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
            </div>
            <div className="auth-actions">
              <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
          <div className="auth-footer">
            <div className="auth-footer-item">
              <p className="helper-text">비밀번호를 잊으셨나요?</p>
              <Link to="/reset-password" className="ghost-button">비밀번호 재설정</Link>
            </div>
            <div className="auth-footer-item">
              <p className="helper-text">아직 계정이 없으신가요?</p>
              <Link to="/signup" state={{ from: returnTo }} className="ghost-button">
                <UserPlus size={16} aria-hidden="true" />
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
