import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { beginnerCases, beginnerSteps } from '../constants/mockLearning.js'
import LearningPage, { getActiveTabLabel, getLearningCases } from './LearningPage.jsx'

const getBeginnerStepButtonName = (step) => `${step.label} ${step.title} ${step.metaLabel ?? `${step.caseCount}가지 케이스`}`
const getFaceletFaces = (facelets) => ({
  U: facelets.slice(0, 9),
  R: facelets.slice(9, 18),
  F: facelets.slice(18, 27),
  D: facelets.slice(27, 36),
  L: facelets.slice(36, 45),
  B: facelets.slice(45, 54),
})
const faceletCoords = []
const faceletIndexByCoord = new Map()
const addFaceletCoord = (index, x, y, z, nx, ny, nz) => {
  faceletCoords[index] = { x, y, z, nx, ny, nz }
  faceletIndexByCoord.set(`${x},${y},${z},${nx},${ny},${nz}`, index)
}

for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    addFaceletCoord(row * 3 + column, column - 1, 1, row - 1, 0, 1, 0)
    addFaceletCoord(9 + row * 3 + column, 1, 1 - row, 1 - column, 1, 0, 0)
    addFaceletCoord(18 + row * 3 + column, column - 1, 1 - row, 1, 0, 0, 1)
    addFaceletCoord(27 + row * 3 + column, column - 1, -1, 1 - row, 0, -1, 0)
    addFaceletCoord(36 + row * 3 + column, -1, 1 - row, column - 1, -1, 0, 0)
    addFaceletCoord(45 + row * 3 + column, 1 - column, 1 - row, -1, 0, 0, -1)
  }
}

const moveDefinitions = {
  U: { axis: 'y', layer: 1, direction: -1 },
  D: { axis: 'y', layer: -1, direction: 1 },
  R: { axis: 'x', layer: 1, direction: -1 },
  L: { axis: 'x', layer: -1, direction: 1 },
  F: { axis: 'z', layer: 1, direction: -1 },
  B: { axis: 'z', layer: -1, direction: 1 },
}
const rotatePair = (first, second, direction) =>
  direction === 1 ? [-second, first] : [second, -first]
const rotateFaceletCoord = (coord, axis, direction) => {
  let { x, y, z, nx, ny, nz } = coord

  if (axis === 'x') {
    const nextPosition = rotatePair(y, z, direction)
    const nextNormal = rotatePair(ny, nz, direction)

    y = nextPosition[0]
    z = nextPosition[1]
    ny = nextNormal[0]
    nz = nextNormal[1]
  } else if (axis === 'y') {
    const nextPosition = rotatePair(z, x, direction)
    const nextNormal = rotatePair(nz, nx, direction)

    z = nextPosition[0]
    x = nextPosition[1]
    nz = nextNormal[0]
    nx = nextNormal[1]
  } else {
    const nextPosition = rotatePair(x, y, direction)
    const nextNormal = rotatePair(nx, ny, direction)

    x = nextPosition[0]
    y = nextPosition[1]
    nx = nextNormal[0]
    ny = nextNormal[1]
  }

  return { x, y, z, nx, ny, nz }
}
const applyFaceletMove = (facelets, moveToken) => {
  const move = moveDefinitions[moveToken[0]]
  const amount = moveToken.includes('2') ? 2 : 1
  const direction = moveToken.includes("'") ? -move.direction : move.direction
  let nextFacelets = facelets.split('')

  for (let turn = 0; turn < amount; turn += 1) {
    const movedFacelets = [...nextFacelets]

    for (let index = 0; index < faceletCoords.length; index += 1) {
      const coord = faceletCoords[index]

      if (coord[move.axis] !== move.layer) {
        continue
      }

      const rotated = rotateFaceletCoord(coord, move.axis, direction)
      const nextIndex = faceletIndexByCoord.get(`${rotated.x},${rotated.y},${rotated.z},${rotated.nx},${rotated.ny},${rotated.nz}`)

      movedFacelets[nextIndex] = nextFacelets[index]
    }

    nextFacelets = movedFacelets
  }

  return nextFacelets.join('')
}
const applyFaceletAlgorithm = (facelets, algorithm) =>
  algorithm
    .split(/\s+/)
    .filter(Boolean)
    .reduce((currentFacelets, moveToken) => applyFaceletMove(currentFacelets, moveToken), facelets)
