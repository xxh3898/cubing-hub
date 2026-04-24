import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const { mockUseAuth, toastClassResults } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  toastClassResults: [],
}))

vi.mock('./context/useAuth.js', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('react-toastify', () => ({
  ToastContainer: (props) => {
    toastClassResults.length = 0
    toastClassResults.push(props.toastClassName())
    toastClassResults.push(props.toastClassName({ type: 'success' }))

    return <div data-testid="toast-container">ToastContainer</div>
  },
}))

vi.mock('./pages/CommunityPage.jsx', () => ({ default: () => <div>CommunityPage Mock</div> }))
vi.mock('./pages/HomePage.jsx', () => ({ default: () => <div>HomePage Mock</div> }))
vi.mock('./pages/LearningPage.jsx', () => ({ default: () => <div>LearningPage Mock</div> }))
vi.mock('./pages/RankingsPage.jsx', () => ({ default: () => <div>RankingsPage Mock</div> }))
vi.mock('./pages/CommunityDetailPage.jsx', () => ({ default: () => <div>CommunityDetailPage Mock</div> }))
vi.mock('./pages/CommunityWritePage.jsx', () => ({ default: () => <div>CommunityWritePage Mock</div> }))
vi.mock('./pages/FeedbackPage.jsx', () => ({ default: () => <div>FeedbackPage Mock</div> }))
vi.mock('./pages/QnaPage.jsx', () => ({ default: () => <div>QnaPage Mock</div> }))
vi.mock('./pages/QnaDetailPage.jsx', () => ({ default: () => <div>QnaDetailPage Mock</div> }))
vi.mock('./pages/AdminPage.jsx', () => ({ default: () => <div>AdminPage Mock</div> }))
vi.mock('./pages/AdminFeedbackDetailPage.jsx', () => ({ default: () => <div>AdminFeedbackDetailPage Mock</div> }))
vi.mock('./pages/AdminMemoDetailPage.jsx', () => ({ default: () => <div>AdminMemoDetailPage Mock</div> }))
vi.mock('./pages/TimerPage.jsx', () => ({ default: () => <div>TimerPage Mock</div> }))
vi.mock('./pages/LoginPage.jsx', () => ({ default: () => <div>LoginPage Mock</div> }))
vi.mock('./pages/ResetPasswordPage.jsx', () => ({ default: () => <div>ResetPasswordPage Mock</div> }))
vi.mock('./pages/SignupPage.jsx', () => ({ default: () => <div>SignupPage Mock</div> }))
vi.mock('./pages/MyPage.jsx', () => ({ default: () => <div>MyPage Mock</div> }))

import App from './App.jsx'

function buildAuthState(overrides = {}) {
  return {
    accessToken: null,
    currentUser: null,
    hasAuthToken: false,
    isAuthenticated: false,
    isAuthLoading: false,
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
    updateCurrentUser: vi.fn(),
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

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastClassResults.length = 0
    mockUseAuth.mockReturnValue(buildAuthState())
  })

  it.each([
    ['/', 'HomePage Mock'],
    ['/timer', 'TimerPage Mock'],
    ['/rankings', 'RankingsPage Mock'],
    ['/learning', 'LearningPage Mock'],
    ['/community', 'CommunityPage Mock'],
    ['/community/7', 'CommunityDetailPage Mock'],
    ['/qna', 'QnaPage Mock'],
    ['/qna/3', 'QnaDetailPage Mock'],
    ['/signup', 'SignupPage Mock'],
    ['/reset-password', 'ResetPasswordPage Mock'],
    ['/auth', 'LoginPage Mock'],
  ])('should_render_public_route_when_%s_is_requested', async (path, expectedText) => {
    renderApp(path)

    expect(await screen.findByText(expectedText)).toBeInTheDocument()
  })

  it.each([
    ['/community/write', 'CommunityWritePage Mock'],
    ['/community/5/edit', 'CommunityWritePage Mock'],
    ['/mypage', 'MyPage Mock'],
    ['/feedback', 'FeedbackPage Mock'],
  ])('should_render_protected_route_when_%s_is_requested_by_authenticated_user', async (path, expectedText) => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: true,
      currentUser: {
        nickname: 'CubeMaster',
        role: 'ROLE_USER',
      },
    }))

    renderApp(path)

    expect(await screen.findByText(expectedText)).toBeInTheDocument()
  })

  it('should_redirect_to_login_when_protected_route_is_requested_with_token_but_without_authenticated_user', async () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: false,
    }))

    renderApp('/mypage')

    expect(await screen.findByText('LoginPage Mock')).toBeInTheDocument()
  })

  it('should_render_auth_loading_page_when_guest_only_route_is_requested_during_auth_loading', () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      isAuthLoading: true,
    }))

    renderApp('/login')

    expect(screen.getByRole('heading', { name: '인증 확인 중' })).toBeInTheDocument()
  })

  it('should_redirect_authenticated_guest_only_route_to_custom_return_path_when_from_state_exists', async () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: true,
      currentUser: {
        nickname: 'CubeMaster',
        role: 'ROLE_USER',
      },
    }))

    renderApp({
      pathname: '/login',
      state: {
        from: '/timer?tab=recent#records',
      },
    })

    expect(await screen.findByText('TimerPage Mock')).toBeInTheDocument()
  })

  it('should_render_admin_routes_when_admin_user_is_authenticated', async () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: true,
      currentUser: {
        nickname: 'AdminMaster',
        role: 'ROLE_ADMIN',
      },
    }))

    const adminPage = renderApp('/admin')
    expect(await screen.findByText('AdminPage Mock')).toBeInTheDocument()
    adminPage.unmount()

    const adminFeedbackPage = renderApp('/admin/feedbacks/3')
    expect(await screen.findByText('AdminFeedbackDetailPage Mock')).toBeInTheDocument()
    adminFeedbackPage.unmount()

    renderApp('/admin/memos/5')
    expect(await screen.findByText('AdminMemoDetailPage Mock')).toBeInTheDocument()
  })

  it('should_render_auth_loading_page_when_admin_route_is_requested_during_auth_loading', () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      isAuthLoading: true,
    }))

    renderApp('/admin')

    expect(screen.getByRole('heading', { name: '인증 확인 중' })).toBeInTheDocument()
  })

  it('should_redirect_admin_route_to_login_when_user_is_not_authenticated', async () => {
    renderApp('/admin')

    expect(await screen.findByText('LoginPage Mock')).toBeInTheDocument()
  })

  it('should_redirect_admin_route_to_home_when_non_admin_user_is_authenticated', async () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: true,
      currentUser: {
        nickname: 'CubeMaster',
        role: 'ROLE_USER',
      },
    }))

    renderApp('/admin')

    expect(await screen.findByText('HomePage Mock')).toBeInTheDocument()
  })

  it('should_render_admin_navigation_account_label_and_toast_class_names_when_admin_user_is_present', async () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      hasAuthToken: true,
      isAuthenticated: true,
      currentUser: {
        nickname: 'AdminMaster',
        role: 'ROLE_ADMIN',
      },
    }))

    renderApp('/')

    expect(await screen.findByText('HomePage Mock')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '관리자' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AdminMaster' })).toHaveAttribute('href', '/mypage')
    expect(screen.getByRole('link', { name: '개발자 피드백' })).toHaveAttribute('href', '/feedback')
    expect(screen.getByTestId('toast-container')).toBeInTheDocument()
    expect(toastClassResults).toEqual(['app-toast app-toast-default', 'app-toast app-toast-success'])
  })

  it('should_render_guest_account_chip_when_no_auth_token_exists', async () => {
    renderApp('/')

    expect(await screen.findByText('HomePage Mock')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
  })

  it('should_render_loading_account_label_when_auth_status_is_loading', () => {
    mockUseAuth.mockReturnValue(buildAuthState({
      isAuthLoading: true,
    }))

    renderApp('/')

    expect(screen.getByRole('link', { name: '계정 확인 중' })).toHaveAttribute('href', '/login')
  })
})
