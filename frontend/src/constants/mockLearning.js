// Static learning data curated for CubingHub.
export const mockLearningTabs = [
  { key: 'BEGINNER', label: '초보자', itemCount: 8 },
  { key: 'F2L', label: 'F2L', itemCount: 41 },
  { key: 'OLL', label: 'OLL', itemCount: 57 },
  { key: 'PLL', label: 'PLL', itemCount: 21 },
];

export const beginnerSteps = [
  {
    key: 'BEGINNER_STEP_1',
    label: '1단계',
    title: '십자 맞추기',
    caseCount: 0,
    metaLabel: '안내',
    description: '흰색 엣지 네 조각을 찾아 상단 흰색 센터 주변으로 옮깁니다. 옆면 색 정렬은 2단계에서 맞춥니다.',
    holdDescription: '흰색 센터가 위로 보이게 잡고, 그림 아래쪽에 이어진 면을 정면(F)으로 둡니다. 흰색 엣지를 빈 십자 자리로 옮기는 흐름만 보면 됩니다.',
  },
  { key: 'BEGINNER_STEP_2', label: '2단계', title: '십자 엣지 맞추기', caseCount: 2, description: '십자 엣지의 옆면 색을 같은 색 센터와 맞춥니다.' },
  { key: 'BEGINNER_STEP_3', label: '3단계', title: '1층 맞추기', caseCount: 3, description: '윗층에 있는 코너를 목표 위치 위로 가져온 뒤 1층에 넣습니다.' },
  { key: 'BEGINNER_STEP_4', label: '4단계', title: '2층 맞추기', caseCount: 2, description: '윗층의 엣지를 오른쪽 또는 왼쪽 2층 슬롯에 넣습니다.' },
  { key: 'BEGINNER_STEP_5', label: '5단계', title: '윗면 십자 맞추기', caseCount: 3, description: '같은 공식을 반복해 윗면 엣지를 십자 모양으로 맞춥니다.' },
  { key: 'BEGINNER_STEP_6', label: '6단계', title: '윗면 맞추기', caseCount: 7, description: '윗면 코너 방향을 맞춰 윗면 한 색을 완성합니다.' },
  { key: 'BEGINNER_STEP_7', label: '7단계', title: '3층 코너 맞추기', caseCount: 2, description: '윗면을 유지한 상태에서 3층 코너 조각의 위치를 맞춥니다.' },
  { key: 'BEGINNER_STEP_8', label: '8단계', title: '3층 엣지 맞추기', caseCount: 4, description: '마지막으로 3층 엣지 조각을 순환시켜 큐브를 완성합니다.' },
];

