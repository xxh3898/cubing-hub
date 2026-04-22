import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPosts } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { communityCategories, communityPageSize } from '../constants/mockCommunity.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'

function formatCommunityDate(value) {
  const date = new Date(value)

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [authorQuery, setAuthorQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [postPage, setPostPage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const searchFilters = useMemo(() => ({
    keyword,
    authorQuery,
  }), [authorQuery, keyword])
  const debouncedSearchFilters = useDebouncedValue(searchFilters)
  const previousSearchFiltersRef = useRef({
    keyword: debouncedSearchFilters.keyword,
    authorQuery: debouncedSearchFilters.authorQuery,
  })

  useEffect(() => {
    let isCancelled = false
    const searchFiltersChanged =
      previousSearchFiltersRef.current.keyword !== debouncedSearchFilters.keyword ||
      previousSearchFiltersRef.current.authorQuery !== debouncedSearchFilters.authorQuery

    previousSearchFiltersRef.current = {
      keyword: debouncedSearchFilters.keyword,
      authorQuery: debouncedSearchFilters.authorQuery,
    }

    if (searchFiltersChanged && currentPage !== 1) {
      setCurrentPage(1)
      return undefined
    }

    const loadPosts = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getPosts({
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
          keyword: debouncedSearchFilters.keyword.trim() || undefined,
          author: debouncedSearchFilters.authorQuery.trim() || undefined,
          page: currentPage,
          size: communityPageSize,
        })

        if (isCancelled) {
          return
        }

        const nextPage = response.data
        const normalizedPage = nextPage.totalPages > 0 ? Math.min(currentPage, nextPage.totalPages) : 1

        if (normalizedPage !== currentPage) {
          setCurrentPage(normalizedPage)
          return
        }

        setPostPage(nextPage)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPosts()

    return () => {
      isCancelled = true
    }
  }, [currentPage, debouncedSearchFilters, reloadKey, selectedCategory])

  const handleCategoryChange = (categoryKey) => {
    setSelectedCategory(categoryKey)
    setCurrentPage(1)
  }

  const handleKeywordChange = (event) => {
    setKeyword(event.target.value)
  }

  const handleAuthorQueryChange = (event) => {
    setAuthorQuery(event.target.value)
  }

  const handleRetry = () => {
    setReloadKey((current) => current + 1)
  }

  const pagePosts = postPage?.items ?? []
  const totalPages = postPage?.totalPages ?? 0

  return (
    <section className="page-grid community-page">
      <div className="panel community-header-panel">
        <div className="community-header-copy">
          <p className="eyebrow">Community</p>
          <h2>커뮤니티</h2>
          <p className="helper-text">게시글을 빠르게 훑고, 제목/본문과 작성자 조건으로 필요한 글을 바로 찾을 수 있는 커뮤니티 보드입니다.</p>
        </div>
      </div>

      <div className="panel community-board-panel">
        <div className="community-board-toolbar">
          <div className="community-category-row">
            {communityCategories.map((category) => (
              <button
                key={category.key}
                className={category.key === selectedCategory ? 'primary-button community-category-button' : 'ghost-button community-category-button'}
                type="button"
                onClick={() => handleCategoryChange(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          <Link to="/community/write" className="primary-button community-write-button">
            글쓰기
          </Link>
        </div>

        <div className="community-search-grid">
          <div className="field community-search-field">
            <label htmlFor="community-keyword-search">제목/본문 검색</label>
            <input
              id="community-keyword-search"
              type="text"
              value={keyword}
              onChange={handleKeywordChange}
              placeholder="제목 또는 본문으로 검색"
            />
          </div>

          <div className="field community-search-field">
            <label htmlFor="community-author-search">작성자 검색</label>
            <input
              id="community-author-search"
              type="text"
              value={authorQuery}
              onChange={handleAuthorQueryChange}
              placeholder="작성자 닉네임으로 검색"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="helper-text">게시글 목록을 불러오는 중입니다.</p>
        ) : errorMessage ? (
          <>
            <p className="message error">{errorMessage}</p>
            <div className="community-pagination">
              <button className="ghost-button community-page-button" type="button" onClick={handleRetry}>
                다시 시도
              </button>
            </div>
          </>
        ) : pagePosts.length === 0 ? (
          <p className="helper-text">조건에 맞는 게시글이 없습니다.</p>
        ) : (
          <div className="record-table-wrap">
            <table className="record-table community-table">
              <colgroup>
                <col className="community-col-category" />
                <col className="community-col-title" />
                <col className="community-col-author" />
                <col className="community-col-views" />
                <col className="community-col-date" />
              </colgroup>
              <thead>
                <tr>
                  <th>분류</th>
                  <th>제목</th>
                  <th>작성자</th>
                  <th>조회</th>
                  <th>작성일</th>
                </tr>
              </thead>
              <tbody>
                {pagePosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.category === 'NOTICE' ? '공지' : '자유'}</td>
                    <td className="community-title-cell">
                      <Link to={`/community/${post.id}`}>{post.title}</Link>
                    </td>
                    <td>{post.authorNickname}</td>
                    <td>{post.viewCount}</td>
                    <td>{formatCommunityDate(post.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <GroupedPagination
          className="community-pagination"
          buttonClassName="community-page-button"
          currentPage={currentPage}
          totalPages={totalPages}
          hasPrevious={postPage?.hasPrevious ?? currentPage > 1}
          hasNext={postPage?.hasNext ?? false}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  )
}
