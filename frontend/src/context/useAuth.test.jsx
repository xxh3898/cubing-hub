import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './useAuth.js'

describe('useAuth', () => {
  it('should_return_auth_context_when_hook_is_used_within_provider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    })

    expect(result.current).toMatchObject({
      hasAuthToken: false,
      isAuthenticated: false,
      isAuthLoading: true,
    })
  })

  it('should_throw_error_when_hook_is_used_outside_provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
  })
})
