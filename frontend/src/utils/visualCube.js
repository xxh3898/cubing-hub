const VISUAL_CUBE_BASE_URL = 'https://www.cubing.net/api/visualcube/'

export function buildVisualCubeUrl({
  puzzle = '3x3',
  algorithm = '',
  faceletColors = '',
  stage = '',
  stateType = 'case',
  view = '',
} = {}) {
  const params = {
    fmt: 'svg',
    puzzle,
    size: '320',
  }

  if (faceletColors) {
    params.fc = faceletColors
  } else if (algorithm) {
    params[stateType] = algorithm
  }

  if (stage) {
    params.stage = stage.toLowerCase()
  }

  if (view) {
    params.view = view
  } else if (params.stage === 'oll' || params.stage === 'pll') {
    params.view = 'plan'
  }

  const searchParams = new URLSearchParams(params)
  return `${VISUAL_CUBE_BASE_URL}?${searchParams.toString()}`
}
