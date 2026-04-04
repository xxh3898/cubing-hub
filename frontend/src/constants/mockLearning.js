export const mockLearningTabs = [
  { key: 'F2L', label: 'F2L', itemCount: 41 },
  { key: 'OLL', label: 'OLL', itemCount: 57 },
  { key: 'PLL', label: 'PLL', itemCount: 21 },
]

export const mockLearningCases = {
  F2L: [
    {
      id: 'f2l-01',
      name: 'Pair Insert 01',
      algorithm: "U R U' R'",
      visualCubeCase: 'R U R\'',
    },
  ],
  OLL: [
    {
      id: 'oll-21',
      name: 'OLL 21',
      algorithm: "R U2 R2 F R F' U2 R' F R F'",
      visualCubeCase: 'R U2 R2 F R F\'',
    },
  ],
  PLL: [
    {
      id: 'pll-t',
      name: 'T Perm',
      algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'",
      visualCubeCase: 'R U R\' U\'',
    },
  ],
}
