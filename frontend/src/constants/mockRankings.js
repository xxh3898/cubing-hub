export const mockRankingPages = {
  pageSize: 25,
  totalCount: 100,
}

export const mockRankingItems = Array.from({ length: 100 }, (_, index) => ({
  rank: index + 1,
  nickname: `cuber_${String(index + 1).padStart(2, '0')}`,
  eventType: 'WCA_333',
  timeMs: 7800 + index * 37,
}))
