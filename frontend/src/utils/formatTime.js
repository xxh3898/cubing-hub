export function formatTimeMs(timeMs) {
  const totalMilliseconds = Math.max(0, Math.floor(timeMs ?? 0))
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const remainingMilliseconds = totalMilliseconds % 1000

  if (minutes > 0) {
    return `${minutes}분 ${String(seconds).padStart(2, '0')}.${String(remainingMilliseconds).padStart(3, '0')}초`
  }

  return `${seconds}.${String(remainingMilliseconds).padStart(3, '0')}초`
}