const BEGINNER_STEP_3_RIGHT_CORNER_ALGORITHM = "R U R'";
const BEGINNER_STEP_4_RIGHT_EDGE_ALGORITHM = "U R U' R' F R' F' R";
const BEGINNER_STEP_5_ALGORITHM = "F R U R' U' F'";
const BEGINNER_STEP_6_ALGORITHM = "R' F' L' F R F' L F";
const BEGINNER_STEP_7_ADJACENT_ALGORITHM = "R U2 R' U' R U2 L' U R' U' L";
const BEGINNER_STEP_7_DIAGONAL_ALGORITHM = "F R U' R' U' R U R' F' R U R' U' R' F R F'";
const BEGINNER_STEP_8_CLOCKWISE_ALGORITHM = "R2 U F B' R2 F' B U R2";
const BEGINNER_STEP_8_COUNTERCLOCKWISE_ALGORITHM = "R2 U' F B' R2 F' B U' R2";
const BEGINNER_GREY_FACE = 'lllllllll';
const BEGINNER_STEP_1_MUTED_FACELET_SUFFIX = `${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}`;
const BEGINNER_STEP_1_COMPLETE_FACELETS = `lwlwwwlwl${BEGINNER_STEP_1_MUTED_FACELET_SUFFIX}`;
const BEGINNER_WHITE_CROSS_FACE = 'lwlwwwlwl';
const BEGINNER_STEP_2_RED_EDGE_ALIGNED_FACE = 'lrllrllll';
const BEGINNER_STEP_2_BLUE_EDGE_ALIGNED_FACE = 'lbllbllll';
const BEGINNER_STEP_2_ORANGE_EDGE_ALIGNED_FACE = 'lollollll';
const BEGINNER_STEP_2_GREEN_EDGE_ALIGNED_FACE = 'lgllgllll';
const BEGINNER_STEP_2_ADJACENT_RED_FACE = 'lbllrllll';
const BEGINNER_STEP_2_ADJACENT_BLUE_FACE = 'lrllbllll';
const BEGINNER_STEP_2_OPPOSITE_RED_FACE = 'lollrllll';
const BEGINNER_STEP_2_OPPOSITE_ORANGE_FACE = 'lrllollll';
const BEGINNER_STEP_2_COMPLETE_FACELETS = `${BEGINNER_WHITE_CROSS_FACE}${BEGINNER_STEP_2_RED_EDGE_ALIGNED_FACE}${BEGINNER_STEP_2_BLUE_EDGE_ALIGNED_FACE}${BEGINNER_GREY_FACE}${BEGINNER_STEP_2_ORANGE_EDGE_ALIGNED_FACE}${BEGINNER_STEP_2_GREEN_EDGE_ALIGNED_FACE}`;
const BEGINNER_STEP_2_ADJACENT_FACELETS = `${BEGINNER_WHITE_CROSS_FACE}${BEGINNER_STEP_2_ADJACENT_RED_FACE}${BEGINNER_STEP_2_ADJACENT_BLUE_FACE}${BEGINNER_GREY_FACE}${BEGINNER_STEP_2_ORANGE_EDGE_ALIGNED_FACE}${BEGINNER_STEP_2_GREEN_EDGE_ALIGNED_FACE}`;
const BEGINNER_STEP_2_OPPOSITE_FACELETS = `${BEGINNER_WHITE_CROSS_FACE}${BEGINNER_STEP_2_OPPOSITE_RED_FACE}${BEGINNER_STEP_2_BLUE_EDGE_ALIGNED_FACE}${BEGINNER_GREY_FACE}${BEGINNER_STEP_2_OPPOSITE_ORANGE_FACE}${BEGINNER_STEP_2_GREEN_EDGE_ALIGNED_FACE}`;
const BEGINNER_STEP_3_COMPLETE_FACELETS = 'wwwwwwwwwrrrllllllbbbllllllyyyyyyyyyooollllllgggllllll';
const BEGINNER_OLL_FACELET_SUFFIX = 'rrrrrrrrrbbbbbbbbbwwwwwwwwwoooooooooggggggggg';
const BEGINNER_TWO_LAYER_SUFFIX = 'lllrrrrrrlllbbbbbbwwwwwwwwwllloooooolllgggggg';
const BEGINNER_STEP_4_COMPLETE_FACELETS = `llllyllll${BEGINNER_TWO_LAYER_SUFFIX}`;
const BEGINNER_STEP_5_COMPLETE_FACELETS = `lylyyylyl${BEGINNER_TWO_LAYER_SUFFIX}`;
const BEGINNER_STEP_6_COMPLETE_FACELETS = `yyyyyyyyy${BEGINNER_TWO_LAYER_SUFFIX}`;
const BEGINNER_STEP_7_COMPLETE_FACELETS = 'yyyyyyyyyrlrrrrrrrblbbbbbbbwwwwwwwwwoloooooooglggggggg';
const BEGINNER_STEP_8_COMPLETE_FACELETS = `yyyyyyyyy${BEGINNER_OLL_FACELET_SUFFIX}`;
const BEGINNER_STEP_1_CENTER_FACELETS = `llllwllll${BEGINNER_STEP_1_MUTED_FACELET_SUFFIX}`;
const BEGINNER_STEP_1_FRONT_EDGE_FACELETS = `llllwllll${BEGINNER_GREY_FACE}lwlllllll${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}${BEGINNER_GREY_FACE}`;
const BEGINNER_STEP_1_TOP_EDGE_FACELETS = `llllwwlll${BEGINNER_STEP_1_MUTED_FACELET_SUFFIX}`;
const BEGINNER_STEP_1_THREE_EDGE_FACELETS = `lwlwwwlll${BEGINNER_STEP_1_MUTED_FACELET_SUFFIX}`;
const BEGINNER_STEP_5_L_FACELETS = `lylyyllll${BEGINNER_OLL_FACELET_SUFFIX}`;
const BEGINNER_STEP_5_LINE_FACELETS = `lllyyylll${BEGINNER_OLL_FACELET_SUFFIX}`;
const BEGINNER_STEP_5_DOT_FACELETS = `llllyllll${BEGINNER_OLL_FACELET_SUFFIX}`;
const createBeginnerStep6Facelets = (topFace, rightTop, frontTop, leftTop, backTop) =>
  `${topFace}${rightTop}rrrrrr${frontTop}bbbbbb${'wwwwwwwww'}${leftTop}oooooo${backTop}gggggg`;
const BEGINNER_STEP_6_NO_CORNER_A_FACELETS = createBeginnerStep6Facelets('lylyyylyl', 'lll', 'lly', 'yly', 'yll');
const BEGINNER_STEP_6_NO_CORNER_B_FACELETS = createBeginnerStep6Facelets('lylyyylyl', 'yly', 'lll', 'yly', 'lll');
const BEGINNER_STEP_6_ONE_CORNER_A_FACELETS = createBeginnerStep6Facelets('yylyyylyl', 'yll', 'yll', 'lll', 'yll');
const BEGINNER_STEP_6_ONE_CORNER_B_FACELETS = createBeginnerStep6Facelets('lylyyylyy', 'lly', 'lll', 'lly', 'lly');
const BEGINNER_STEP_6_TWO_BACK_CORNERS_FACELETS = createBeginnerStep6Facelets('yyyyyylyl', 'lll', 'yly', 'lll', 'lll');
const BEGINNER_STEP_6_TWO_LEFT_CORNERS_FACELETS = createBeginnerStep6Facelets('yylyyyyyl', 'lll', 'lly', 'lll', 'yll');
const BEGINNER_STEP_6_TWO_DIAGONAL_CORNERS_FACELETS = createBeginnerStep6Facelets('yylyyylyy', 'lll', 'lll', 'lly', 'yll');
const BEGINNER_STEP_7_ADJACENT_CORNER_FACELETS = 'yyyyyyyyyglbrrrrrrblrbbbbbbwwwwwwwwwolooooooorlggggggg';
const BEGINNER_STEP_7_DIAGONAL_CORNER_FACELETS = 'yyyyyyyyyolrrrrrrrblgbbbbbbwwwwwwwwwrloooooooglbgggggg';
const createBeginnerStep6Algorithms = (sequences) =>
  sequences.map((sequence, index) => ({ label: `${index + 1}회`, sequence }));
