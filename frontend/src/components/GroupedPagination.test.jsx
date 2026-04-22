import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GroupedPagination from './GroupedPagination.jsx'

describe('GroupedPagination', () => {
  it('should_render_only_current_page_group_when_total_pages_exceed_group_size', () => {
    render(
      <GroupedPagination
        currentPage={1}
        totalPages={23}
        hasPrevious={false}
        hasNext
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '11' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '>>' })).toBeInTheDocument()
  })

  it('should_jump_to_previous_and_next_page_groups_when_group_buttons_are_clicked', () => {
    const handlePageChange = vi.fn()

    render(
      <GroupedPagination
        currentPage={11}
        totalPages={23}
        hasPrevious
        hasNext
        onPageChange={handlePageChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '<<' }))
    fireEvent.click(screen.getByRole('button', { name: '>>' }))

    expect(handlePageChange).toHaveBeenNthCalledWith(1, 1)
    expect(handlePageChange).toHaveBeenNthCalledWith(2, 21)
  })

  it('should_render_nothing_when_total_pages_is_one_or_less', () => {
    const { container } = render(
      <GroupedPagination
        currentPage={1}
        totalPages={1}
        hasPrevious={false}
        hasNext={false}
        onPageChange={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
