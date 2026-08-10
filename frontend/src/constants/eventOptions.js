export const SUPPORTED_PRACTICE_EVENT_TYPES = new Set(['WCA_333'])

export const eventOptions = [
  { value: 'WCA_333', label: '3x3x3' },
  { value: 'WCA_222', label: '2x2x2' },
  { value: 'WCA_444', label: '4x4x4' },
  { value: 'WCA_555', label: '5x5x5' },
  { value: 'WCA_666', label: '6x6x6' },
  { value: 'WCA_777', label: '7x7x7' },
  { value: 'WCA_333BF', label: '3x3x3 블라인드' },
  { value: 'WCA_444BF', label: '4x4x4 블라인드' },
  { value: 'WCA_555BF', label: '5x5x5 블라인드' },
  { value: 'WCA_333MBF', label: '3x3x3 멀티 블라인드' },
  { value: 'WCA_333OH', label: '3x3x3 원핸드' },
  { value: 'WCA_333FM', label: '3x3x3 최소회전' },
  { value: 'WCA_CLOCK', label: '루빅스 클락' },
  { value: 'WCA_MINX', label: '메가밍크스' },
  { value: 'WCA_PYRAM', label: '피라밍크스' },
  { value: 'WCA_SKEWB', label: '스큐브' },
  { value: 'WCA_SQ1', label: '스퀘어-1' },
]

export function findEventOption(value) {
  return eventOptions.find((option) => option.value === value)
}

export function isPracticeEventSupported(eventType) {
  return SUPPORTED_PRACTICE_EVENT_TYPES.has(eventType)
}