const applyFaceletAlgorithms = (facelets, algorithms) =>
  algorithms.reduce((currentFacelets, algorithm) => applyFaceletAlgorithm(currentFacelets, algorithm.sequence), facelets)

describe('LearningPage', () => {
  it('should_return_learning_fallback_data_when_tab_key_is_unknown', () => {
    expect(getLearningCases('UNKNOWN', false)).toEqual([])
    expect(getActiveTabLabel('UNKNOWN')).toBe('UNKNOWN')
  })

  it('should_render_wca_notation_tab_by_default', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: '회전기호 가이드' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: '회전기호 가이드' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '상(U)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "상'(U')" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '상2(U2)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'U visual cube' })).toHaveAttribute(
      'src',
      expect.stringContaining('alg=U'),
    )
    expect(screen.getByRole('img', { name: 'U visual cube' })).not.toHaveAttribute(
      'src',
      expect.stringContaining('case=U'),
    )
    expect(screen.getByRole('img', { name: "U' visual cube" })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'U2 visual cube' })).toBeInTheDocument()
    expect(screen.queryByText('x y z')).not.toBeInTheDocument()
  })

  it('should_render_beginner_step_list_when_beginner_tab_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))

    expect(screen.getByRole('tab', { name: '초보자' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: '초보자' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1단계 십자 맞추기 안내/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /8단계 3층 엣지 맞추기 4가지 케이스/ })).toBeInTheDocument()
    expect(screen.queryByText("R2 U F B' R2 F' B U R2")).not.toBeInTheDocument()
  })

  it('should_render_beginner_cases_when_beginner_step_is_selected', () => {
    const { container } = render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: /3단계 1층 맞추기 3가지 케이스/ }))

    expect(screen.getByRole('button', { name: '단계 목록' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1층 맞추기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '오른쪽 위 코너 삽입' })).toBeInTheDocument()
    expect(screen.getByText("R U R'")).toBeInTheDocument()
    expect(screen.getByText("R' F R F'")).toBeInTheDocument()

    const firstCaseUrl = new URL(screen.getByRole('img', { name: '오른쪽 위 코너 삽입 visual cube' }).getAttribute('src'))

    expect(firstCaseUrl.searchParams.get('case')).toBe("R U R'")
    expect(firstCaseUrl.searchParams.get('fc')).toBeNull()
    expect(firstCaseUrl.searchParams.get('stage')).toBe('f2l')
    expect(container.querySelectorAll('.learning-third-layer-edge-mask')).toHaveLength(3)
    expect(container.querySelectorAll('.learning-third-layer-edge-mask polygon')).toHaveLength(18)
  })

  it('should_not_render_beginner_wrong_corner_case', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '3단계 1층 맞추기 3가지 케이스' }))

    const caseUrls = [
      '오른쪽 위 코너 삽입 visual cube',
      '앞면 코너 삽입 visual cube',
      '방향 보정 후 삽입 visual cube',
    ].map((name) => new URL(screen.getByRole('img', { name }).getAttribute('src')))

    expect(screen.queryByRole('heading', { name: '잘못 들어간 코너 빼내기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '잘못 들어간 코너 빼내기 visual cube' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /visual cube/ })).toHaveLength(3)
    caseUrls.forEach((url) => {
      expect(url.searchParams.get('case')).not.toBeNull()
      expect(url.searchParams.get('fc')).toBeNull()
      expect(url.searchParams.get('stage')).toBe('f2l')
    })
  })

  it('should_not_render_beginner_wrong_second_layer_edge_case', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '4단계 2층 맞추기 2가지 케이스' }))

    expect(screen.queryByRole('heading', { name: '잘못 들어간 엣지 빼내기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '잘못 들어간 엣지 빼내기 visual cube' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /visual cube/ })).toHaveLength(2)
  })

  it('should_return_to_beginner_step_list_when_back_button_is_clicked', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: /8단계 3층 엣지 맞추기 4가지 케이스/ }))

    expect(screen.getAllByText("R2 U F B' R2 F' B U R2")).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: '단계 목록' }))

    expect(screen.getByRole('button', { name: /1단계 십자 맞추기 안내/ })).toBeInTheDocument()
    expect(screen.queryByText("R2 U F B' R2 F' B U R2")).not.toBeInTheDocument()
  })

  it('should_render_distinct_beginner_case_visuals_when_each_beginner_step_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))

    beginnerSteps.forEach((step) => {
      fireEvent.click(screen.getByRole('button', { name: getBeginnerStepButtonName(step) }))

      const caseImageSources = screen
        .queryAllByRole('img', { name: /visual cube/ })
        .map((image) => image.getAttribute('src'))

      expect(caseImageSources).toHaveLength(step.caseCount)
      expect(new Set(caseImageSources)).toHaveProperty('size', step.caseCount)

      fireEvent.click(screen.getByRole('button', { name: '단계 목록' }))
    })
  })

  it('should_not_render_already_completed_states_as_beginner_cases', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '2단계 십자 엣지 맞추기 2가지 케이스' }))

    expect(screen.getByRole('heading', { name: '흰색 십자 옆면 정렬' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '이미 맞은 십자' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '다음 단계' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '단계 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '8단계 3층 엣지 맞추기 4가지 케이스' }))

    expect(screen.getByRole('heading', { name: '큐브 완성' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '이미 맞은 엣지' })).not.toBeInTheDocument()
    expect(screen.queryByText('완성')).not.toBeInTheDocument()
  })

  it('should_render_beginner_cross_edge_cases_with_distinct_3d_facelets', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '2단계 십자 엣지 맞추기 2가지 케이스' }))

    const completionUrl = new URL(screen.getByRole('img', { name: '흰색 십자 옆면 정렬 completion cube' }).getAttribute('src'))
    const adjacentUrl = new URL(screen.getByRole('img', { name: '인접 엣지 보정 visual cube' }).getAttribute('src'))
    const oppositeUrl = new URL(screen.getByRole('img', { name: '반대 엣지 보정 visual cube' }).getAttribute('src'))
    const completionFaces = getFaceletFaces(completionUrl.searchParams.get('fc'))
    const adjacentFaces = getFaceletFaces(adjacentUrl.searchParams.get('fc'))
    const oppositeFaces = getFaceletFaces(oppositeUrl.searchParams.get('fc'))

    expect(completionUrl.searchParams.get('case')).toBeNull()
    expect(completionUrl.searchParams.get('view')).toBeNull()
    expect(completionFaces.U).toBe('lwlwwwlwl')
    expect(completionFaces.F).toBe('lbllbllll')
    expect(completionFaces.F[0]).toBe('l')
    expect(completionFaces.F[1]).toBe('b')
    expect(completionFaces.F[4]).toBe('b')

    expect(adjacentUrl.searchParams.get('case')).toBeNull()
    expect(oppositeUrl.searchParams.get('case')).toBeNull()
    expect(adjacentUrl.searchParams.get('stage')).toBeNull()
    expect(oppositeUrl.searchParams.get('stage')).toBeNull()
    expect(adjacentUrl.searchParams.get('view')).toBeNull()
    expect(oppositeUrl.searchParams.get('view')).toBeNull()
    expect(adjacentUrl.searchParams.get('fc')).not.toBe(oppositeUrl.searchParams.get('fc'))
    expect(adjacentFaces.U).toBe('lwlwwwlwl')
    expect(oppositeFaces.U).toBe('lwlwwwlwl')
    expect(adjacentFaces.R).toBe('lbllrllll')
    expect(adjacentFaces.F).toBe('lrllbllll')
    expect(oppositeFaces.R).toBe('lollrllll')
    expect(oppositeFaces.L).toBe('lrllollll')
  })

  it('should_navigate_to_next_beginner_step_when_next_step_button_is_clicked', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '1단계 십자 맞추기 안내' }))

    fireEvent.click(screen.getByRole('button', { name: '다음 단계 (2단계: 십자 엣지 맞추기)' }))

    expect(screen.getByRole('button', { name: '단계 목록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음 단계 (3단계: 1층 맞추기)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '십자 엣지 맞추기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '흰색 십자 옆면 정렬' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '목표는 흰색 십자입니다' })).not.toBeInTheDocument()
  })

  it('should_not_render_next_step_button_when_last_beginner_step_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '8단계 3층 엣지 맞추기 4가지 케이스' }))

    expect(screen.getByRole('heading', { name: '3층 엣지 맞추기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /다음 단계/ })).not.toBeInTheDocument()
  })

  it('should_render_completion_visual_when_each_beginner_step_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))

    beginnerSteps.forEach((step) => {
      fireEvent.click(screen.getByRole('button', { name: getBeginnerStepButtonName(step) }))

      expect(screen.getByText('완료 모습')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /completion cube/ })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '단계 목록' }))
    })
  })

  it('should_render_beginner_cross_completion_with_white_cross', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '1단계 십자 맞추기 안내' }))

    const completionUrl = new URL(screen.getByRole('img', { name: '흰색 십자 완성 completion cube' }).getAttribute('src'))

    expect(screen.getByRole('heading', { name: '흰색 십자 완성' })).toBeInTheDocument()
    expect(completionUrl.searchParams.get('case')).toBeNull()
    expect(completionUrl.searchParams.get('fc')?.slice(0, 9)).toBe('lwlwwwlwl')
    expect(completionUrl.searchParams.get('fc')).toHaveLength(54)
    expect(completionUrl.searchParams.get('fc')).toMatch(/^[lw]+$/)
    expect(completionUrl.searchParams.get('view')).toBeNull()
  })

  it('should_render_beginner_top_cross_completion_with_yellow_cross', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '5단계 윗면 십자 맞추기 3가지 케이스' }))

    const completionUrl = new URL(screen.getByRole('img', { name: '윗면 십자 완성 completion cube' }).getAttribute('src'))

    expect(screen.getByRole('heading', { name: '윗면 십자 완성' })).toBeInTheDocument()
    expect(completionUrl.searchParams.get('case')).toBeNull()
    expect(completionUrl.searchParams.get('fc')?.slice(0, 9)).toBe('lylyyylyl')
    expect(completionUrl.searchParams.get('stage')).toBe('oll')
    expect(completionUrl.searchParams.get('view')).toBe('plan')
  })

  it('should_render_beginner_second_layer_completion_in_3d_view', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '4단계 2층 맞추기 2가지 케이스' }))

    const completionUrl = new URL(screen.getByRole('img', { name: '2층 완성 completion cube' }).getAttribute('src'))

    expect(screen.getByRole('heading', { name: '2층 완성' })).toBeInTheDocument()
    expect(completionUrl.searchParams.get('case')).toBeNull()
    expect(completionUrl.searchParams.get('fc')).toHaveLength(54)
    expect(completionUrl.searchParams.get('stage')).toBeNull()
    expect(completionUrl.searchParams.get('view')).toBeNull()
  })

  it('should_render_beginner_top_cross_cases_with_facelet_colors', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '5단계 윗면 십자 맞추기 3가지 케이스' }))

    const lShapeUrl = new URL(screen.getByRole('img', { name: '뒤집힌 ㄴ자에서 십자 만들기 visual cube' }).getAttribute('src'))
    const dotUrl = new URL(screen.getByRole('img', { name: '점에서 십자 만들기 visual cube' }).getAttribute('src'))

    expect(lShapeUrl.searchParams.get('case')).toBeNull()
    expect(lShapeUrl.searchParams.get('fc')?.slice(0, 9)).toBe('lylyyllll')
    expect(dotUrl.searchParams.get('case')).toBeNull()
    expect(dotUrl.searchParams.get('fc')?.slice(0, 9)).toBe('llllyllll')
    expect(dotUrl.searchParams.get('stage')).toBe('oll')
    expect(dotUrl.searchParams.get('view')).toBe('plan')
  })

  it('should_render_beginner_top_corner_cases_with_valid_unsolved_facelet_colors', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '6단계 윗면 맞추기 7가지 케이스' }))

    const caseUrls = screen
      .getAllByRole('img', { name: /visual cube/ })
      .map((image) => new URL(image.getAttribute('src')))
    const topFaces = caseUrls.map((url) => url.searchParams.get('fc')?.slice(0, 9))
    const sideTopRows = caseUrls.map((url) => {
      const faces = getFaceletFaces(url.searchParams.get('fc'))

      return {
        R: faces.R.slice(0, 3),
        F: faces.F.slice(0, 3),
        L: faces.L.slice(0, 3),
        B: faces.B.slice(0, 3),
      }
    })
    const faceletColors = caseUrls.map((url) => url.searchParams.get('fc'))
    const topCornerIndices = [0, 2, 6, 8]
    const cornerStickers = [
      { top: 0, sideA: ['L', 0], sideB: ['B', 2] },
      { top: 2, sideA: ['B', 0], sideB: ['R', 2] },
      { top: 6, sideA: ['F', 0], sideB: ['L', 2] },
      { top: 8, sideA: ['R', 0], sideB: ['F', 2] },
    ]
    const topCornerCounts = topFaces.map((topFace) =>
      topCornerIndices.filter((index) => topFace?.[index] === 'y').length,
    )
    const displayedStep6Algorithms = beginnerCases.BEGINNER_STEP_6.map((item) =>
      item.algorithms.map((algorithm) => algorithm.sequence),
    )

    expect(caseUrls).toHaveLength(7)
    expect(new Set(faceletColors)).toHaveProperty('size', 7)
    expect(topFaces).toEqual([
      'lylyyylyl',
      'lylyyylyl',
      'yylyyylyy',
      'yylyyylyl',
      'lylyyylyy',
      'yyyyyylyl',
      'yylyyyyyl',
    ])
    expect(topCornerCounts).toEqual([0, 0, 2, 1, 1, 2, 2])
    expect(sideTopRows).toEqual([
      { R: 'lll', F: 'lly', L: 'yly', B: 'yll' },
      { R: 'yly', F: 'lll', L: 'yly', B: 'lll' },
      { R: 'lll', F: 'lll', L: 'lly', B: 'yll' },
      { R: 'yll', F: 'yll', L: 'lll', B: 'yll' },
      { R: 'lly', F: 'lll', L: 'lly', B: 'lly' },
      { R: 'lll', F: 'yly', L: 'lll', B: 'lll' },
      { R: 'lll', F: 'lly', L: 'lll', B: 'yll' },
    ])
    expect(displayedStep6Algorithms).toEqual([
      ["R' F' L' F R F' L F", "R' F' L' F R F' L F", "U R' F' L' F R F' L F"],
      ["R' F' L' F R F' L F", "U' R' F' L' F R F' L F", "U2 R' F' L' F R F' L F"],
      ["R' F' L' F R F' L F"],
      ["R' F' L' F R F' L F", "U2 R' F' L' F R F' L F"],
      ["R' F' L' F R F' L F", "U' R' F' L' F R F' L F"],
      ["U R' F' L' F R F' L F", "U R' F' L' F R F' L F"],
      ["R' F' L' F R F' L F", "R' F' L' F R F' L F"],
    ])
    caseUrls.forEach((url) => {
      const topFace = url.searchParams.get('fc').slice(0, 9)
      const faces = getFaceletFaces(url.searchParams.get('fc'))
      const sideTopFacelets = `${faces.R.slice(0, 3)}${faces.F.slice(0, 3)}${faces.L.slice(0, 3)}${faces.B.slice(0, 3)}`
      const cornerOrientationSum = cornerStickers.reduce((sum, corner) => {
        const topSticker = topFace[corner.top]
        const sideASticker = faces[corner.sideA[0]][corner.sideA[1]]
        const sideBSticker = faces[corner.sideB[0]][corner.sideB[1]]
        const yellowStickerCount = [topSticker, sideASticker, sideBSticker].filter((sticker) => sticker === 'y').length

        expect(yellowStickerCount).toBe(1)

        if (topSticker === 'y') {
          return sum
        }

        return sum + (sideASticker === 'y' ? 1 : 2)
      }, 0)

      expect(url.searchParams.get('case')).toBeNull()
      expect(url.searchParams.get('fc')).toHaveLength(54)
      expect(url.searchParams.get('stage')).toBeNull()
      expect(url.searchParams.get('view')).toBeNull()
      expect(topFace[1]).toBe('y')
      expect(topFace[3]).toBe('y')
      expect(topFace[4]).toBe('y')
      expect(topFace[5]).toBe('y')
      expect(topFace[7]).toBe('y')
      expect(topFace).not.toBe('yyyyyyyyy')
      expect(topCornerIndices.filter((index) => topFace[index] === 'y')).not.toHaveLength(3)
      expect(cornerOrientationSum % 3).toBe(0)
      expect(sideTopFacelets[1]).toBe('l')
      expect(sideTopFacelets[4]).toBe('l')
      expect(sideTopFacelets[7]).toBe('l')
      expect(sideTopFacelets[10]).toBe('l')
      expect(sideTopFacelets).toContain('y')
    })
    beginnerCases.BEGINNER_STEP_6.forEach((item) => {
      const solvedFacelets = applyFaceletAlgorithms(item.visualFaceletColors, item.algorithms)

      expect(getFaceletFaces(solvedFacelets).U).toBe('yyyyyyyyy')
    })
  })

  it('should_render_beginner_corner_position_cases_with_muted_edge_facelets', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '7단계 3층 코너 맞추기 2가지 케이스' }))

    const completionUrl = new URL(screen.getByRole('img', { name: '3층 코너 위치 완성 completion cube' }).getAttribute('src'))
    const adjacentUrl = new URL(screen.getByRole('img', { name: '인접 코너 교환 visual cube' }).getAttribute('src'))
    const diagonalUrl = new URL(screen.getByRole('img', { name: '대각선 코너 교환 visual cube' }).getAttribute('src'))
    const completionFacelets = completionUrl.searchParams.get('fc')
    const completionFaces = getFaceletFaces(completionUrl.searchParams.get('fc'))
    const adjacentFaces = getFaceletFaces(adjacentUrl.searchParams.get('fc'))
    const diagonalFaces = getFaceletFaces(diagonalUrl.searchParams.get('fc'))
    const getSideTopRows = (faces) => ({
      R: faces.R.slice(0, 3),
      F: faces.F.slice(0, 3),
      L: faces.L.slice(0, 3),
      B: faces.B.slice(0, 3),
    })
    const expectMutedThirdLayerEdges = (faces) => {
      const sideFaces = ['R', 'F', 'L', 'B']

      expect(faces.U).toBe('yyyyyyyyy')
      expect(faces.D).toBe('wwwwwwwww')
      sideFaces.forEach((face) => {
        expect(faces[face][1]).toBe('l')
      })
      expect(faces.R.slice(3, 9)).toBe('rrrrrr')
      expect(faces.F.slice(3, 9)).toBe('bbbbbb')
      expect(faces.L.slice(3, 9)).toBe('oooooo')
      expect(faces.B.slice(3, 9)).toBe('gggggg')
    }
    const countMismatchedTopCorners = (faces, face) =>
      [0, 2].filter((index) => faces[face][index] !== faces[face][4]).length

    expect(completionUrl.searchParams.get('stage')).toBeNull()
    expect(completionUrl.searchParams.get('view')).toBeNull()
    expect(adjacentUrl.searchParams.get('case')).toBeNull()
    expect(adjacentUrl.searchParams.get('stage')).toBeNull()
    expect(diagonalUrl.searchParams.get('case')).toBeNull()
    expect(diagonalUrl.searchParams.get('stage')).toBeNull()
    expect(screen.queryByRole('img', { name: '인접 코너 교환 방향' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '대각선 코너 교환 방향' })).not.toBeInTheDocument()
    expect(adjacentUrl.searchParams.get('fc')).not.toBe(completionUrl.searchParams.get('fc'))
    expect(diagonalUrl.searchParams.get('fc')).not.toBe(completionUrl.searchParams.get('fc'))
    expect(diagonalUrl.searchParams.get('fc')).not.toBe(adjacentUrl.searchParams.get('fc'))
    const faceletGroups = [completionFaces, adjacentFaces, diagonalFaces]

    faceletGroups.forEach(expectMutedThirdLayerEdges)
    expect(getSideTopRows(completionFaces)).toEqual({ R: 'rlr', F: 'blb', L: 'olo', B: 'glg' })
    expect(getSideTopRows(adjacentFaces)).toEqual({ R: 'glb', F: 'blr', L: 'olo', B: 'rlg' })
    expect(getSideTopRows(diagonalFaces)).toEqual({ R: 'olr', F: 'blg', L: 'rlo', B: 'glb' })
    expect(getSideTopRows(diagonalFaces)).not.toEqual(getSideTopRows(completionFaces))
    beginnerCases.BEGINNER_STEP_7.forEach((item) => {
      expect(applyFaceletAlgorithm(item.visualFaceletColors, item.algorithm)).toBe(completionFacelets)
    })
    expect(['R', 'F', 'L', 'B'].map((face) => countMismatchedTopCorners(diagonalFaces, face))).toEqual([1, 1, 1, 1])
  })

  it('should_render_beginner_cross_guide_without_case_visuals_or_algorithm_blocks', () => {
    const { container } = render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '초보자' }))
    fireEvent.click(screen.getByRole('button', { name: '1단계 십자 맞추기 안내' }))

    const nextStepButton = screen.getByRole('button', { name: '다음 단계 (2단계: 십자 엣지 맞추기)' })
    const stepDescription = screen.getByText(/흰색 엣지 네 조각을 찾아 상단 흰색 센터 주변으로 옮깁니다/)
    const stepGuide = screen.getByText(/흰색 센터가 위로 보이게 잡고/)

    expect(nextStepButton.compareDocumentPosition(stepDescription) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(nextStepButton.compareDocumentPosition(stepGuide) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/흰색 센터가 위로 보이게 잡고/)).toBeInTheDocument()
    expect(screen.getByText(/정면\(F\)/)).toBeInTheDocument()
    expect(screen.getByText(/흰색 엣지를 빈 십자 자리로 옮기는 흐름만 보면 됩니다/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '목표는 흰색 십자입니다' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '흰색 엣지를 찾습니다' })).toBeInTheDocument()
    const guideUrls = screen
      .getAllByRole('img', { name: /guide cube/ })
      .map((image) => new URL(image.getAttribute('src')))

    expect(guideUrls).toHaveLength(5)
    guideUrls.forEach((url) => {
      expect(url.searchParams.get('fc')).toHaveLength(54)
      expect(url.searchParams.get('fc')).toMatch(/^[lw]+$/)
      expect(url.searchParams.get('view')).toBeNull()
    })
    expect(screen.getByRole('heading', { name: '흰색 십자 완성' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '앞면 위쪽 엣지 올리기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '윗면 빈 자리 맞추기' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('img', { name: /visual cube/ })).toHaveLength(0)
    const completionUrl = new URL(screen.getByRole('img', { name: '흰색 십자 완성 completion cube' }).getAttribute('src'))
    expect(completionUrl.searchParams.get('view')).toBeNull()
    expect(screen.queryByText(/공식/)).not.toBeInTheDocument()
    expect(screen.queryByText('F R')).not.toBeInTheDocument()
    expect(container.querySelector('.learning-case-grid')).toBeNull()
    expect(container.querySelectorAll('.learning-algorithm')).toHaveLength(0)
  })

  it('should_render_cfop_cases_when_cfop_tab_is_selected', () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'F2L' }))

    expect(screen.getByRole('tab', { name: 'F2L' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'F2L' })).toBeInTheDocument()
    expect(screen.getByText("U R U' R'")).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'F2L 01 visual cube' })).toHaveAttribute(
      'src',
      expect.stringContaining('case=U+R+U%27+R%27'),
    )
  })
})
