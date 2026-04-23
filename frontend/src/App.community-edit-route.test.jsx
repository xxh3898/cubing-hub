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

describe('App community edit route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should_redirect_to_login_when_edit_route_is_requested_without_authenticated_user', async () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthState())

    render(
      <MemoryRouter initialEntries={['/community/5/edit']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })
})