const BEGINNER_STEP_6_NO_CORNER_A_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
  BEGINNER_STEP_6_ALGORITHM,
  `U ${BEGINNER_STEP_6_ALGORITHM}`,
]);
const BEGINNER_STEP_6_NO_CORNER_B_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
  `U' ${BEGINNER_STEP_6_ALGORITHM}`,
  `U2 ${BEGINNER_STEP_6_ALGORITHM}`,
]);
const BEGINNER_STEP_6_BASIC_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
]);
const BEGINNER_STEP_6_ONE_CORNER_A_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
  `U2 ${BEGINNER_STEP_6_ALGORITHM}`,
]);
const BEGINNER_STEP_6_ONE_CORNER_B_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
  `U' ${BEGINNER_STEP_6_ALGORITHM}`,
]);
const BEGINNER_STEP_6_TWO_BACK_CORNERS_ALGORITHMS = createBeginnerStep6Algorithms([
  `U ${BEGINNER_STEP_6_ALGORITHM}`,
  `U ${BEGINNER_STEP_6_ALGORITHM}`,
]);
const BEGINNER_STEP_6_TWO_LEFT_CORNERS_ALGORITHMS = createBeginnerStep6Algorithms([
  BEGINNER_STEP_6_ALGORITHM,
  BEGINNER_STEP_6_ALGORITHM,
]);

export const beginnerStepGuides = {
  BEGINNER_STEP_1: [
    {
      id: 'beginner-step-1-guide-1',
      title: '목표는 흰색 십자입니다',
      description: '흰색 엣지 네 조각을 흰색 센터 주변에 모읍니다. 옆면 색은 다음 단계에서 맞춥니다.',
      visualFaceletColors: BEGINNER_STEP_1_COMPLETE_FACELETS,
      stage: '',
    },
    {
      id: 'beginner-step-1-guide-2',
      title: '흰색 센터를 위로 둡니다',
      description: '큐브를 돌려 흰색 센터가 윗면 중앙에 오게 잡습니다. 이 방향을 유지하고 흰색 엣지를 찾습니다.',
      visualFaceletColors: BEGINNER_STEP_1_CENTER_FACELETS,
      stage: '',
    },
    {
      id: 'beginner-step-1-guide-3',
      title: '흰색 엣지를 찾습니다',
      description: '전, 후, 좌, 우, 아래쪽 면에서 흰색이 붙은 엣지 조각을 찾습니다. 코너 조각은 십자에 쓰지 않습니다.',
      visualFaceletColors: BEGINNER_STEP_1_FRONT_EDGE_FACELETS,
      stage: '',
    },
    {
      id: 'beginner-step-1-guide-4',
      title: '빈 십자 자리로 옮깁니다',
      description: '이미 올라간 흰색 엣지를 깨지 않도록 윗면의 빈 자리를 만든 뒤, 찾은 흰색 엣지를 위로 옮깁니다.',
      visualFaceletColors: BEGINNER_STEP_1_TOP_EDGE_FACELETS,
      stage: '',
    },
    {
      id: 'beginner-step-1-guide-5',
      title: '같은 흐름을 반복합니다',
      description: '남은 흰색 엣지도 같은 방식으로 빈 십자 자리로 옮깁니다. 네 조각이 모두 모이면 1단계가 끝납니다.',
      visualFaceletColors: BEGINNER_STEP_1_THREE_EDGE_FACELETS,
      stage: '',
    },
  ],
};

