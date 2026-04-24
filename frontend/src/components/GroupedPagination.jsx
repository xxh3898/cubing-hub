/* eslint-disable react-refresh/only-export-components */
const PAGE_GROUP_SIZE = 10

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

export function buildVisiblePageNumbers(currentPage, totalPages, groupSize) {
  if (totalPages < 1) {
    return []
  }

  const groupStartPage = Math.floor((currentPage - 1) / groupSize) * groupSize + 1
  const groupEndPage = Math.min(totalPages, groupStartPage + groupSize - 1)

  return Array.from({ length: groupEndPage - groupStartPage + 1 }, (_, index) => groupStartPage + index)
}

export default function GroupedPagination({
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  className = '',
  buttonClassName = '',
  groupSize = PAGE_GROUP_SIZE,
}) {
  if (totalPages <= 1) {
    return null
  }

  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPages, groupSize)
  const firstPageInGroup = pageNumbers[0]
  const lastPageInGroup = pageNumbers.at(-1)

  return (
    <div className={className}>
      {firstPageInGroup > 1 ? (
        <button
          className={joinClassNames('ghost-button', buttonClassName)}
          type="button"
          onClick={() => onPageChange(Math.max(1, firstPageInGroup - groupSize))}
        >
          {'<<'}
        </button>
      ) : null}

      <button
        className={joinClassNames('ghost-button', buttonClassName)}
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={!hasPrevious}
      >
        이전
      </button>

      {pageNumbers.map((pageNumber) => (
        <button
          key={pageNumber}
          className={joinClassNames(pageNumber === currentPage ? 'primary-button' : 'ghost-button', buttonClassName)}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          disabled={pageNumber === currentPage}
        >
          {pageNumber}
        </button>
      ))}

      <button
        className={joinClassNames('ghost-button', buttonClassName)}
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        다음
      </button>

      {lastPageInGroup < totalPages ? (
        <button
          className={joinClassNames('ghost-button', buttonClassName)}
          type="button"
          onClick={() => onPageChange(lastPageInGroup + 1)}
        >
          {'>>'}
        </button>
      ) : null}
    </div>
  )
}
