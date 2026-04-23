const STORAGE_KEY = 'cubing-hub.guest-timer-records.v1'
const MAX_RECORDS_PER_EVENT = 100

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('게스트 기록을 저장할 수 없습니다.')
  }

  return window.localStorage
}

function parseStorageValue() {
  try {
    const rawValue = getStorage().getItem(STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) ? parsedValue : {}
  } catch {
    return {}
  }
}

function writeStorageValue(nextValue) {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

function calculateEffectiveTimeMs(timeMs, penalty) {
  if (penalty === 'DNF') {
    return null
  }

  if (penalty === 'PLUS_TWO') {
    return timeMs + 2000
  }

  return timeMs
}

function buildGuestRecord(snapshot) {
  const penalty = snapshot.penalty ?? 'NONE'

  return {
    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    eventType: snapshot.eventType,
    timeMs: snapshot.timeMs,
    effectiveTimeMs: calculateEffectiveTimeMs(snapshot.timeMs, penalty),
    penalty,
    scramble: snapshot.scramble,
    createdAt: new Date().toISOString(),
  }
}

function getEventRecords(store, eventType) {
  const eventRecords = store[eventType]
  return Array.isArray(eventRecords) ? eventRecords : []
}

function writeEventRecords(eventType, records) {
  const currentStore = parseStorageValue()
  const nextStore = {
    ...currentStore,
    [eventType]: records.slice(0, MAX_RECORDS_PER_EVENT),
  }

  writeStorageValue(nextStore)
  return nextStore[eventType]
}

export function getGuestTimerRecords(eventType) {
  if (!eventType) {
    return []
  }

  return getEventRecords(parseStorageValue(), eventType)
}

export function saveGuestTimerRecord(snapshot) {
  const currentStore = parseStorageValue()
  const nextRecord = buildGuestRecord(snapshot)
  const nextRecords = [nextRecord, ...getEventRecords(currentStore, snapshot.eventType)].slice(0, MAX_RECORDS_PER_EVENT)

  writeEventRecords(snapshot.eventType, nextRecords)
  return nextRecord
}

export function updateGuestTimerRecordPenalty(eventType, recordId, penalty) {
  const currentRecords = getGuestTimerRecords(eventType)
  const nextRecords = currentRecords.map((record) =>
    record.id === recordId
      ? {
          ...record,
          penalty,
          effectiveTimeMs: calculateEffectiveTimeMs(record.timeMs, penalty),
        }
      : record,
  )

  return writeEventRecords(eventType, nextRecords)
}

export function deleteGuestTimerRecord(eventType, recordId) {
  const currentRecords = getGuestTimerRecords(eventType)
  const nextRecords = currentRecords.filter((record) => record.id !== recordId)

  return writeEventRecords(eventType, nextRecords)
}

export function clearGuestTimerStorage() {
  try {
    getStorage().removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}
