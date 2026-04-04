export const eventOptions = [
  { value: 'WCA_333', label: '3x3x3', supported: true },
  { value: 'WCA_222', label: '2x2x2', supported: false },
  { value: 'WCA_444', label: '4x4x4', supported: false },
  { value: 'WCA_555', label: '5x5x5', supported: false },
  { value: 'WCA_666', label: '6x6x6', supported: false },
  { value: 'WCA_777', label: '7x7x7', supported: false },
  { value: 'WCA_333BF', label: '3x3x3 블라인드', supported: false },
  { value: 'WCA_444BF', label: '4x4x4 블라인드', supported: false },
  { value: 'WCA_555BF', label: '5x5x5 블라인드', supported: false },
  { value: 'WCA_333MBF', label: '3x3x3 멀티 블라인드', supported: false },
  { value: 'WCA_333OH', label: '3x3x3 원핸드', supported: false },
  { value: 'WCA_333FM', label: '3x3x3 최소회전', supported: false },
  { value: 'WCA_CLOCK', label: '루빅스 클락', supported: false },
  { value: 'WCA_MINX', label: '메가밍크스', supported: false },
  { value: 'WCA_PYRAM', label: '피라밍크스', supported: false },
  { value: 'WCA_SKEWB', label: '스큐브', supported: false },
  { value: 'WCA_SQ1', label: '스퀘어-1', supported: false },
]

export function findEventOption(value) {
  return eventOptions.find((option) => option.value === value)
}
