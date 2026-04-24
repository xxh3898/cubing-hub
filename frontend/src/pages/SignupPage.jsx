/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { confirmEmailVerification, requestEmailVerification, signUp } from '../api.js'
import { INPUT_LIMITS, PASSWORD_MIN_LENGTH } from '../constants/inputLimits.js'
import { eventOptions } from '../constants/eventOptions.js'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [mainEvent, setMainEvent] = useState('WCA_333')
  const [verificationMessage, setVerificationMessage] = useState(null)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [isConfirmingCode, setIsConfirmingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/'
  const isBusy = isSubmitting || isRequestingCode || isConfirmingCode

  const resetVerificationState = () => {
    setVerificationCode('')
    setVerificationMessage(null)
    setIsEmailVerified(false)
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    resetVerificationState()
    setErrorMessage(null)
  }

  const handleRequestVerificationCode = async () => {
    const validationError = getVerificationRequestError(email)
    /* v8 ignore next -- button stays disabled until email is present */
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsRequestingCode(true)
    setErrorMessage(null)
    setVerificationMessage(null)
    setIsEmailVerified(false)

    try {
      await requestEmailVerification({ email })
      setVerificationMessage('인증번호를 전송했습니다. 이메일을 확인해주세요.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsRequestingCode(false)
    }
  }

  const handleConfirmVerificationCode = async () => {
    const validationError = getVerificationConfirmError(email, verificationCode)
    /* v8 ignore next -- button stays disabled until both email and verificationCode are present */
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsConfirmingCode(true)
    setErrorMessage(null)

    try {
      await confirmEmailVerification({ email, code: verificationCode })
      setIsEmailVerified(true)
      setVerificationMessage('이메일 인증이 완료되었습니다.')
    } catch (error) {
      setIsEmailVerified(false)
      setErrorMessage(error.message)
    } finally {
      setIsConfirmingCode(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    if (!email || !verificationCode || !password || !passwordConfirm || !nickname) {
      setErrorMessage('모든 입력란을 채워주세요.')
      return
    }

    if (!isEmailVerified) {
      setErrorMessage('이메일 인증이 필요합니다.')
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
          <p className="helper-text">이메일 인증 후 계정을 생성합니다.</p>
        </div>
        {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
        {verificationMessage ? (
          <p className={`message ${isEmailVerified ? 'success' : 'info'} auth-message`}>
            {verificationMessage}
          </p>
        ) : null}
        <form onSubmit={handleSignup} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="signup-email">이메일</label>
            <div className="auth-inline-row">
              <input
                type="email"
                id="signup-email"
                value={email}
                onChange={handleEmailChange}
                placeholder="example@cubinghub.com"
                maxLength={INPUT_LIMITS.email}
                required
                disabled={isBusy}
              />
              <button
                type="button"
                className="ghost-button auth-inline-button"
                onClick={handleRequestVerificationCode}
                disabled={isBusy || !email}
              >
                {isRequestingCode ? '전송 중...' : '인증번호 받기'}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="signup-verification-code">인증번호</label>
            <div className="auth-inline-row">
              <input
                type="text"
                id="signup-verification-code"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value)
                  setErrorMessage(null)
                }}
                placeholder="6자리 인증번호를 입력하세요"
                maxLength={6}
                required
                disabled={isBusy || isEmailVerified}
              />
              <button
                type="button"
                className="ghost-button auth-inline-button"
                onClick={handleConfirmVerificationCode}
                disabled={isBusy || !email || !verificationCode || isEmailVerified}
              >
                {isConfirmingCode ? '확인 중...' : isEmailVerified ? '인증 완료' : '인증 확인'}
              </button>
            </div>
            <p className="helper-text">인증번호를 받은 뒤 10분 안에 입력해주세요.</p>
          </div>
          <div className="field">
            <label htmlFor="signup-nickname">닉네임</label>
            <input
              type="text"
              id="signup-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임을 입력하세요"
                maxLength={INPUT_LIMITS.nickname}
                required
                disabled={isBusy}
              />
          </div>
          <div className="field">
            <label htmlFor="signup-main-event">주 종목</label>
            <select
              id="signup-main-event"
              value={mainEvent}
              onChange={(e) => setMainEvent(e.target.value)}
              disabled={isBusy}
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
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={INPUT_LIMITS.password}
              required
              disabled={isBusy}
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
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={INPUT_LIMITS.password}
              required
              disabled={isBusy}
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit" disabled={isBusy || !isEmailVerified}>
              {isSubmitting ? '가입 중...' : '가입 완료'}
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

export function getVerificationRequestError(email) {
  return !email ? '이메일을 입력해주세요.' : null
}

export function getVerificationConfirmError(email, verificationCode) {
  return !email || !verificationCode ? '이메일과 인증번호를 모두 입력해주세요.' : null
}
