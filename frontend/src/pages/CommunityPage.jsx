import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { communityCategories, communityPageSize, mockCommunityPosts } from '../constants/mockCommunity.js'

function formatCommunityDate(value) {
  const date = new Date(value)

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredPosts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return mockCommunityPosts.filter((post) => {
      const categoryMatched = selectedCategory === 'ALL' || post.category === selectedCategory
      const keywordMatched =
        normalizedKeyword.length === 0 ||
        post.title.toLowerCase().includes(normalizedKeyword) ||
        post.authorNickname.toLowerCase().includes(normalizedKeyword)

      return categoryMatched && keywordMatched
    })
  }, [keyword, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / communityPageSize))
  const pagePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * communityPageSize
    return filteredPosts.slice(startIndex, startIndex + communityPageSize)
  }, [currentPage, filteredPosts])

  const handleCategoryChange = (categoryKey) => {
    setSelectedCategory(categoryKey)
    setCurrentPage(1)
  }

  const handleKeywordChange = (event) => {
    setKeyword(event.target.value)
    setCurrentPage(1)
  }

  return (
    <section className="page-grid community-page">
      <div className="panel community-header-panel">
        <div className="community-header-copy">
          <p className="eyebrow">Community</p>
          <h2>커뮤니티</h2>
          <p className="helper-text">게시글을 빠르게 훑고, 제목이나 작성자 기준으로 바로 찾을 수 있는 커뮤니티 보드입니다.</p>
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

        <div className="field community-search-field">
          <label htmlFor="community-search" style={{ display: 'none' }}>검색</label>
          <input
            id="community-search"
            type="text"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="제목 또는 닉네임으로 검색"
          />
        </div>

        {pagePosts.length === 0 ? (
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

        <div className="community-pagination">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1

            return (
              <button
                key={pageNumber}
                className={pageNumber === currentPage ? 'primary-button community-page-button' : 'ghost-button community-page-button'}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                disabled={pageNumber === currentPage}
              >
                {pageNumber}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
