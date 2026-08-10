import { isPracticeEventSupported } from '../constants/eventOptions.js'

export const PENDING_TIMER_SOLVE_SCHEMA_VERSION = 1

const STORAGE_KEY_PREFIX = 'cubing-hub.timer.pending.v1:'
const RECOVERY_DISCARD_MESSAGE = '저장 대기 기록을 복구할 수 없습니다. 기록을 버린 뒤 새로 측정해주세요.'
const INPUT_METHODS = new Set(['UNKNOWN', 'KEYBOARD', 'TOUCH'])
const PENALTIES = new Set(['NONE', 'PLUS_TWO', 'DNF'])
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getSessionStorage() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    throw new Error('저장 대기 기록을 보존할 수 없습니다.')
  }

  return window.sessionStorage
}

function isValidUserId(userId) {
  return Number.isSafeInteger(userId) && userId > 0
}

export function getPendingTimerSolveKey(userId) {
  return isValidUserId(userId) ? `${STORAGE_KEY_PREFIX}${userId}` : null
}

export function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value)
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || !isValidUserId(snapshot.userId)) {
    return null
  }

  if (
    snapshot.schemaVersion !== PENDING_TIMER_SOLVE_SCHEMA_VERSION
    || !isPracticeEventSupported(snapshot.eventType)
    || !Number.isSafeInteger(snapshot.timeMs)
    || snapshot.timeMs < 1
    || !PENALTIES.has(snapshot.penalty)
    || typeof snapshot.scramble !== 'string'
    || snapshot.scramble.trim().length === 0
    || !INPUT_METHODS.has(snapshot.inputMethod)
    || !isUuidV4(snapshot.clientSubmissionId)
    || typeof snapshot.savedAt !== 'string'
    || Number.isNaN(Date.parse(snapshot.savedAt))
  ) {
    return null
  }

  return {
    schemaVersion: PENDING_TIMER_SOLVE_SCHEMA_VERSION,
    userId: snapshot.userId,
    eventType: snapshot.eventType,
    timeMs: snapshot.timeMs,
    penalty: snapshot.penalty,
    scramble: snapshot.scramble,
    inputMethod: snapshot.inputMethod,
    clientSubmissionId: snapshot.clientSubmissionId,
    savedAt: snapshot.savedAt,
  }
}

export function savePendingTimerSolve(snapshot) {
  const normalizedSnapshot = normalizeSnapshot(snapshot)

  if (!normalizedSnapshot) {
    throw new Error('저장 대기 기록 형식이 올바르지 않습니다.')
  }

  getSessionStorage().setItem(
    getPendingTimerSolveKey(normalizedSnapshot.userId),
    JSON.stringify(normalizedSnapshot),
  )

  return normalizedSnapshot
}

export function clearPendingTimerSolve(userId) {
  const key = getPendingTimerSolveKey(userId)

  if (!key) {
    return
  }

  try {
    getSessionStorage().removeItem(key)
  } catch {
    // Storage failure must not make logout or discard crash the Timer UI.
  }
}

export function loadPendingTimerSolve(userId) {
  const key = getPendingTimerSolveKey(userId)

  if (!key) {
    return { snapshot: null, recoveryMessage: null, canDiscard: false }
  }

  let rawValue

  try {
    rawValue = getSessionStorage().getItem(key)
  } catch {
    return { snapshot: null, recoveryMessage: RECOVERY_DISCARD_MESSAGE, canDiscard: false }
  }

  if (!rawValue) {
    return { snapshot: null, recoveryMessage: null, canDiscard: false }
  }

  try {
    const normalizedSnapshot = normalizeSnapshot(JSON.parse(rawValue))

    if (normalizedSnapshot?.userId === userId) {
      return { snapshot: normalizedSnapshot, recoveryMessage: null, canDiscard: false }
    }
  } catch {
    // The malformed record is never submitted; the user can explicitly discard it.
  }

  return { snapshot: null, recoveryMessage: RECOVERY_DISCARD_MESSAGE, canDiscard: true }
}
