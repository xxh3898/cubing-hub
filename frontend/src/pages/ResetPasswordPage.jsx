/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { confirmPasswordReset, requestPasswordReset } from '../api.js'
import { INPUT_LIMITS, PASSWORD_MIN_LENGTH } from '../constants/inputLimits.js'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const isBusy = isRequestingCode || isSubmitting

  const handleRequestResetCode = async () => {
    const validationError = getResetCodeRequestError(email)
    /* v8 ignore next -- button stays disabled until email is present */
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsRequestingCode(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const response = await requestPasswordReset({ email })
      setInfoMessage(response.message)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsRequestingCode(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!email || !verificationCode || !newPassword || !passwordConfirm) {
      setErrorMessage('모든 입력란을 채워주세요.')
      return
    }

    if (newPassword !== passwordConfirm) {
      setErrorMessage('새 비밀번호가 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await confirmPasswordReset({
        email,
        code: verificationCode,
        newPassword,
      })
      navigate('/login', {
        replace: true,
        state: {
          notice: response.message,
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
          <h2>비밀번호 재설정</h2>
          <p className="helper-text">이메일 인증번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
        </div>
        {errorMessage ? <p className="message error auth-message">{errorMessage}</p> : null}
        {infoMessage ? <p className="message info auth-message">{infoMessage}</p> : null}
        <form onSubmit={handleResetPassword} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="reset-email">이메일</label>
            <div className="auth-inline-row">
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrorMessage(null)
                }}
                placeholder="example@cubinghub.com"
                maxLength={INPUT_LIMITS.email}
                required
                disabled={isBusy}
              />
              <button
                type="button"
                className="ghost-button auth-inline-button"
                onClick={handleRequestResetCode}
                disabled={isBusy || !email}
              >
                {isRequestingCode ? '전송 중...' : '인증번호 받기'}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="reset-code">인증번호</label>
            <input
              type="text"
              id="reset-code"
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(event.target.value)
                setErrorMessage(null)
              }}
              placeholder="6자리 인증번호를 입력하세요"
              maxLength={INPUT_LIMITS.verificationCode}
              required
              disabled={isBusy}
            />
          </div>
          <div className="field">
            <label htmlFor="reset-password">새 비밀번호</label>
            <input
              type="password"
              id="reset-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
                setErrorMessage(null)
              }}
              placeholder="새 비밀번호를 입력하세요"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={INPUT_LIMITS.password}
              required
              disabled={isBusy}
            />
          </div>
          <div className="field">
            <label htmlFor="reset-password-confirm">새 비밀번호 확인</label>
            <input
              type="password"
              id="reset-password-confirm"
              value={passwordConfirm}
              onChange={(event) => {
                setPasswordConfirm(event.target.value)
                setErrorMessage(null)
              }}
              placeholder="새 비밀번호를 다시 입력하세요"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={INPUT_LIMITS.password}
              required
              disabled={isBusy}
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="primary-button auth-submit" disabled={isBusy}>
              {isSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="helper-text">로그인 화면으로 돌아가시겠어요?</p>
          <Link to="/login" className="ghost-button">로그인으로 돌아가기</Link>
        </div>
      </div>
    </section>
  )
}

export function getResetCodeRequestError(email) {
  return !email ? '이메일을 입력해주세요.' : null
}
