const VISUAL_CUBE_BASE_URL = 'https://www.cubing.net/api/visualcube/'

export function buildVisualCubeUrl({
  puzzle = '3x3',
  algorithm = '',
  stage = '',
} = {}) {
  const params = {
    fmt: 'svg',
    puzzle,
    size: '320',
  }

  if (algorithm) {
    params.case = algorithm;
  }

  if (stage) {
    params.stage = stage.toLowerCase();
    if (params.stage === 'oll' || params.stage === 'pll') {
      params.view = 'plan';
    }
  }

  const searchParams = new URLSearchParams(params);
  return `${VISUAL_CUBE_BASE_URL}?${searchParams.toString()}`
}
