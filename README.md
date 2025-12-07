# 🧊 React Cube Project (SpeedCubing.io)

![Timer](./react-cube-project/src/assets/Timer.gif)

> **큐브 스피드솔빙을 위한 올인원 유틸리티 웹 애플리케이션**
>
> **Demo**: [https://react-cube-project.vercel.app/](https://react-cube-project.vercel.app/)
>
> **📝 Dev Log**: [**개발 과정 및 트러블 슈팅 회고록 보러가기**](https://xxh3898.tistory.com/entry/React-Cube-Project)

타이머 측정부터 기록 관리, 필수 알고리즘(CFOP) 3D 시각화, 그리고 큐버들을 위한 커뮤니티 기능까지 React로 구현한 웹 서비스입니다. 백엔드 서버 없이 `LocalStorage`와 `Zustand`를 활용하여 데이터 영속성을 구현했습니다.

## 🛠️ 주요 기능 (Features)

### 1. ⏱️ 큐브 타이머 (Cube Timer)
* **스택매트 UX 구현**: 스페이스바를 꾹 눌러(Holding) 준비하고, 떼는 순간(Start) 타이머가 작동합니다.
* **정밀한 시간 측정**: `setInterval`의 오차를 보정하기 위해 `Date.now()`를 활용한 Delta Time 방식으로 정밀한 시간을 계산합니다.
* **스크램블 생성기**: 매회 공정한 기록 측정을 위해 랜덤 스크램블(섞기 공식)을 자동 생성합니다.

### 2. 📊 마이페이지 & 대시보드 (Dashboard)
* **통계 자동화**: 총 솔빙 횟수, **최고 기록(PB)**, **평균 기록(Average)** 을 실시간으로 계산하여 시각화합니다.
* **기록 관리**: 과거 기록을 테이블 형태로 조회하고, 실수로 측정한 기록은 개별 삭제가 가능합니다.

### 3. 📚 알고리즘 시각화 (Algorithms - CFOP)
* **VisualCube API 연동**: 텍스트 공식을 입력하면 **3D 큐브 이미지**를 동적으로 생성하여 보여줍니다.
* **회전 기호 보정**: `x`, `y` 등 큐브 회전 기호가 포함된 공식도 정면(Yellow Top)을 바라보도록 보정 로직을 적용했습니다.
* **단계별 학습**: F2L, 2-Look OLL, Full PLL 등 단계별로 탭을 나누어 필수 공식을 제공합니다.

### 4. 🗣️ 커뮤니티 (Community)
* **게시판 CRUD**: 자유롭게 글을 작성하고 수정, 삭제할 수 있습니다.
* **권한 관리 (Permission)**: 로그인한 유저 본인의 글만 수정/삭제 버튼이 노출되도록 권한 체크 로직을 구현했습니다.

## 🔥 기술적 도전 (Troubleshooting)

### 1. 타이머 정확도 및 이벤트 처리
* **문제**: 키보드를 누르고 있을 때 `keydown` 이벤트가 반복 발생하여 타이머 상태가 꼬이는 문제와 `setInterval`의 미세한 시간 지연 발생.
* **해결**:
    * `e.repeat` 속성을 체크하여 중복 이벤트를 방지했습니다.
    * 화면 렌더링용 `setInterval`과 별개로, 실제 기록은 **시작 시간과 종료 시간의 차이(Delta Time)** 를 계산하여 정확도를 높였습니다.

### 2. 서버리스 데이터 영속성 (Persistence)
* **문제**: 새로고침 시 로그인 정보와 기록 데이터가 휘발되는 문제.
* **해결**: `App` 마운트 시점에 `localStorage`의 데이터를 `Zustand` Store로 동기화하는 초기화 로직(`initialize`)을 구현하여 데이터 영속성을 확보했습니다.

## ⚙️ 기술 스택 (Tech Stack)

| 분류 | 기술 |
| :--- | :--- |
| **Frontend** | React (Vite), JavaScript (ES6+) |
| **Styling** | Styled-components |
| **State Management** | Zustand |
| **Routing** | React Router DOM v6 |
| **Persistence** | LocalStorage (Serverless) |
| **External API** | VisualCube API (3D Visualization) |

## 📂 폴더 구조 (Folder Structure)

```bash
src/
├── components/      # 헤더, 레이아웃 등 공통 UI 컴포넌트
├── pages/           # 라우팅 페이지 컴포넌트
│   ├── board/       # 게시판 (목록, 상세, 글쓰기, 수정)
│   ├── cube/        # 큐브 기능 (타이머, 알고리즘)
│   ├── member/      # 회원 기능 (로그인, 회원가입, 마이페이지)
│   └── Home.jsx     # 대시보드 메인 페이지
├── stores/          # Zustand 전역 상태 관리 (Member, Board, Timer)
└── utils/           # 스크램블 생성기 등 유틸리티 함수
```

## 🚀 향후 계획 (Roadmap)

* [ ] **페이징 처리 (Pagination)**: 게시판 및 기록 목록의 페이징 기능 도입
* [ ] **통계 고도화**: Ao5(최근 5회 평균), Ao12 등 전문적인 큐브 통계 지표 추가
* [ ] **랭킹 시스템**: 유저 아이디 옆에 PB(최고 기록) 뱃지 표시
* [ ] **댓글 기능**: 커뮤니티 활성화를 위한 댓글 시스템 도입

## 💿 설치 및 실행 (Installation)

이 프로젝트는 `Node.js` 환경에서 실행됩니다.

1. **프로젝트 클론**
   ```bash
   git clone [https://github.com/](https://github.com/)[본인아이디]/react-cube-project.git
   cd react-cube-project
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

## 👤 Author
* **xxh3898** - [GitHub Profile](https://github.com/xxh3898)
* 궁금한 점이 있다면 이슈(Issue)를 등록해주세요.

---
© 2025 Cube Project. All rights reserved.