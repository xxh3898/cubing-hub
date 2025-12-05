# 🧊 React Cube Project (SpeedCubing.io)

![Timer](./react-cube-project/src/assets/Timer.gif)

> **큐브 스피드솔빙을 위한 올인원 유틸리티 웹 애플리케이션**

타이머 측정부터 기록 관리, 필수 알고리즘(CFOP) 3D 시각화, 그리고 큐버들을 위한 커뮤니티 기능까지 React로 구현한 웹 서비스입니다. 백엔드 서버 없이 `LocalStorage`와 `Zustand`를 활용하여 데이터 영속성을 구현했습니다.


## 🛠️ 주요 기능 (Features)

### 1. ⏱️ 큐브 타이머 (Cube Timer)
* **스택매트 UX 구현**: 스페이스바를 꾹 눌러(Holding) 준비하고, 떼는 순간(Start) 타이머가 작동합니다.
* **스크램블 생성기**: 매회 공정한 기록 측정을 위해 랜덤 스크램블(섞기 공식)을 자동 생성합니다.
* **자동 기록 저장**: 측정된 기록은 날짜, 스크램블 정보와 함께 로컬 스토리지에 즉시 저장됩니다.

### 2. 📊 마이페이지 & 대시보드 (Dashboard)
* **통계 자동화**: 총 솔빙 횟수, **최고 기록(PB)**, **평균 기록(Average)**을 실시간으로 계산하여 시각화합니다.
* **기록 관리**: 과거 기록을 테이블 형태로 조회하고, 실수로 측정한 기록은 개별 삭제가 가능합니다.

### 3. 📚 알고리즘 시각화 (Algorithms - CFOP)
* **VisualCube API 연동**: 텍스트 공식을 입력하면 **3D 큐브 이미지**를 동적으로 생성하여 보여줍니다.
* **회전 기호 보정**: `x`, `y` 등 큐브 회전 기호가 포함된 공식도 정면(Yellow Top)을 바라보도록 보정 로직을 적용했습니다.
* **단계별 학습**: F2L, 2-Look OLL, Full PLL 등 단계별로 탭을 나누어 필수 공식을 제공합니다.

### 4. 🗣️ 커뮤니티 (Community)
* **게시판 CRUD**: 자유롭게 글을 작성하고 수정, 삭제할 수 있습니다.
* **클라이언트 보안**: 로그인한 유저 본인의 글만 수정/삭제 버튼이 노출되도록 권한 체크 로직을 구현했습니다.


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


## 💿 설치 및 실행 (Installation)

이 프로젝트는 `Node.js` 환경에서 실행됩니다.

1. **프로젝트 클론**
   ```bash
   git clone https://github.com/[본인아이디]/react-cube-project.git
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


## 📝 개발 일지 (Dev Log)
프로젝트 개발 과정과 트러블 슈팅 내역은 블로그에 상세히 기록되어 있습니다.
* **[React 큐브 프로젝트 개발 일지 보러가기](https://xxh3898.tistory.com/entry/react-cube-project-개발-일지-Day-1)**


## 👤 Author
* **xxh3898** - [GitHub Profile](https://github.com/xxh3898)
* 궁금한 점이 있다면 이슈(Issue)를 등록해주세요.

---
© 2025 Cube Project. All rights reserved.