export const beginnerStepCompletions = {
  BEGINNER_STEP_1: {
    id: 'beginner-complete-1',
    name: '완료 모습',
    title: '흰색 십자 완성',
    visualFaceletColors: BEGINNER_STEP_1_COMPLETE_FACELETS,
    stage: '',
    description: '상단 흰색 센터와 흰색 엣지 네 조각이 십자를 이룬 상태입니다. 옆면 색 정렬은 다음 단계에서 맞춥니다.',
  },
  BEGINNER_STEP_2: {
    id: 'beginner-complete-2',
    name: '완료 모습',
    title: '흰색 십자 옆면 정렬',
    visualFaceletColors: BEGINNER_STEP_2_COMPLETE_FACELETS,
    stage: '',
    description: '흰색 십자의 옆면 색이 각 면의 센터 색과 맞은 상태입니다.',
  },
  BEGINNER_STEP_3: {
    id: 'beginner-complete-3',
    name: '완료 모습',
    title: '1층 완성',
    visualFaceletColors: BEGINNER_STEP_3_COMPLETE_FACELETS,
    visualView: 'plan',
    stage: '',
    description: '흰색 면과 1층 옆면 줄이 함께 맞은 상태입니다.',
  },
  BEGINNER_STEP_4: {
    id: 'beginner-complete-4',
    name: '완료 모습',
    title: '2층 완성',
    visualFaceletColors: BEGINNER_STEP_4_COMPLETE_FACELETS,
    stage: '',
    description: '1층과 2층이 맞고 마지막 층만 남은 상태입니다.',
  },
  BEGINNER_STEP_5: {
    id: 'beginner-complete-5',
    name: '완료 모습',
    title: '윗면 십자 완성',
    visualFaceletColors: BEGINNER_STEP_5_COMPLETE_FACELETS,
    stage: 'OLL',
    description: '윗면 노란 센터와 엣지 네 조각이 십자를 이룬 상태입니다.',
  },
  BEGINNER_STEP_6: {
    id: 'beginner-complete-6',
    name: '완료 모습',
    title: '윗면 완성',
    visualFaceletColors: BEGINNER_STEP_6_COMPLETE_FACELETS,
    stage: '',
    description: '윗면 노란색 전체가 맞은 상태입니다.',
  },
  BEGINNER_STEP_7: {
    id: 'beginner-complete-7',
    name: '완료 모습',
    title: '3층 코너 위치 완성',
    visualFaceletColors: BEGINNER_STEP_7_COMPLETE_FACELETS,
    stage: '',
    description: '윗면을 유지한 채 3층 코너 위치가 맞은 상태입니다. 3층 엣지 조각만 회색으로 가려 코너 위치만 봅니다.',
  },
  BEGINNER_STEP_8: {
    id: 'beginner-complete-8',
    name: '완료 모습',
    title: '큐브 완성',
    visualFaceletColors: BEGINNER_STEP_8_COMPLETE_FACELETS,
    stage: 'PLL',
    description: '모든 면이 맞아 큐브가 완성된 상태입니다.',
  },
};

