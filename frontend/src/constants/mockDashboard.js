export const mockCurrentUser = {
  nickname: 'chiho',
  mainEvent: 'WCA_333',
}

export const mockDashboardSummary = {
  todayScramble: {
    eventType: 'WCA_333',
    scramble: "R2 U F2 D' R2 U2 L2 D B2 U' R2 F' D R' U2 B R U'",
  },
  solveCount: {
    total: 1284,
    daily: 14,
    weekly: 63,
    monthly: 241,
  },
  personalBest: {
    eventType: 'WCA_333',
    timeMs: 8421,
    achievedAt: '2026-03-28',
  },
  average: {
    eventType: 'WCA_333',
    timeMs: 11234,
    sampleSize: 1284,
  },
}

export const mockRecentRecords = [
  {
    id: 1,
    createdAt: '2026-04-04 18:11',
    eventType: 'WCA_333',
    timeMs: 9344,
    scramble: "R2 U F2 D' R2 U2 L2 D B2 U' R2 F' D R' U2 B R U'",
    penalty: 'NONE',
  },
  {
    id: 2,
    createdAt: '2026-04-04 17:54',
    eventType: 'WCA_333',
    timeMs: 10128,
    scramble: "F U2 R2 D L2 B2 U' R2 U F2 U2 R' U L' B' U2 F U'",
    penalty: 'NONE',
  },
  {
    id: 3,
    createdAt: '2026-04-04 17:42',
    eventType: 'WCA_333',
    timeMs: 11882,
    scramble: "U2 R' U2 F2 L2 D' B2 R2 U F' U' R2 D2 L' U R' B",
    penalty: 'NONE',
  },
]
