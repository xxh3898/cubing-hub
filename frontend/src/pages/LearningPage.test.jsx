import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LearningPage from './LearningPage.jsx'

describe('LearningPage', () => {
  it('should_render_wca_notation_tab_by_default', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: '회전기호 가이드' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: '회전기호 가이드' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '상(U)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "상'(U')" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '상2(U2)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'U visual cube' })).toHaveAttribute(
      'src',
      expect.stringContaining('alg=U'),
    )
    expect(screen.getByRole('img', { name: 'U visual cube' })).not.toHaveAttribute(
      'src',
      expect.stringContaining('case=U'),
    )
    expect(screen.getByRole('img', { name: "U' visual cube" })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'U2 visual cube' })).toBeInTheDocument()
    expect(screen.queryByText('x y z')).not.toBeInTheDocument()
  })

  it('should_render_cfop_cases_when_cfop_tab_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'F2L' }))

    expect(screen.getByRole('tab', { name: 'F2L' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'F2L' })).toBeInTheDocument()
    expect(screen.getByText("U R U' R'")).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'F2L 01 visual cube' })).toHaveAttribute(
      'src',
      expect.stringContaining('case=U+R+U%27+R%27'),
    )
  })
})
