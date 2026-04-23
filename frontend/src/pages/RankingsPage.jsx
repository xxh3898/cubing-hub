import { useEffect, useRef, useState } from 'react'
import { getRankings } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { eventOptions, findEventOption } from '../constants/eventOptions.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { formatTimeMs } from '../utils/formatTime.js'

const PAGE_SIZE = 25

export default function RankingsPage() {
  const [selectedEvent, setSelectedEvent] = useState('WCA_333')
  const [nicknameQuery, setNicknameQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rankingPage, setRankingPage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const debouncedNicknameQuery = useDebouncedValue(nicknameQuery)
  const previousDebouncedNicknameQueryRef = useRef(debouncedNicknameQuery)

  useEffect(() => {
    let isCancelled = false
    const searchQueryChanged = previousDebouncedNicknameQueryRef.current !== debouncedNicknameQuery

    previousDebouncedNicknameQueryRef.current = debouncedNicknameQuery

    if (searchQueryChanged && currentPage !== 1) {
      setCurrentPage(1)
      return undefined
    }

    const loadRankings = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await getRankings({
          eventType: selectedEvent,
          nickname: debouncedNicknameQuery.trim() || undefined,
          page: currentPage,
          size: PAGE_SIZE,
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

        setRankingPage(nextPage)
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

    loadRankings()

    return () => {
      isCancelled = true
    }
  }, [currentPage, debouncedNicknameQuery, reloadKey, selectedEvent])

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value)
    setCurrentPage(1)
  }

  const handleNicknameQueryChange = (event) => {
    setNicknameQuery(event.target.value)
  }

  const handleRetry = () => {
    setReloadKey((current) => current + 1)
  }

  const pageItems = rankingPage?.items ?? []
  const totalPages = rankingPage?.totalPages ?? 0

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
              maxLength={INPUT_LIMITS.rankingNicknameSearch}
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
        {isLoading ? (
          <p className="helper-text">랭킹을 불러오는 중입니다.</p>
        ) : errorMessage ? (
          <>
            <p className="message error">{errorMessage}</p>
            <div className="rankings-pagination">
              <button className="ghost-button rankings-page-button" type="button" onClick={handleRetry}>
                다시 시도
              </button>
            </div>
          </>
        ) : pageItems.length === 0 ? (
          <p className="helper-text">표시할 랭킹 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="record-table-wrap">
              <table className="record-table responsive-card-table rankings-table">
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
                      <td data-label="순위">{item.rank}위</td>
                      <td data-label="닉네임" className="record-table-cell-primary">{item.nickname}</td>
                      <td data-label="종목">{findEventOption(item.eventType)?.label ?? item.eventType}</td>
                      <td data-label="기록" className="record-table-cell-primary">{formatTimeMs(item.timeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <GroupedPagination
              className="rankings-pagination"
              buttonClassName="rankings-page-button"
              currentPage={currentPage}
              totalPages={totalPages}
              hasPrevious={rankingPage?.hasPrevious ?? currentPage > 1}
              hasNext={rankingPage?.hasNext ?? false}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </section>
  )
}
