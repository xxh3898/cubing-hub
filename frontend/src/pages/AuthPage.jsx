import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, signUp } from '../api.js'
import { useAuth } from '../context/useAuth.js'
import { eventOptions } from '../constants/eventOptions.js'

const initialSignUpForm = {
  email: '',
  password: '',
  nickname: '',
  mainEvent: '',
}

const initialLoginForm = {
  email: '',
  password: '',
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { setAccessToken } = useAuth()
  const [signUpForm, setSignUpForm] = useState(initialSignUpForm)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signUpMessage, setSignUpMessage] = useState(null)
  const [loginMessage, setLoginMessage] = useState(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleSignUpChange = (event) => {
    const { name, value } = event.target
    setSignUpForm((current) => ({ ...current, [name]: value }))
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  const handleSignUpSubmit = async (event) => {
    event.preventDefault()
    setIsSigningUp(true)
    setSignUpMessage(null)

    try {
      const response = await signUp({
        ...signUpForm,
        mainEvent: signUpForm.mainEvent || null,
      })
      setSignUpMessage({ type: 'success', text: `${response.message} 이제 로그인해 주세요.` })
      setSignUpForm(initialSignUpForm)
    } catch (error) {
      setSignUpMessage({ type: 'error', text: error.message })
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setIsLoggingIn(true)
    setLoginMessage(null)

    try {
      const response = await login(loginForm)
      setAccessToken(response.data.accessToken)
      setLoginMessage({ type: 'success', text: `${response.message} 타이머 페이지로 이동합니다.` })
      setLoginForm(initialLoginForm)
      navigate('/timer')
    } catch (error) {
      setLoginMessage({ type: 'error', text: error.message })
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <section className="page-grid">
      <div className="panel">
        <h2>인증 설정</h2>
        <p className="helper-text">
          회원가입 성공 후 자동 로그인은 하지 않습니다. 로그인은 같은 페이지에서 직접 진행합니다.
        </p>
      </div>

      <div className="panel">
        <div className="two-up">
          <section>
            <h3>회원가입</h3>
            <form className="form-grid" onSubmit={handleSignUpSubmit}>
              <div className="field">
                <label htmlFor="sign-up-email">Email</label>
                <input
                  id="sign-up-email"
                  name="email"
                  type="email"
                  value={signUpForm.email}
                  onChange={handleSignUpChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sign-up-password">Password</label>
                <input
                  id="sign-up-password"
                  name="password"
                  type="password"
                  value={signUpForm.password}
                  onChange={handleSignUpChange}
                  minLength={8}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sign-up-nickname">닉네임</label>
                <input
                  id="sign-up-nickname"
                  name="nickname"
                  type="text"
                  value={signUpForm.nickname}
                  onChange={handleSignUpChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sign-up-main-event">주종목</label>
                <select
                  id="sign-up-main-event"
                  name="mainEvent"
                  value={signUpForm.mainEvent}
                  onChange={handleSignUpChange}
                >
                  <option value="">선택 안 함</option>
                  {eventOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary-button" type="submit" disabled={isSigningUp}>
                {isSigningUp ? '가입 중...' : '회원가입'}
              </button>
              {signUpMessage ? <p className={`message ${signUpMessage.type}`}>{signUpMessage.text}</p> : null}
            </form>
          </section>

          <section>
            <h3>로그인</h3>
            <form className="form-grid" onSubmit={handleLoginSubmit}>
              <div className="field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              <button className="secondary-button" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? '로그인 중...' : '로그인'}
              </button>
              {loginMessage ? <p className={`message ${loginMessage.type}`}>{loginMessage.text}</p> : null}
            </form>
          </section>
        </div>
      </div>
    </section>
  )
}
