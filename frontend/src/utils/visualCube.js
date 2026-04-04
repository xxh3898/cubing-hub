const VISUAL_CUBE_BASE_URL = 'https://www.cubing.net/api/visualcube/'

export function buildVisualCubeUrl({
  puzzle = '3x3',
  caseSequence = '',
  algorithm = '',
} = {}) {
  const searchParams = new URLSearchParams({
    fmt: 'svg',
    puzzle,
    case: caseSequence,
    alg: algorithm,
    size: '320',
  })

  return `${VISUAL_CUBE_BASE_URL}?${searchParams.toString()}`
}
