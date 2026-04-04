export const communityCategories = [
  { key: 'ALL', label: '전체' },
  { key: 'NOTICE', label: '공지' },
  { key: 'FREE', label: '자유' },
]

export const mockCommunityPosts = [
  { id: 101, category: 'NOTICE', title: '큐빙허브 오픈 베타 안내', authorNickname: 'admin', viewCount: 412, createdAt: '2026-04-04T10:12:00', content: '안녕하세요 큐빙허브 관리자입니다.\n\n오픈 베타 테스트를 시작합니다. 게시판을 자유롭게 이용해 보세요.', comments: [{ id: 1, authorNickname: 'chiho', content: '축하합니다!', createdAt: '2026-04-04T11:00:00' }] },
  { id: 102, category: 'NOTICE', title: '4월 서버 점검 일정 공지', authorNickname: 'admin', viewCount: 265, createdAt: '2026-04-03T18:40:00', content: '4월 정기점검은 4월 15일 자정에 진행될 예정입니다.\n\n감사합니다.', comments: [] },
  { id: 201, category: 'FREE', title: '오늘 3x3 평균 11초대 들어왔습니다', authorNickname: 'chiho', viewCount: 128, createdAt: '2026-04-04T19:05:00', content: '대회 준비하면서 계속 12초대에 머물러 있었는데 드디어 11초대로 진입했습니다!\n\n앞으로 더 연습해서 서브 10 노려보겠습니다.', comments: [{ id: 1, authorNickname: 'cube_note', content: '오 서브 10 응원합니다!', createdAt: '2026-04-04T19:15:00' }, { id: 2, authorNickname: 'turnlover', content: '대단하시네요 축하드려요~', createdAt: '2026-04-04T20:00:00' }] },
  { id: 202, category: 'FREE', title: 'F2L 연습 루틴 어떻게 잡고 계신가요?', authorNickname: 'cube_note', viewCount: 74, createdAt: '2026-04-04T17:42:00', content: 'F2L 시간이 너무 오래 걸려서 묻습니다.\n다들 어떤 방식으로 훈련하시는지 팁 좀 공유 부탁드립니다.', comments: [] },
  { id: 203, category: 'FREE', title: '원핸드 입문할 때 추천하는 큐브 있을까요', authorNickname: 'onehand_j', viewCount: 56, createdAt: '2026-04-04T15:27:00', content: '최근에 투핸드가 지겨워서 원핸드 입문하려고 하는데요, \n54mm나 55mm대 작은 큐브 중에 가볍고 원핸드용으로 좋은 큐브 추천 부탁드립니다.', comments: [{ id: 1, authorNickname: 'chiho', content: 'Tornado V3 파이오니어나 WRM 추천합니다!', createdAt: '2026-04-04T16:00:00' }] },
  { id: 204, category: 'FREE', title: 'GAN 12와 WRM V10 체감 비교', authorNickname: 'turnlover', viewCount: 183, createdAt: '2026-04-04T14:16:00', content: 'GAN 12는 특유의 자력 느낌이 좋았는데 이번에 WRM V10 써보니 느낌이 또 다르네요. \n둘 다 메인으로 번갈아 쓰기 좋은 것 같습니다.', comments: [] },
  { id: 205, category: 'FREE', title: 'PLL 암기할 때 다들 어떤 순서로 외우세요?', authorNickname: 'pllmaster', viewCount: 91, createdAt: '2026-04-03T23:11:00', content: '처음 PLL 21개를 배울 때 쉬운 것부터 할지 비슷한 모양부터 할지 고민됩니다.\n다들 어떻게 하셨나요?', comments: [{ id: 1, authorNickname: 'admin', content: '학습 탭에 있는 케이스 순서대로 차근차근 외우시는 것을 추천합니다.', createdAt: '2026-04-04T09:00:00' }] },
  { id: 206, category: 'FREE', title: '대회 첫 참가 준비물 체크해봤습니다', authorNickname: 'wca_rookie', viewCount: 142, createdAt: '2026-04-03T20:33:00', content: '기록 측정용 폰, 예비 큐브, 신분증 등등 챙겼는데 이것 말고도 필요한게 있을까요?\n대회장 분위기 궁금합니다.', comments: [] },
  { id: 207, category: 'FREE', title: '스큐브 재미 붙었는데 랭킹 종목도 추가되면 좋겠네요', authorNickname: 'skewbday', viewCount: 47, createdAt: '2026-04-03T18:55:00', content: '스큐브 나름 매력 있는 것 같습니다.\n다음에 꼭 지원되었으면 하네요.', comments: [] },
  { id: 208, category: 'FREE', title: '큐브 윤활 조합 추천 부탁드립니다', authorNickname: 'lube_lab', viewCount: 68, createdAt: '2026-04-03T16:09:00', content: '실리콘계열 섞어서 쓰시는 분 계신가요?\n부드러우면서도 스피드 유지할 수 있는 비율이 궁금합니다.', comments: [] },
  { id: 209, category: 'FREE', title: '최근 기록 저장 흐름 꽤 편해졌네요', authorNickname: 'timerfan', viewCount: 38, createdAt: '2026-04-03T14:20:00', content: '타이머 페이지 업데이트 되고 나서 쓰기 편해진 것 같습니다.\n감사합니다.', comments: [] },
  { id: 210, category: 'FREE', title: '4x4 패리티 공식 정리한 분 계실까요?', authorNickname: 'bigcube_k', viewCount: 59, createdAt: '2026-04-03T11:47:00', content: 'OLL 패리티 걸릴 때마다 머리가 하얘지네요.\n쉽게 외우는 팁이 필요합니다.', comments: [] },
]

export const communityPageSize = 8
