export const AVERAGE_DNF = 'DNF'

export function getEffectiveRecordTime(record) {
  if (!record || record.penalty === 'DNF') {
    return null
  }

  if (typeof record.effectiveTimeMs === 'number') {
    return record.effectiveTimeMs
  }

  return typeof record.timeMs === 'number' ? record.timeMs : null
}

export function formatRecordTime(milliseconds, { padSeconds = false } = {}) {
  if (typeof milliseconds !== 'number' || Number.isNaN(milliseconds)) {
    return '-'
  }

  const totalMilliseconds = Math.max(0, Math.floor(milliseconds))
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const remainingMilliseconds = totalMilliseconds % 1000

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}`
  }

  const displayedSeconds = padSeconds ? String(seconds).padStart(2, '0') : String(seconds)
  return `${displayedSeconds}.${String(remainingMilliseconds).padStart(3, '0')}`
}

export function formatAverageResult(result, options) {
  if (result == null) {
    return '-'
  }

  if (result === AVERAGE_DNF) {
    return AVERAGE_DNF
  }

  return formatRecordTime(result, options)
}

export function filterLatestRecordsByEvent(records, eventType, limit) {
  if (!Array.isArray(records) || !eventType || limit < 1) {
    return []
  }

  return records
    .filter((record) => record?.eventType === eventType)
    .slice(0, limit)
}

export function calculateAverageOf(records, count) {
  if (!Array.isArray(records) || records.length < count) {
    return null
  }

  const values = records.slice(0, count).map(getEffectiveRecordTime)
  const dnfCount = values.filter((value) => value == null).length

  if (dnfCount >= 2) {
    return AVERAGE_DNF
  }

  const trimmedValues = [...values]
    .sort((left, right) => compareSolveValues(left, right))
    .slice(1, values.length - 1)

  if (trimmedValues.some((value) => value == null)) {
    return AVERAGE_DNF
  }

  const sum = trimmedValues.reduce((accumulator, value) => accumulator + value, 0)
  return Math.round(sum / trimmedValues.length)
}

export function buildTrendChartData(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return []
  }

  return [...records]
    .reverse()
    .map((record, index) => {
      const value = getEffectiveRecordTime(record)

      return {
        sequence: index + 1,
        label: String(index + 1),
        value,
        createdAt: record.createdAt,
        penalty: record.penalty,
        displayTime: value == null ? AVERAGE_DNF : formatRecordTime(value),
      }
    })
}

function compareSolveValues(left, right) {
  if (left == null && right == null) {
    return 0
  }

  if (left == null) {
    return 1
  }

  if (right == null) {
    return -1
  }

  return left - right
}