export const beginnerCases = {
  BEGINNER_STEP_1: [],
  BEGINNER_STEP_2: [
    { id: 'beginner-2-01', name: '케이스 1', title: '인접 엣지 보정', algorithm: "R2 U' R2 U R2", visualFaceletColors: BEGINNER_STEP_2_ADJACENT_FACELETS, description: '맞지 않는 십자 엣지 두 개가 인접해 있을 때 사용합니다.' },
    { id: 'beginner-2-02', name: '케이스 2', title: '반대 엣지 보정', algorithm: 'R2 U2 R2 U2 R2', visualFaceletColors: BEGINNER_STEP_2_OPPOSITE_FACELETS, description: '맞지 않는 십자 엣지 두 개가 서로 반대편에 있을 때 사용합니다.' },
  ],
  BEGINNER_STEP_3: [
    { id: 'beginner-3-01', name: '케이스 1', title: '오른쪽 위 코너 삽입', algorithm: BEGINNER_STEP_3_RIGHT_CORNER_ALGORITHM, stage: 'F2L', visualMask: 'thirdLayerEdges', description: '코너가 오른쪽 위에 있을 때 1층으로 넣습니다.' },
    { id: 'beginner-3-02', name: '케이스 2', title: '앞면 코너 삽입', algorithm: "R' F R F'", stage: 'F2L', visualMask: 'thirdLayerEdges', description: '코너가 앞쪽으로 향해 있을 때 사용합니다.' },
    { id: 'beginner-3-03', name: '케이스 3', title: '방향 보정 후 삽입', algorithm: "R U2 R' U' R U R'", stage: 'F2L', visualMask: 'thirdLayerEdges', description: '코너 방향을 먼저 보정한 뒤 1층으로 넣습니다.' },
  ],
  BEGINNER_STEP_4: [
    { id: 'beginner-4-01', name: '케이스 1', title: '오른쪽 2층 삽입', algorithm: BEGINNER_STEP_4_RIGHT_EDGE_ALGORITHM, stage: 'F2L', description: '윗층 엣지를 오른쪽 2층 슬롯으로 넣습니다.' },
    { id: 'beginner-4-02', name: '케이스 2', title: '왼쪽 2층 삽입', algorithm: "U' L' U L F' L F L'", stage: 'F2L', description: '윗층 엣지를 왼쪽 2층 슬롯으로 넣습니다.' },
  ],
  BEGINNER_STEP_5: [
    { id: 'beginner-5-01', name: '케이스 1', title: '뒤집힌 ㄴ자에서 십자 만들기', algorithm: BEGINNER_STEP_5_ALGORITHM, visualFaceletColors: BEGINNER_STEP_5_L_FACELETS, stage: 'OLL', description: '' },
    { id: 'beginner-5-02', name: '케이스 2', title: '일자에서 십자 만들기', algorithm: BEGINNER_STEP_5_ALGORITHM, visualFaceletColors: BEGINNER_STEP_5_LINE_FACELETS, stage: 'OLL', description: '' },
    { id: 'beginner-5-03', name: '케이스 3', title: '점에서 십자 만들기', algorithm: BEGINNER_STEP_5_ALGORITHM, visualFaceletColors: BEGINNER_STEP_5_DOT_FACELETS, stage: 'OLL', description: '' },
  ],
  BEGINNER_STEP_6: [
    { id: 'beginner-6-01', name: '케이스 1', title: '3회 반복 - 노란 코너 0개 A', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_NO_CORNER_A_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_NO_CORNER_A_FACELETS, stage: '', description: '표시된 순서대로 공식 후 필요한 U 조정까지 따라 하면 윗면이 완성됩니다.' },
    { id: 'beginner-6-02', name: '케이스 2', title: '3회 반복 - 노란 코너 0개 B', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_NO_CORNER_B_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_NO_CORNER_B_FACELETS, stage: '', description: 'U, U prime, U2는 윗면만 돌려 다음 공식의 기준 방향을 맞추는 조정입니다.' },
    { id: 'beginner-6-03', name: '케이스 3', title: '기본형 - 1회', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_BASIC_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_TWO_DIAGONAL_CORNERS_FACELETS, stage: '', description: '이 방향으로 잡으면 공식을 한 번 사용해 윗면이 완성됩니다.' },
    { id: 'beginner-6-04', name: '케이스 4', title: '2회 반복 - 노란 코너 1개 A', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_ONE_CORNER_A_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_ONE_CORNER_A_FACELETS, stage: '', description: '첫 공식 뒤 U2로 윗면만 돌려 기준을 다시 맞춘 다음 한 번 더 적용합니다.' },
    { id: 'beginner-6-05', name: '케이스 5', title: '2회 반복 - 노란 코너 1개 B', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_ONE_CORNER_B_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_ONE_CORNER_B_FACELETS, stage: '', description: '첫 공식 뒤 U prime으로 윗면만 돌려 기준을 다시 맞춘 다음 한 번 더 적용합니다.' },
    { id: 'beginner-6-06', name: '케이스 6', title: '2회 반복 - 노란 코너 2개 A', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_TWO_BACK_CORNERS_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_TWO_BACK_CORNERS_FACELETS, stage: '', description: '각 공식 전에 U로 윗면만 돌려 기준 방향을 맞춥니다.' },
    { id: 'beginner-6-07', name: '케이스 7', title: '2회 반복 - 노란 코너 2개 B', algorithm: BEGINNER_STEP_6_ALGORITHM, algorithms: BEGINNER_STEP_6_TWO_LEFT_CORNERS_ALGORITHMS, visualFaceletColors: BEGINNER_STEP_6_TWO_LEFT_CORNERS_FACELETS, stage: '', description: '같은 방향에서 공식을 두 번 연속 적용하면 윗면이 완성됩니다.' },
  ],
  BEGINNER_STEP_7: [
    { id: 'beginner-7-01', name: '케이스 1', title: '인접 코너 교환', algorithm: BEGINNER_STEP_7_ADJACENT_ALGORITHM, visualFaceletColors: BEGINNER_STEP_7_ADJACENT_CORNER_FACELETS, stage: '', description: '한 면의 코너 두 개는 맞고, 인접한 코너 위치를 맞춰야 하는 상태입니다.' },
    { id: 'beginner-7-02', name: '케이스 2', title: '대각선 코너 교환', algorithm: BEGINNER_STEP_7_DIAGONAL_ALGORITHM, visualFaceletColors: BEGINNER_STEP_7_DIAGONAL_CORNER_FACELETS, stage: '', description: '대각선 코너 두 쌍의 위치가 바뀐 상태입니다.' },
  ],
  BEGINNER_STEP_8: [
    { id: 'beginner-8-01', name: '케이스 1', title: '시계 방향 엣지 순환', algorithm: BEGINNER_STEP_8_CLOCKWISE_ALGORITHM, stage: 'PLL', description: '3층 엣지가 시계 방향으로 돌아가야 할 때 사용합니다.' },
    { id: 'beginner-8-02', name: '케이스 2', title: '반시계 방향 엣지 순환', algorithm: BEGINNER_STEP_8_COUNTERCLOCKWISE_ALGORITHM, stage: 'PLL', description: '기본 공식의 U를 U prime으로 바꿔 반대 방향 순환을 처리합니다.' },
    { id: 'beginner-8-03', name: '케이스 3', title: '자리 조정 후 시계 방향', algorithm: BEGINNER_STEP_8_CLOCKWISE_ALGORITHM, visualAlgorithm: `U ${BEGINNER_STEP_8_CLOCKWISE_ALGORITHM}`, stage: 'PLL', description: 'U로 윗면을 맞춘 뒤 시계 방향 순환 공식을 적용합니다.' },
    { id: 'beginner-8-04', name: '케이스 4', title: '자리 조정 후 반시계 방향', algorithm: BEGINNER_STEP_8_COUNTERCLOCKWISE_ALGORITHM, visualAlgorithm: `U' ${BEGINNER_STEP_8_COUNTERCLOCKWISE_ALGORITHM}`, stage: 'PLL', description: 'U prime으로 윗면을 맞춘 뒤 반시계 방향 순환 공식을 적용합니다.' },
  ],
};

