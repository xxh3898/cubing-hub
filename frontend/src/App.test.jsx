import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import { useAuth } from './context/useAuth.js'

vi.mock('./context/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

function buildAuthState(overrides = {}) {
  return {
    accessToken: null,
    currentUser: null,
    hasAuthToken: false,
    isAuthenticated: false,
    isAuthLoading: false,
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
    ...overrides,
  }
}

function renderApp(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should_render_auth_loading_page_when_protected_route_is_requested_during_bootstrap', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthState({
      isAuthLoading: true,
    }))

    renderApp('/mypage')

    expect(screen.getByRole('heading', { name: '인증 확인 중' })).toBeInTheDocument()
  })

  it('should_redirect_to_login_when_protected_route_is_requested_without_authenticated_user', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthState())

    renderApp('/mypage')

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })

  it('should_redirect_to_login_when_feedback_route_is_requested_without_authenticated_user', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthState())

    renderApp('/feedback')

    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })

  it('should_redirect_to_home_when_guest_only_route_is_requested_by_authenticated_user', () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthState({
      accessToken: 'fresh-token',
      currentUser: {
        nickname: 'CubeMaster',
      },
      hasAuthToken: true,
      isAuthenticated: true,
    }))

    renderApp('/login')

    expect(screen.queryByRole('heading', { name: '로그인' })).not.toBeInTheDocument()
    expect(screen.getByText('홈 화면을 불러오는 중입니다.')).toBeInTheDocument()
  })
})
