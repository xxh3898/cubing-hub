import { describe, expect, it } from 'vitest'
import { buildVisualCubeUrl } from './visualCube.js'

describe('visualCube', () => {
  it('should_build_default_visual_cube_url_when_optional_values_are_missing', () => {
    const url = new URL(buildVisualCubeUrl())

    expect(url.origin + url.pathname).toBe('https://www.cubing.net/api/visualcube/')
    expect(url.searchParams.get('fmt')).toBe('svg')
    expect(url.searchParams.get('puzzle')).toBe('3x3')
    expect(url.searchParams.get('size')).toBe('320')
    expect(url.searchParams.get('stage')).toBeNull()
    expect(url.searchParams.get('view')).toBeNull()
  })

  it('should_include_algorithm_stage_and_plan_view_when_oll_or_pll_stage_is_requested', () => {
    const ollUrl = new URL(buildVisualCubeUrl({
      puzzle: '2x2',
      algorithm: "R U R' U'",
      stage: 'OLL',
    }))
    const pllUrl = new URL(buildVisualCubeUrl({
      puzzle: '3x3',
      algorithm: "R U R' U'",
      stage: 'pll',
      stateType: 'alg',
    }))

    expect(ollUrl.searchParams.get('case')).toBe("R U R' U'")
    expect(ollUrl.searchParams.get('stage')).toBe('oll')
    expect(ollUrl.searchParams.get('view')).toBe('plan')

    expect(pllUrl.searchParams.get('alg')).toBe("R U R' U'")
    expect(pllUrl.searchParams.get('stage')).toBe('pll')
    expect(pllUrl.searchParams.get('view')).toBe('plan')
  })

  it('should_build_stage_url_without_plan_view_when_stage_is_not_oll_or_pll', () => {
    const url = new URL(buildVisualCubeUrl({
      algorithm: 'R2 F2',
      stage: 'cross',
    }))

    expect(url.searchParams.get('case')).toBe('R2 F2')
    expect(url.searchParams.get('stage')).toBe('cross')
    expect(url.searchParams.get('view')).toBeNull()
  })

  it('should_prefer_facelet_colors_over_algorithm_when_facelet_colors_are_provided', () => {
    const url = new URL(buildVisualCubeUrl({
      algorithm: "F R U R' U' F'",
      faceletColors: 'llllyllllrrrrrrrrrbbbbbbbbbwwwwwwwwwoooooooooggggggggg',
      stage: 'OLL',
    }))

    expect(url.searchParams.get('case')).toBeNull()
    expect(url.searchParams.get('fc')).toBe('llllyllllrrrrrrrrrbbbbbbbbbwwwwwwwwwoooooooooggggggggg')
    expect(url.searchParams.get('stage')).toBe('oll')
    expect(url.searchParams.get('view')).toBe('plan')
  })

  it('should_include_explicit_view_when_view_is_requested_without_stage', () => {
    const url = new URL(buildVisualCubeUrl({
      faceletColors: 'llllwllwlrrrrrrrrrbbbbbbbbbyyyyyyyyyoooooooooggggggggg',
      view: 'plan',
    }))

    expect(url.searchParams.get('fc')).toBe('llllwllwlrrrrrrrrrbbbbbbbbbyyyyyyyyyoooooooooggggggggg')
    expect(url.searchParams.get('stage')).toBeNull()
    expect(url.searchParams.get('view')).toBe('plan')
  })
})
