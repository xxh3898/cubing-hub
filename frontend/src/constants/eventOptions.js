export const eventOptions = [
  { value: 'WCA_333', label: '3x3x3 Cube', supported: true },
  { value: 'WCA_222', label: '2x2x2 Cube', supported: false },
  { value: 'WCA_444', label: '4x4x4 Cube', supported: false },
  { value: 'WCA_555', label: '5x5x5 Cube', supported: false },
  { value: 'WCA_666', label: '6x6x6 Cube', supported: false },
  { value: 'WCA_777', label: '7x7x7 Cube', supported: false },
  { value: 'WCA_333BF', label: '3x3x3 Blindfolded', supported: false },
  { value: 'WCA_444BF', label: '4x4x4 Blindfolded', supported: false },
  { value: 'WCA_555BF', label: '5x5x5 Blindfolded', supported: false },
  { value: 'WCA_333MBF', label: '3x3x3 Multi-Blind', supported: false },
  { value: 'WCA_333OH', label: '3x3x3 One-Handed', supported: false },
  { value: 'WCA_333FM', label: '3x3x3 Fewest Moves', supported: false },
  { value: 'WCA_CLOCK', label: 'Clock', supported: false },
  { value: 'WCA_MINX', label: 'Megaminx', supported: false },
  { value: 'WCA_PYRAM', label: 'Pyraminx', supported: false },
  { value: 'WCA_SKEWB', label: 'Skewb', supported: false },
  { value: 'WCA_SQ1', label: 'Square-1', supported: false },
]

export function findEventOption(value) {
  return eventOptions.find((option) => option.value === value)
}
