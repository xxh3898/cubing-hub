const SEOUL_TIME_ZONE = 'Asia/Seoul'
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i

const seoulDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parseDateTime(value) {
  if (!value) {
    return null
  }

  const normalizedValue = typeof value === 'string' && !EXPLICIT_TIME_ZONE_PATTERN.test(value)
    ? `${value}+09:00`
    : value
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function getSeoulDateTimeParts(value) {
  const date = parseDateTime(value)

  if (!date) {
    return null
  }

  const parts = seoulDateTimeFormatter
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value
      }
      return acc
    }, {})

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: String(parts.minute).padStart(2, '0'),
  }
}

function padTwo(value) {
  return String(value).padStart(2, '0')
}

export function formatSeoulDateOnly(value) {
  const parts = getSeoulDateTimeParts(value)

  if (!parts) {
    return '-'
  }

  return `${parts.year}년 ${parts.month}월 ${parts.day}일`
}

export function formatSeoulDateTime(value) {
  const parts = getSeoulDateTimeParts(value)

  if (!parts) {
    return '-'
  }

  return `${parts.year}년 ${parts.month}월 ${parts.day}일 ${parts.hour}:${parts.minute}`
}

export function formatSeoulDateTimeWithPeriod(value) {
  const parts = getSeoulDateTimeParts(value)

  if (!parts) {
    return '-'
  }

  const period = parts.hour < 12 ? '오전' : '오후'
  const displayHour = parts.hour % 12 === 0 ? 12 : parts.hour % 12

  return `${parts.year}년 ${parts.month}월 ${parts.day}일 ${period} ${displayHour}시 ${Number(parts.minute)}분`
}

export function formatSeoulDateTimeNumeric(value) {
  const parts = getSeoulDateTimeParts(value)

  if (!parts) {
    return '-'
  }

  return `${parts.year}-${padTwo(parts.month)}-${padTwo(parts.day)} ${padTwo(parts.hour)}:${parts.minute}`
}
