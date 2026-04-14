import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function SmokeComponent() {
  return <p>React test environment ready</p>
}

describe('React test environment', () => {
  it('should_render_component_when_test_environment_is_configured', () => {
    render(<SmokeComponent />)

    expect(screen.getByText('React test environment ready')).toBeInTheDocument()
  })
})
