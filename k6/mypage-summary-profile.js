import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080'
const loginUrl = `${baseUrl}/api/auth/login`
const profileUrl = `${baseUrl}/api/users/me/profile`
const benchmarkUserCount = Number(__ENV.BENCHMARK_USER_COUNT || 10)
const benchmarkPassword = __ENV.BENCHMARK_PASSWORD || 'pass1234!'
const warmupDuration = __ENV.WARMUP_DURATION || '30s'
const steadyDuration = __ENV.STEADY_DURATION || '90s'
const cooldownDuration = __ENV.COOLDOWN_DURATION || '15s'
const warmupVus = Number(__ENV.WARMUP_VUS || 20)
const targetVus = Number(__ENV.TARGET_VUS || 60)
const sleepSeconds = Number(__ENV.SLEEP_SECONDS || 0)
const p95ThresholdMs = Number(__ENV.P95_THRESHOLD_MS || 1500)

export const options = {
  scenarios: {
    mypage_summary_read: {
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
    http_req_duration: [`p(95)<${p95ThresholdMs}`],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
  tags: {
    run: __ENV.RUN_LABEL || 'manual',
    storage: __ENV.STORAGE_LABEL || 'mysql',
    endpoint: 'mypage-summary-profile',
  },
}

function createBenchmarkUser(index) {
  return {
    email: `mypage-benchmark-user${index}@test.com`,
    password: benchmarkPassword,
  }
}

export function setup() {
  const accessTokens = []

  for (let index = 1; index <= benchmarkUserCount; index += 1) {
    const user = createBenchmarkUser(index)
    const response = http.post(loginUrl, JSON.stringify(user), {
      tags: {
        name: 'POST /api/auth/login',
        endpoint: 'auth-login',
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    const payload = response.json()
    const accessToken = payload?.data?.accessToken

    if (response.status !== 200 || !accessToken) {
      throw new Error(`Failed to authenticate benchmark user: ${user.email}`)
    }

    accessTokens.push(accessToken)
  }

  return { accessTokens }
}

export default function (data) {
  const accessToken = data.accessTokens[(__VU - 1) % data.accessTokens.length]

  const response = http.get(profileUrl, {
    tags: {
      name: 'GET /api/users/me/profile',
      endpoint: 'mypage-summary-profile',
    },
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  check(response, {
    'mypage profile status is 200': (res) => res.status === 200,
    'mypage profile payload has summary': (res) => {
      const payload = res.json()
      return payload?.data?.summary !== undefined
    },
  })

  if (sleepSeconds > 0) {
    sleep(sleepSeconds)
  }
}
