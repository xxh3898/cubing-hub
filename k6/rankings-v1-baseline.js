import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080'
const eventType = __ENV.EVENT_TYPE || 'WCA_333'
const page = __ENV.PAGE || '1'
const size = __ENV.SIZE || '25'
const warmupDuration = __ENV.WARMUP_DURATION || '30s'
const steadyDuration = __ENV.STEADY_DURATION || '90s'
const cooldownDuration = __ENV.COOLDOWN_DURATION || '15s'
const warmupVus = Number(__ENV.WARMUP_VUS || 20)
const targetVus = Number(__ENV.TARGET_VUS || 60)
const sleepSeconds = Number(__ENV.SLEEP_SECONDS || 0)

export const options = {
  scenarios: {
    rankings_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: warmupDuration, target: warmupVus },
        { duration: steadyDuration, target: targetVus },
        { duration: cooldownDuration, target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
  tags: {
    run: __ENV.RUN_LABEL || 'manual',
    storage: __ENV.STORAGE_LABEL || 'mysql',
    endpoint: 'rankings',
    event_type: eventType,
    page,
    size,
  },
}

const rankingsUrl = `${baseUrl}/api/rankings?eventType=${encodeURIComponent(eventType)}&page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`

export default function () {
  const response = http.get(rankingsUrl, {
    tags: {
      name: 'GET /api/rankings',
      endpoint: 'rankings',
    },
    headers: {
      Accept: 'application/json',
    },
  })

  check(response, {
    'rankings status is 200': (res) => res.status === 200,
    'rankings payload has items': (res) => {
      const payload = res.json()
      return payload?.data?.items !== undefined
    },
  })

  if (sleepSeconds > 0) {
    sleep(sleepSeconds)
  }
}
