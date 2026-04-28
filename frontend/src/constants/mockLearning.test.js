import { describe, expect, it } from 'vitest'
import { buildVisualCubeUrl } from '../utils/visualCube.js'
import { mockLearningCases, mockLearningTabs } from './mockLearning.js'

const cfopStages = ['F2L', 'OLL', 'PLL']
const normalizeAlgorithm = (algorithm) => algorithm.trim().replace(/\s+/g, ' ')

const getDuplicateNamesByValue = (cases, getValue) => {
  const namesByValue = new Map()

  for (const item of cases) {
    const value = getValue(item)
    namesByValue.set(value, [...(namesByValue.get(value) ?? []), item.name])
  }

  return [...namesByValue.values()]
    .filter((names) => names.length > 1)
}

describe('mockLearning', () => {
  it('should_match_cfop_item_counts_when_learning_tabs_are_rendered', () => {
    for (const stage of cfopStages) {
      const tab = mockLearningTabs.find((item) => item.key === stage)

      expect(mockLearningCases[stage]).toHaveLength(tab.itemCount)
    }
  })

  it('should_not_duplicate_cfop_algorithms_when_cases_are_grouped_by_stage', () => {
    for (const stage of cfopStages) {
      const duplicateNames = getDuplicateNamesByValue(
        mockLearningCases[stage],
        (item) => normalizeAlgorithm(item.algorithm),
      )

      expect(duplicateNames).toEqual([])
    }
  })

  it('should_not_duplicate_cfop_visual_cube_urls_when_cases_are_grouped_by_stage', () => {
    for (const stage of cfopStages) {
      const duplicateNames = getDuplicateNamesByValue(
        mockLearningCases[stage],
        (item) => buildVisualCubeUrl({ puzzle: '3x3', algorithm: item.algorithm, stage }),
      )

      expect(duplicateNames).toEqual([])
    }
  })
})
