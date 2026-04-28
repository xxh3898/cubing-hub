import { useEffect, useRef, useState } from 'react'
import { Medal, Search, Timer, Trophy, UserRound } from 'lucide-react'
import { getRankings } from '../api.js'
import GroupedPagination from '../components/GroupedPagination.jsx'
import { INPUT_LIMITS } from '../constants/inputLimits.js'
import { eventOptions, findEventOption } from '../constants/eventOptions.js'
import { useAuth } from '../context/useAuth.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import { formatTimeMs } from '../utils/formatTime.js'

const PAGE_SIZE = 25
const PODIUM_ORDER = [1, 0, 2]

function getInitial(nickname) {
  return nickname?.trim()?.charAt(0)?.toUpperCase() || '?'
}

function RankingAvatar({ nickname }) {
  return (
    <span className="rankings-avatar" aria-hidden="true">
      {getInitial(nickname)}
    </span>
  )
}

function RankingPodium({ items }) {
  if (items.length === 0) {
    return null
  }

  const orderedItems = PODIUM_ORDER
    .map((index) => items[index])
    .filter(Boolean)

  return (
    <section className="rankings-podium-section" aria-label="상위 3위 랭킹">
      {orderedItems.map((item) => (
        <article
          key={`podium-${item.eventType}-${item.rank}-${item.nickname}`}
          className={`rankings-podium-card rank-${item.rank}`}
        >
          <span className="rankings-podium-badge">{item.rank}</span>
          <RankingAvatar nickname={item.nickname} />
          <strong className="rankings-podium-name">{item.nickname}</strong>
          <span className="rankings-podium-time">{formatTimeMs(item.timeMs)}</span>
        </article>
      ))}
    </section>
  )
}

export default function RankingsPage() {
  const { isAuthenticated } = useAuth()
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
  const isDefaultRankingView = currentPage === 1 && !debouncedNicknameQuery.trim()
  const podiumItems = isDefaultRankingView && pageItems.length >= 3 ? pageItems.slice(0, 3) : []
  const myRanking = rankingPage?.myRanking ?? null
  const selectedEventLabel = findEventOption(selectedEvent)?.label ?? selectedEvent
  const shouldShowMyRankingCard = isAuthenticated && !isLoading && !errorMessage

  return (
    <section className="page-grid rankings-page">
      <div className="panel rankings-header-panel">
        <div className="rankings-header-copy">
          <span className="rankings-header-icon" aria-hidden="true">
            <Trophy size={20} />
          </span>
          <p className="eyebrow">Rankings</p>
          <h2>글로벌 랭킹</h2>
          <p className="helper-text">전체 랭킹을 확인하고 나의 기록을 비교해보세요.</p>
        </div>

        <div className="rankings-toolbar">
          <div className="field rankings-search-field">
            <label htmlFor="ranking-search">닉네임 검색</label>
            <div className="rankings-input-shell">
              <Search size={17} aria-hidden="true" />
              <input
                id="ranking-search"
                type="text"
                value={nicknameQuery}
                onChange={handleNicknameQueryChange}
                placeholder="닉네임으로 검색"
                maxLength={INPUT_LIMITS.rankingNicknameSearch}
              />
            </div>
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
            <RankingPodium items={podiumItems} />

            {shouldShowMyRankingCard ? (
              <article className={`rankings-my-card ${myRanking ? 'has-ranking' : 'is-empty'}`}>
                <div className="rankings-my-main">
                  <span className="rankings-my-badge" aria-hidden="true">
                    {myRanking ? myRanking.rank : <UserRound size={19} />}
                  </span>
                  <div>
                    <p className="rankings-my-title">
                      {myRanking ? `내 순위: ${myRanking.rank}위` : '내 순위'}
                    </p>
                    <p className="helper-text">
                      {myRanking
                        ? `${selectedEventLabel} 기준 전체 랭킹에 반영된 내 최고 기록입니다.`
                        : `${selectedEventLabel} 기록을 저장하면 내 순위가 표시됩니다.`}
                    </p>
                  </div>
                </div>
                <strong className="rankings-my-time">
                  {myRanking ? formatTimeMs(myRanking.timeMs) : '-'}
                </strong>
              </article>
            ) : null}

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
                  {pageItems.map((item) => {
                    const isMyRanking = myRanking?.rank === item.rank && myRanking?.eventType === item.eventType

                    return (
                      <tr
                        key={`${item.eventType}-${item.rank}-${item.nickname}`}
                        className={isMyRanking ? 'rankings-row is-my-ranking' : 'rankings-row'}
                      >
                        <td data-label="순위" className="rankings-row-rank">
                          <span>{item.rank}위</span>
                        </td>
                        <td data-label="닉네임" className="record-table-cell-primary rankings-row-nickname">
                          <span className="rankings-cell-inline">
                            {isMyRanking ? <UserRound size={16} aria-hidden="true" /> : <Medal size={16} aria-hidden="true" />}
                            <span>{item.nickname}</span>
                          </span>
                        </td>
                        <td data-label="종목" className="rankings-row-event">
                          <span className="rankings-cell-inline">
                            <Timer size={15} aria-hidden="true" />
                            <span>{findEventOption(item.eventType)?.label ?? item.eventType}</span>
                          </span>
                        </td>
                        <td data-label="기록" className="record-table-cell-primary rankings-row-time">{formatTimeMs(item.timeMs)}</td>
                      </tr>
                    )
                  })}
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