export const mockLearningCases = {
  F2L: [
    {
        "id": "f2l-01",
        "name": "F2L 01",
        "algorithm": "U R U' R'"
    },
    {
        "id": "f2l-02",
        "name": "F2L 02",
        "algorithm": "U' F' U F"
    },
    {
        "id": "f2l-03",
        "name": "F2L 03",
        "algorithm": "F' U' F"
    },
    {
        "id": "f2l-04",
        "name": "F2L 04",
        "algorithm": "F' U' F U F' U' F"
    },
    {
        "id": "f2l-05",
        "name": "F2L 05",
        "algorithm": "U' R U R' U2 R U' R'"
    },
    {
        "id": "f2l-06",
        "name": "F2L 06",
        "algorithm": "d R' U' R U2 R' U R"
    },
    {
        "id": "f2l-07",
        "name": "F2L 07",
        "algorithm": "U' R U2 R' U' R U2 R'"
    },
    {
        "id": "f2l-08",
        "name": "F2L 08",
        "algorithm": "U F' U' F U' F' U' F"
    },
    {
        "id": "f2l-09",
        "name": "F2L 09",
        "algorithm": "U' R U' R' U F' U' F"
    },
    {
        "id": "f2l-10",
        "name": "F2L 10",
        "algorithm": "U R U R' U' R U' R'"
    },
    {
        "id": "f2l-11",
        "name": "F2L 11",
        "algorithm": "R U R' U2 R U R'"
    },
    {
        "id": "f2l-12",
        "name": "F2L 12",
        "algorithm": "F' U' F U2 F' U' F"
    },
    {
        "id": "f2l-13",
        "name": "F2L 13",
        "algorithm": "y' U R U' R' U R U' R'"
    },
    {
        "id": "f2l-14",
        "name": "F2L 14",
        "algorithm": "U' R U R' U y' R' U' R"
    },
    {
        "id": "f2l-15",
        "name": "F2L 15",
        "algorithm": "R U' R' U R U' R'"
    },
    {
        "id": "f2l-16",
        "name": "F2L 16",
        "algorithm": "F' U F U' F' U F"
    },
    {
        "id": "f2l-17",
        "name": "F2L 17",
        "algorithm": "U R U2 R' U R U' R'"
    },
    {
        "id": "f2l-18",
        "name": "F2L 18",
        "algorithm": "y' U' R' U2 R U' R' U R"
    },
    {
        "id": "f2l-19",
        "name": "F2L 19",
        "algorithm": "U R U' R' U R U' R'"
    },
    {
        "id": "f2l-20",
        "name": "F2L 20",
        "algorithm": "y' U' R' U R U' R' U R"
    },
    {
        "id": "f2l-21",
        "name": "F2L 21",
        "algorithm": "R U' R' U2 R U R'"
    },
    {
        "id": "f2l-22",
        "name": "F2L 22",
        "algorithm": "F' U F U2 F' U' F"
    },
    {
        "id": "f2l-23",
        "name": "F2L 23",
        "algorithm": "U2 R U R' U R U' R'"
    },
    {
        "id": "f2l-24",
        "name": "F2L 24",
        "algorithm": "y' U2 R' U' R U' R' U R"
    },
    {
        "id": "f2l-25",
        "name": "F2L 25",
        "algorithm": "y' U R' U' R U' R' U' R"
    },
    {
        "id": "f2l-26",
        "name": "F2L 26",
        "algorithm": "U R U' R' F R' F' R"
    },
    {
        "id": "f2l-27",
        "name": "F2L 27",
        "algorithm": "R U' R' U R U' R' U R U' R'"
    },
    {
        "id": "f2l-28",
        "name": "F2L 28",
        "algorithm": "y' R' U R U' R' U R U' R' U R"
    },
    {
        "id": "f2l-29",
        "name": "F2L 29",
        "algorithm": "y' R' U' R U R' U' R"
    },
    {
        "id": "f2l-30",
        "name": "F2L 30",
        "algorithm": "R U R' U' R U R'"
    },
    {
        "id": "f2l-31",
        "name": "F2L 31",
        "algorithm": "U' R U' R' U2 R U' R'"
    },
    {
        "id": "f2l-32",
        "name": "F2L 32",
        "algorithm": "y' U R' U R U2 R' U R"
    },
    {
        "id": "f2l-33",
        "name": "F2L 33",
        "algorithm": "U' R U R' U2 R U R'"
    },
    {
        "id": "f2l-34",
        "name": "F2L 34",
        "algorithm": "U R U' R' U2 F' U' F"
    },
    {
        "id": "f2l-35",
        "name": "F2L 35",
        "algorithm": "U' R U' R' U R U R' U R U' R'"
    },
    {
        "id": "f2l-36",
        "name": "F2L 36",
        "algorithm": "d R' U' R d' R U R'"
    },
    {
        "id": "f2l-37",
        "name": "F2L 37",
        "algorithm": "R U R' U' R U2 R' U' R U R'"
    },
    {
        "id": "f2l-38",
        "name": "F2L 38",
        "algorithm": "R U R' U' R U R' U2 R U' R'"
    },
    {
        "id": "f2l-39",
        "name": "F2L 39",
        "algorithm": "R U R' U2 R U' R' U R U R'"
    },
    {
        "id": "f2l-40",
        "name": "F2L 40",
        "algorithm": "R U' R' U R U2 R' U R U' R'"
    },
    {
        "id": "f2l-41",
        "name": "F2L 41",
        "algorithm": "R U' R' U y' R' U R U' R' U R"
    }
],
  OLL: [
    {
        "id": "oll-01",
        "name": "OLL 01",
        "algorithm": "R U2 R2 F R F' U2 R' F R F'"
    },
    {
        "id": "oll-02",
        "name": "OLL 02",
        "algorithm": "F R U R' U' F' f R U R' U' f'"
    },
    {
        "id": "oll-03",
        "name": "OLL 03",
        "algorithm": "f R U R' U' f' U' F R U R' U' F'"
    },
    {
        "id": "oll-04",
        "name": "OLL 04",
        "algorithm": "f R U R' U' f' U F R U R' U' F'"
    },
    {
        "id": "oll-05",
        "name": "OLL 05",
        "algorithm": "r' U2 R U R' U r"
    },
    {
        "id": "oll-06",
        "name": "OLL 06",
        "algorithm": "r U2 R' U' R U' r'"
    },
    {
        "id": "oll-07",
        "name": "OLL 07",
        "algorithm": "r U R' U R U2 r'"
    },
    {
        "id": "oll-08",
        "name": "OLL 08",
        "algorithm": "r' U' R U' R' U2 r"
    },
    {
        "id": "oll-09",
        "name": "OLL 09",
        "algorithm": "R U R' U' R' F R2 U R' U' F'"
    },
    {
        "id": "oll-10",
        "name": "OLL 10",
        "algorithm": "R U R' U R' F R F' R U2 R'"
    },
    {
        "id": "oll-11",
        "name": "OLL 11",
        "algorithm": "r U R' U R' F R F' R U2 r'"
    },
    {
        "id": "oll-12",
        "name": "OLL 12",
        "algorithm": "M' R' U' R U' R' U2 R U' R r'"
    },
    {
        "id": "oll-13",
        "name": "OLL 13",
        "algorithm": "F U R U' R2 F' R U R U' R'"
    },
    {
        "id": "oll-14",
        "name": "OLL 14",
        "algorithm": "R' F R U R' F' R F U' F'"
    },
    {
        "id": "oll-15",
        "name": "OLL 15",
        "algorithm": "l' U' l L' U' L U l' U l"
    },
    {
        "id": "oll-16",
        "name": "OLL 16",
        "algorithm": "r U r' R U R' U' r U' r'"
    },
    {
        "id": "oll-17",
        "name": "OLL 17",
        "algorithm": "F R' F' R2 r' U R U' R' U' M'"
    },
    {
        "id": "oll-18",
        "name": "OLL 18",
        "algorithm": "r U R' U R U2 r2 U' R U' R' U2 r"
    },
    {
        "id": "oll-19",
        "name": "OLL 19",
        "algorithm": "r' R U R U R' U' M' R' F R F'"
    },
    {
        "id": "oll-20",
        "name": "OLL 20",
        "algorithm": "r U R' U' M2 U R U' R' U' M'"
    },
    {
        "id": "oll-21",
        "name": "OLL 21",
        "algorithm": "R U2 R' U' R U R' U' R U' R'"
    },
    {
        "id": "oll-22",
        "name": "OLL 22",
        "algorithm": "R U2 R2 U' R2 U' R2 U2 R"
    },
    {
        "id": "oll-23",
        "name": "OLL 23",
        "algorithm": "R2 D' R U2 R' D R U2 R"
    },
    {
        "id": "oll-24",
        "name": "OLL 24",
        "algorithm": "r U R' U' r' F R F'"
    },
    {
        "id": "oll-25",
        "name": "OLL 25",
        "algorithm": "F' r U R' U' r' F R"
    },
    {
        "id": "oll-26",
        "name": "OLL 26",
        "algorithm": "R U2 R' U' R U' R'"
    },
    {
        "id": "oll-27",
        "name": "OLL 27",
        "algorithm": "R U R' U R U2 R'"
    },
    {
        "id": "oll-28",
        "name": "OLL 28",
        "algorithm": "r U R' U' M U R U' R'"
    },
    {
        "id": "oll-29",
        "name": "OLL 29",
        "algorithm": "R U R' U' R U' R' F' U' F R U R'"
    },
    {
        "id": "oll-30",
        "name": "OLL 30",
        "algorithm": "F R' F R2 U' R' U' R U R' F2"
    },
    {
        "id": "oll-31",
        "name": "OLL 31",
        "algorithm": "R' U' F U R U' R' F' R"
    },
    {
        "id": "oll-32",
        "name": "OLL 32",
        "algorithm": "L U F' U' L' U L F L'"
    },
    {
        "id": "oll-33",
        "name": "OLL 33",
        "algorithm": "R U R' U' R' F R F'"
    },
    {
        "id": "oll-34",
        "name": "OLL 34",
        "algorithm": "R U R2 U' R' F R U R U' F'"
    },
    {
        "id": "oll-35",
        "name": "OLL 35",
        "algorithm": "R U2 R2 F R F' R U2 R'"
    },
    {
        "id": "oll-36",
        "name": "OLL 36",
        "algorithm": "L' U' L U' L' U L U L F' L' F"
    },
    {
        "id": "oll-37",
        "name": "OLL 37",
        "algorithm": "F R' F' R U R U' R'"
    },
    {
        "id": "oll-38",
        "name": "OLL 38",
        "algorithm": "R U R' U R U' R' U' R' F R F'"
    },
    {
        "id": "oll-39",
        "name": "OLL 39",
        "algorithm": "L F' L' U' L U F U' L'"
    },
    {
        "id": "oll-40",
        "name": "OLL 40",
        "algorithm": "R' F R U R' U' F' U R"
    },
    {
        "id": "oll-41",
        "name": "OLL 41",
        "algorithm": "R U R' U R U2 R' F R U R' U' F'"
    },
    {
        "id": "oll-42",
        "name": "OLL 42",
        "algorithm": "R' U' R U' R' U2 R F R U R' U' F'"
    },
    {
        "id": "oll-43",
        "name": "OLL 43",
        "algorithm": "F' U' L' U L F"
    },
    {
        "id": "oll-44",
        "name": "OLL 44",
        "algorithm": "f R U R' U' f'"
    },
    {
        "id": "oll-45",
        "name": "OLL 45",
        "algorithm": "F R U R' U' F'"
    },
    {
        "id": "oll-46",
        "name": "OLL 46",
        "algorithm": "R' U' R' F R F' U R"
    },
    {
        "id": "oll-47",
        "name": "OLL 47",
        "algorithm": "F' L' U' L U L' U' L U F"
    },
    {
        "id": "oll-48",
        "name": "OLL 48",
        "algorithm": "F R U R' U' R U R' U' F'"
    },
    {
        "id": "oll-49",
        "name": "OLL 49",
        "algorithm": "r U' r2 U r2 U r2 U' r"
    },
    {
        "id": "oll-50",
        "name": "OLL 50",
        "algorithm": "r' U r2 U' r2 U' r2 U r'"
    },
    {
        "id": "oll-51",
        "name": "OLL 51",
        "algorithm": "F U R U' R' U R U' R' F'"
    },
    {
        "id": "oll-52",
        "name": "OLL 52",
        "algorithm": "R U R' U R d' R U' R' F'"
    },
    {
        "id": "oll-53",
        "name": "OLL 53",
        "algorithm": "r' U' R U' R' U R U' R' U2 r"
    },
    {
        "id": "oll-54",
        "name": "OLL 54",
        "algorithm": "r U R' U R U' R' U R U2 r'"
    },
    {
        "id": "oll-55",
        "name": "OLL 55",
        "algorithm": "R U2 R2 U' R U' R' U2 F R F'"
    },
    {
        "id": "oll-56",
        "name": "OLL 56",
        "algorithm": "F R U R' U' R F' r U R' U' r'"
    },
    {
        "id": "oll-57",
        "name": "OLL 57",
        "algorithm": "R U R' U' M' U R U' r'"
    }
],
  PLL: [
    {
        "id": "pll-aa",
        "name": "Aa Perm",
        "algorithm": "x R' U R' D2 R U' R' D2 R2 x'"
    },
    {
        "id": "pll-ab",
        "name": "Ab Perm",
        "algorithm": "x R2 D2 R U R' D2 R U' R x'"
    },
    {
        "id": "pll-e",
        "name": "E Perm",
        "algorithm": "x' R U' R' D R U R' D' R U R' D R U' R' D' x"
    },
    {
        "id": "pll-f",
        "name": "F Perm",
        "algorithm": "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R"
    },
    {
        "id": "pll-ga",
        "name": "Ga Perm",
        "algorithm": "R2 u R' U R' U' R u' R2 y' R' U R"
    },
    {
        "id": "pll-gb",
        "name": "Gb Perm",
        "algorithm": "F' U' F R2 u R' U R U' R u' R2"
    },
    {
        "id": "pll-gc",
        "name": "Gc Perm",
        "algorithm": "R2 u' R U' R U R' u R2 y R U' R'"
    },
    {
        "id": "pll-gd",
        "name": "Gd Perm",
        "algorithm": "R U R' y' R2 u' R U' R' U R' u R2"
    },
    {
        "id": "pll-h",
        "name": "H Perm",
        "algorithm": "M2 U M2 U2 M2 U M2"
    },
    {
        "id": "pll-ja",
        "name": "Ja Perm",
        "algorithm": "x R2 F R F' R U2 r' U r U2 x'"
    },
    {
        "id": "pll-jb",
        "name": "Jb Perm",
        "algorithm": "R U R' F' R U R' U' R' F R2 U' R' U'"
    },
    {
        "id": "pll-na",
        "name": "Na Perm",
        "algorithm": "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'"
    },
    {
        "id": "pll-nb",
        "name": "Nb Perm",
        "algorithm": "r' D' F r U' r' F' D r2 U r' U' r' F r F'"
    },
    {
        "id": "pll-ra",
        "name": "Ra Perm",
        "algorithm": "R U R' F' R U2 R' U2 R' F R U R U2 R'"
    },
    {
        "id": "pll-rb",
        "name": "Rb Perm",
        "algorithm": "R' U2 R U2 R' F R U R' U' R' F' R2"
    },
    {
        "id": "pll-t",
        "name": "T Perm",
        "algorithm": "R U R' U' R' F R2 U' R' U' R U R' F'"
    },
    {
        "id": "pll-ua",
        "name": "Ua Perm",
        "algorithm": "R U' R U R U R U' R' U' R2"
    },
    {
        "id": "pll-ub",
        "name": "Ub Perm",
        "algorithm": "R2 U R U R' U' R' U' R' U R'"
    },
    {
        "id": "pll-v",
        "name": "V Perm",
        "algorithm": "R' U R' d' R' F' R2 U' R' U R' F R F"
    },
    {
        "id": "pll-y",
        "name": "Y Perm",
        "algorithm": "F R U' R' U' R U R' F' R U R' U' R' F R F'"
    },
    {
        "id": "pll-z",
        "name": "Z Perm",
        "algorithm": "M2 U M2 U M' U2 M2 U2 M'"
    }
]
};
