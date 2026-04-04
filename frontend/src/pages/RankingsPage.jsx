import { useMemo, useState } from 'react'
import { eventOptions, findEventOption } from '../constants/eventOptions.js'
import { mockRankingItems, mockRankingPages } from '../constants/mockRankings.js'
import { formatTimeMs } from '../utils/formatTime.js'

function getPageItems(items, currentPage, pageSize) {
  const startIndex = (currentPage - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

export default function RankingsPage() {
  const [selectedEvent, setSelectedEvent] = useState('WCA_333')
  const [nicknameQuery, setNicknameQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const rankingItems = useMemo(
    () =>
      mockRankingItems.filter(
        (item) =>
          item.eventType === selectedEvent &&
          item.nickname.toLowerCase().includes(nicknameQuery.trim().toLowerCase()),
      ),
    [nicknameQuery, selectedEvent],
  )
  const totalPages = Math.max(1, Math.ceil(rankingItems.length / mockRankingPages.pageSize))
  const pageItems = useMemo(
    () => getPageItems(rankingItems, currentPage, mockRankingPages.pageSize),
    [currentPage, rankingItems],
  )

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value)
    setCurrentPage(1)
  }

  const handleNicknameQueryChange = (event) => {
    setNicknameQuery(event.target.value)
    setCurrentPage(1)
  }

  return (
    <section className="page-grid rankings-page">
      <div className="panel rankings-header-panel">
        <div className="rankings-header-copy">
          <p className="eyebrow">Rankings</p>
          <h2>랭킹</h2>
          <p className="helper-text">종목별 기록을 빠르게 비교할 수 있도록 25개 단위로 정리한 랭킹 보드입니다.</p>
        </div>

        <div className="rankings-toolbar">
          <div className="field rankings-search-field">
            <label htmlFor="ranking-search">닉네임 검색</label>
            <input
              id="ranking-search"
              type="text"
              value={nicknameQuery}
              onChange={handleNicknameQueryChange}
              placeholder="닉네임으로 검색"
            />
          </div>

          <div className="field rankings-event-field">
            <label htmlFor="ranking-event">종목</label>
            <select id="ranking-event" value={selectedEvent} onChange={handleEventChange}>
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="panel rankings-table-panel">
        {pageItems.length === 0 ? (
          <p className="helper-text">표시할 랭킹 데이터가 없습니다.</p>
        ) : (
          <div className="record-table-wrap">
            <table className="record-table rankings-table">
              <colgroup>
                <col className="rankings-col-rank" />
                <col className="rankings-col-nickname" />
                <col className="rankings-col-event" />
                <col className="rankings-col-time" />
              </colgroup>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>닉네임</th>
                  <th>종목</th>
                  <th>기록</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr key={`${item.eventType}-${item.rank}-${item.nickname}`}>
                    <td>{item.rank}위</td>
                    <td>{item.nickname}</td>
                    <td>{findEventOption(item.eventType)?.label ?? item.eventType}</td>
                    <td>{formatTimeMs(item.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rankings-pagination">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1

            return (
              <button
                key={pageNumber}
                className={pageNumber === currentPage ? 'primary-button rankings-page-button' : 'ghost-button rankings-page-button'}
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
