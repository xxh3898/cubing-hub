# Screen Specification

## 1. 페이지 정보

- 문서 범위: `frontend/src/App.jsx` 기준 사용자 화면 전체
- 대상 플랫폼: PC / 모바일 웹
- 화면 수: 18개
- 보조 라우트: 인증 리다이렉트 1개 (`/auth`)
- 기준 원칙:
  - 실제 API 연동 여부를 화면별로 명시한다.
  - mock 기반 화면과 실연동 화면을 구분한다.
  - 공통 상태 정책은 상단에 정의하고, 화면별로 필요한 차이만 추가한다.

## 2. 주요 화면 목록

| 화면 | 경로 | 핵심 기능 | 상태 |
| --- | --- | --- | --- |
| 홈 | `/` | 오늘의 스크램블, 프로필/통계 요약, 최근 기록 | `GET /api/home` 연동 완료 |
| 타이머 | `/timer` | 종목 선택, 스크램블 조회, 스크램블 이미지 미리보기, 키보드/터치 상태 머신, 기록 저장, Ao5/Ao12 | `GET /api/scramble`, `POST`, `PATCH`, `DELETE /api/records` 연동 완료 |
| 랭킹 | `/rankings` | 종목 필터, 닉네임 검색, 25개 단위 페이지네이션 | `GET /api/rankings` 연동 완료 |
| 학습 | `/learning` | F2L/OLL/PLL 119 케이스 조회, 회전기호 가이드 | 정적 학습 데이터 렌더링 구현 |
| 커뮤니티 목록 | `/community` | 카테고리 필터, 검색, 8개 단위 페이지네이션 | `GET /api/posts` 연동 완료 |
| 커뮤니티 작성 | `/community/write` | 카테고리 선택, 제목/본문 작성, 다중 이미지 첨부 | 보호 라우트 + `POST /api/posts` 연동 완료 |
| 커뮤니티 수정 | `/community/:id/edit` | 기존 게시글 사전 조회, 제목/본문 수정, 기존/신규 이미지 관리 | 보호 라우트 + `GET`, `PUT /api/posts/{postId}` 연동 완료 |
| 커뮤니티 상세 | `/community/:id` | 게시글 상세, 첨부 이미지, 댓글 목록, 댓글 작성/삭제, 수정 이동 | 게시글 상세/댓글/수정/삭제 연동 완료 |
| 공개 Q&A 목록 | `/qna` | 공개 질문/답변 목록, 8개 단위 페이지네이션 | `GET /api/qna` 연동 완료 |
| 공개 Q&A 상세 | `/qna/:id` | 공개 질문/답변 상세 | `GET /api/qna/{feedbackId}` 연동 완료 |
| 로그인 | `/login` | 이메일/비밀번호 입력 | `POST /api/auth/login`, 로그인 후 복귀, 비로그인 전용 라우트 연동 완료 |
| 비밀번호 재설정 | `/reset-password` | 이메일 인증번호 확인 후 새 비밀번호 설정 | 비밀번호 재설정 request/confirm 연동 완료 |
| 회원가입 | `/signup` | 이메일 인증번호 요청/확인 후 비밀번호/닉네임/주 종목 입력 | 이메일 인증 request/confirm + `POST /api/auth/signup`, 로그인 이동, 비로그인 전용 라우트 연동 완료 |
| 마이페이지 | `/mypage` | 프로필, 계정 정보 수정, 기록 요약, 주 종목 그래프, 전체 기록 | 보호 라우트, 로그아웃, 프로필/기록/계정 관리 API 연동 완료 |
| 피드백 | `/feedback` | 버그/기능 제안 전달 폼 | 보호 라우트 + `POST /api/feedbacks` 연동 완료 |
| 관리자 메인 | `/admin` | 피드백 목록 필터, 내부 메모 목록/생성 | 관리자 라우트 + `/api/admin/**` 연동 완료 |
| 관리자 피드백 상세 | `/admin/feedbacks/:id` | 질문 상세, 답변 저장, 공개 여부 변경 | 관리자 라우트 + `GET`, `PATCH /api/admin/feedbacks/**` 연동 완료 |
| 관리자 메모 상세 | `/admin/memos/:id` | 내부 질문/답변 수정, 삭제 | 관리자 라우트 + `GET`, `PATCH`, `DELETE /api/admin/memos/{memoId}` 연동 완료 |
| 인증 리다이렉트 | `/auth` | `/login`으로 이동 | 라우팅 리다이렉트 구현 |

## 3. 사용자 시나리오

### 시나리오 1. 비로그인 사용자의 탐색

1. 사용자는 홈에서 서울 날짜 기준으로 고정된 오늘의 스크램블과 서비스 구조를 확인한다.
2. 타이머 화면으로 이동해 실제 타이머 UX를 체험한다.
3. 로그인 전에는 타이머 기록을 게스트 로컬 저장소에 보관하고, 새로고침 후에도 최근 기록과 `Ao5`, `Ao12`를 이어서 확인한다.

### 시나리오 2. 로그인 사용자의 기록 저장

1. 사용자는 로그인 후 타이머 화면에 진입한다.
2. 종목별 스크램블을 불러오고, 스페이스바 또는 타이머 영역 홀드 후 측정을 시작한다.
3. 기록 정지 후 `POST /api/records`가 호출되고, 저장 성공 시 타이머와 스크램블이 자동으로 다음 solve 기준으로 초기화된다.

### 시나리오 3. 랭킹 및 커뮤니티 탐색

1. 사용자는 랭킹 화면에서 종목과 닉네임으로 결과를 좁히고 `1~10` 단위 그룹 페이지네이션으로 이동한다.
2. 커뮤니티 목록에서 검색/필터 후 grouped 페이지네이션으로 상세 화면까지 이동한다.
3. 랭킹 화면은 기본 조회 Redis, `nickname` 검색 MySQL 대체 경로 구조의 실제 API를 사용하고, 커뮤니티는 목록/작성/상세/삭제가 실제 API 기준으로 동작한다.

### 시나리오 4. 회원가입 후 개인화

1. 사용자는 회원가입에서 이메일을 입력하고 인증번호를 요청한다.
2. 인증번호 확인이 끝나면 닉네임, 주 종목, 비밀번호를 입력해 가입을 완료한다.
3. 가입 완료 후 로그인 화면으로 이동하고, 로그인 성공 시 원래 보호 경로 또는 홈으로 복귀한다.
4. 로그인 후 마이페이지에서 프로필, 기록 요약, 전체 기록 페이지를 조회하고 penalty 수정/삭제를 수행한다.
5. 비밀번호를 잊은 경우 로그인 화면에서 비밀번호 재설정으로 이동해 이메일 인증번호 확인 뒤 새 비밀번호를 설정한다.
6. 로그인 사용자는 마이페이지에서 닉네임/주 종목을 수정하거나 현재 비밀번호를 확인한 뒤 새 비밀번호로 변경한다.

## 4. 공통 상태 및 예외 정책

| 상태 | 의미 | 적용 화면 | 처리 원칙 |
| --- | --- | --- | --- |
| `loading` | API 호출 또는 초기 데이터 준비 중 | 타이머(스크램블), 홈/랭킹/커뮤니티/마이페이지 실연동 단계 | 사용자 입력을 막아야 하는 구간만 제한하고, 진행 중 메시지를 노출한다. |
| `empty` | 데이터는 정상 조회됐지만 표시할 항목이 없음 | 타이머 최근 기록, 랭킹 0건, 커뮤니티/마이페이지 실연동 단계 | 오류처럼 보이지 않도록 안내 메시지로 처리한다. |
| `error` | API 실패 또는 유효하지 않은 요청 | 타이머 스크램블/기록 저장, 전 화면 API 연동 단계 | 재시도 가능 여부를 함께 보여준다. |
| `auth failure` | 인증 필요 또는 만료 | 보호 화면, 보호 API 재호출 | 로그인 유도 또는 재로그인 흐름으로 연결한다. |

## 5. 화면별 상세

### 홈

- 레이아웃 구조
  - 오늘의 스크램블 카드
  - 로그인 사용자용 요약 카드 4종 또는 guest 랜딩 카드 4종
  - 로그인 사용자 최근 기록 테이블 또는 guest 최신 커뮤니티 글 3건
- 주요 UI 요소
  - `타이머로 이동`
  - `전체 기록 보기`
  - `로그인`
  - `회원가입`
  - `전체 게시글 보기`
- 화면 데이터 요구사항
  - `GET /api/home`
  - 공통: 오늘의 스크램블, 최신 커뮤니티 글 3건
  - 로그인 사용자: 닉네임, 주 종목, 총 솔브 수, PB, 평균, 최근 기록 5건
  - guest 사용자: 서비스 소개용 랜딩 카드와 로그인/회원가입 CTA
- 상태 및 예외
  - `loading`, `error`, 재시도 상태가 필요하다.
  - 로그인 사용자 최근 기록이 비어 있으면 empty 안내가 필요하다.
  - guest 최신 게시글이 비어 있으면 empty 안내가 필요하다.
- 사용자 액션
  - 타이머로 이동
  - 마이페이지로 이동
  - 로그인 / 회원가입 이동
  - 커뮤니티 이동
- 구현 상태
  - `GET /api/home` 실연동이 구현되어 있다.
  - `todayScramble`은 `Asia/Seoul` 날짜 기준으로 고정되어 같은 날에는 동일한 값을 반환한다.
  - guest 홈은 `오늘의 스크램블 + 소개/CTA + 최신 게시글 3건`으로 구성된다.
  - 로그인 홈은 `오늘의 스크램블 + 요약 카드 4종 + 최근 기록 5건`으로 구성된다.
  - 모바일 폭에서는 최근 기록과 최신 게시글 목록이 카드형 행으로 재배치된다.

### 타이머

- 레이아웃 구조
  - 스크램블 영역
  - 종목 선택 툴바
  - 중앙 타이머 디스플레이
  - 최근 저장 기록 패널
- 주요 UI 요소
  - 종목 `select`
- 화면 데이터 요구사항
  - `GET /api/scramble`
  - `GET /api/users/me/records`
  - `POST /api/records`
  - `PATCH /api/records/{recordId}`
  - `DELETE /api/records/{recordId}`
  - 세션 최근 저장 기록
  - 선택 종목 기준 최근 12개 기록 통계
  - 인증 상태(`accessToken`, `isAuthenticated`)
- 상태 및 예외
  - `loading`: 스크램블 불러오는 중
  - `error`: 스크램블 조회 실패 / 기록 저장 실패
  - 미지원 종목 선택 시 타이머 시작 차단
- 사용자 액션
  - 종목 선택
  - 홀드 후 타이머 시작 / 정지
  - 최근 기록 penalty 수정
  - 최근 기록 삭제
- 구현 상태
  - `GET /api/scramble`, `POST /api/records`, `PATCH /api/records/{recordId}`, `DELETE /api/records/{recordId}` 연동이 구현되어 있다.
  - 지원 범위: `WCA_333`
  - 현재 스크램블 텍스트와 함께 VisualCube 기반 이미지 미리보기를 노출한다.
  - 로그인 사용자는 서버 기록, 비로그인 사용자는 게스트 로컬 기록 기준으로 선택 종목 최근 12개 `Ao5`, `Ao12`를 확인할 수 있다.
  - 이미지 로드 실패 시에는 텍스트 스크램블만 유지한다.
  - 지원하지 않는 종목은 안내 메시지와 함께 차단된다.
  - 타이머 시작/정지는 키보드 `Space`와 모바일 `touch`/`pen` pointer 입력이 같은 상태 머신을 공유한다.
  - 기록 정지 후에는 측정 완료 시점에 고정한 solve 정보를 기준으로 한 번만 저장 또는 게스트 캐시를 수행하고, 성공 시 다음 스크램블과 타이머를 자동 초기화한다.
  - 저장 실패 시에는 멈춘 기록을 유지하고 같은 화면에서 재시도 버튼을 제공한다.
  - 모바일 폭에서는 종목/액션 툴바가 세로 배치로 재배치된다.

### 랭킹

- 레이아웃 구조
  - 헤더 영역
  - 검색/종목 필터 툴바
  - 랭킹 테이블
  - 페이지네이션
- 주요 UI 요소
  - 닉네임 검색 input (`maxLength=50`)
  - 종목 select
  - 페이지 이동 버튼
- 화면 데이터 요구사항
  - `GET /api/rankings`
  - 종목 필터
  - 닉네임 검색
  - 현재 페이지 / 총 페이지 수
- 상태 및 예외
  - `empty`: 검색 결과 0건
  - `loading`: 랭킹 조회 중
  - `error`: 랭킹 조회 실패
- 사용자 액션
  - 종목 전환
  - 닉네임 검색
  - 페이지 이동
  - 오류 시 재시도
- 구현 상태
  - `/api/rankings` 실연동이 구현되어 있다.
  - `nickname` 미입력 기본 조회는 Redis ZSET 읽기 모델을 사용한다.
  - `nickname` 검색 또는 Redis 미준비 상태는 MySQL 대체 경로를 사용한다.
  - `nickname` 검색 결과도 필터된 집합 재순위가 아니라 전체 랭킹 기준 순위를 유지한다.
  - 페이지네이션은 `1~10` 단위 그룹과 `이전`, `다음`, `<<`, `>>` 이동으로 동작한다.
  - 서버 검색, 서버 페이지네이션, `loading`, `empty`, `error`, 재시도 상태가 반영되어 있다.
  - 모바일 폭에서는 검색/종목 툴바가 세로 배치로, 랭킹 데이터는 카드형 행으로 재배치된다.

### 학습

- 레이아웃 구조
  - `회전기호 가이드`, `F2L`, `OLL`, `PLL` 탭
  - 케이스 카드 그리드
- 주요 UI 요소
  - 케이스 이미지
  - 회전기호 VisualCube 이미지
  - 알고리즘 텍스트
  - 표기법 예시 코드 블록
- 화면 데이터 요구사항
  - 정적 학습 데이터 119건
  - 정적 회전기호 가이드 18종 (`U/D/L/R/F/B`의 기본, prime, double turn)
- 상태 및 예외
  - 정적 데이터 기반이라 별도 로딩/에러 처리가 없다.
  - 외부 데이터 전환 시 탭별 로딩과 실패 상태가 필요하다.
- 사용자 액션
  - 탭 전환
  - 케이스 탐색
- 구현 상태
  - 정적 데이터 기반 렌더링이 구현되어 있다.
  - `F2L 41`, `OLL 57`, `PLL 21` 구성이 반영되어 있다.
  - 첫 탭에서 WCA 3x3x3 스크램블 기준 `U/D/L/R/F/B` 회전기호를 VisualCube 카드로 제공한다.

### 커뮤니티 목록

- 레이아웃 구조
  - 헤더
  - 카테고리 필터
  - 검색 폼
  - 게시글 목록
  - 페이지네이션
- 주요 UI 요소
  - 카테고리 탭
  - 제목/본문 검색 input (`maxLength=100`)
  - 작성자 검색 input (`maxLength=50`)
  - 상세 이동 링크
- 화면 데이터 요구사항
  - 게시글 목록
  - 제목/닉네임 검색 조건
  - 카테고리
  - 페이지 정보
- 상태 및 예외
  - `empty`: 검색 결과 0건
  - 최종 연동 시 `loading`, `error` 상태가 필요하다.
- 사용자 액션
  - 검색
  - 카테고리 변경
  - 상세 이동
  - 작성 화면 이동
- 구현 상태
  - `GET /api/posts` 실연동이 구현되어 있다.
  - 카테고리, 제목/본문, 작성자 검색과 8개 단위 페이지네이션이 서버 기준으로 동작한다.
  - 페이지네이션은 `1~10` 단위 그룹과 `이전`, `다음`, `<<`, `>>` 이동으로 동작한다.
  - `loading`, `empty`, `error`, `다시 시도` 상태가 반영되어 있다.
  - 모바일 폭에서는 카테고리/검색/작성 액션이 세로 배치 또는 grid로 재배치되고 게시글 목록은 카드형 행으로 노출된다.

### 커뮤니티 작성 / 수정

- 레이아웃 구조
  - 카테고리 선택
  - 제목 / 본문 입력
  - 첨부 이미지 선택 / 미리보기
  - 제출 / 취소
- 주요 UI 요소
  - 카테고리 select
  - 제목 input (`maxLength=100`)
  - 본문 textarea (`maxLength=2000`)
  - 이미지 file input (`jpg/jpeg/png/webp`, 최대 5장)
- 화면 데이터 요구사항
  - 로그인 사용자 정보
  - 로그인 사용자 권한
  - 작성 권한
  - 게시글 생성 API
  - 수정 모드일 때 게시글 상세 사전 조회
  - 게시글 수정 API
- 상태 및 예외
  - 인증 필요
  - 공지사항 작성은 권한 제한이 필요하다.
  - 최종 연동 시 검증 오류 표시가 필요하다.
- 사용자 액션
  - 카테고리 변경
  - 제목/본문 입력
  - 제출
  - 수정 취소 후 상세 또는 목록 복귀
- 구현 상태
  - 보호 라우트가 적용되어 비로그인 사용자는 로그인 후 복귀 흐름을 탄다.
  - `POST /api/posts`는 multipart 첨부 이미지 업로드를 지원한다.
  - `/community/:id/edit`에서 `GET /api/posts/{postId}/edit`로 기존 글을 사전 조회하고 `PUT /api/posts/{postId}`로 수정한다.
  - 수정 화면은 기존 첨부 이미지 유지/제외와 신규 이미지 추가를 함께 처리한다.
  - 관리자 로그인 시에만 `NOTICE` 카테고리를 노출한다.
  - 생성 성공 시 생성된 게시글 상세 화면으로 이동한다.
  - 수정 버튼은 작성자 본인 또는 관리자만 진입할 수 있다.
  - 검증 오류와 서버 오류 메시지를 화면에 표시한다.

### 커뮤니티 상세

- 레이아웃 구조
  - 게시글 메타 정보
  - 첨부 이미지 갤러리
  - 본문
  - 댓글 섹션
  - 삭제/뒤로가기 영역
- 주요 UI 요소
  - 댓글 입력
  - 게시글 수정 링크
  - 댓글 삭제
  - 게시글 삭제
- 화면 데이터 요구사항
  - 게시글 상세
  - 작성자 정보
  - 댓글 목록
  - 로그인 사용자 권한
- 상태 및 예외
  - `404` 성격의 게시글 없음 처리 필요
  - 댓글 입력 validation 필요
  - 작성자/관리자 권한 분기 필요
- 사용자 액션
  - 댓글 작성/삭제
  - 게시글 수정 화면 이동
  - 게시글 삭제
  - 목록으로 복귀
- 구현 상태
  - `GET /api/posts/{postId}` 연동이 구현되어 있다.
  - 첨부 이미지가 있으면 본문 상단에 다중 이미지 갤러리로 노출한다.
  - 게시글 조회수는 로그인 사용자 기준 계정당 1회만 증가하고, 비로그인 사용자는 조회수에 반영되지 않는다.
  - 수정 버튼은 작성자 본인 또는 관리자에게만 노출하고 `/community/:id/edit`로 이동한다.
  - 삭제 버튼은 작성자 본인 또는 관리자에게만 노출하고 `DELETE /api/posts/{postId}`를 호출한다.
  - 존재하지 않는 게시글은 에러 메시지와 목록 복귀 버튼으로 처리한다.
  - 댓글 목록은 `GET /api/posts/{postId}/comments` 기준 5개 단위 서버 페이지네이션으로 동작한다.
  - 댓글 페이지네이션은 `1~10` 단위 그룹과 `이전`, `다음`, `<<`, `>>` 이동으로 동작한다.
  - 로그인 사용자는 `POST /api/posts/{postId}/comments`로 댓글을 작성할 수 있고, 작성자 본인 또는 관리자는 `DELETE /api/posts/{postId}/comments/{commentId}`를 사용할 수 있다.
  - 비로그인 상태에서는 댓글 입력 대신 로그인 CTA를 노출한다.

### 로그인

- 레이아웃 구조
  - 입력 폼
  - 안내 문구
  - 비밀번호 재설정 이동 링크
  - 회원가입 이동 링크
- 주요 UI 요소
  - 이메일 input (`maxLength=255`)
  - 비밀번호 input (`minLength=8`, `maxLength=64`)
  - 로그인 버튼
- 화면 데이터 요구사항
  - `POST /api/auth/login`
  - 인증 상태 업데이트
  - 로그인 성공 후 이동 경로
- 상태 및 예외
  - 검증 오류
  - `401` 인증 실패
  - 재로그인 필요 상태
- 사용자 액션
  - 로그인 요청
  - 비밀번호 재설정 이동
  - 회원가입 이동
- 구현 상태
  - `POST /api/auth/login` 연동이 구현되어 있다.
  - 로그인 성공 시 access token을 메모리에 저장하고 `/api/me` 사용자 컨텍스트 동기화 뒤 원래 보호 경로 또는 홈으로 복귀한다.
  - 앱 초기 진입/새로고침 시에는 `refresh -> /api/me` 부트스트랩으로 로그인 상태를 복구한다.
  - 비밀번호 재설정 또는 비밀번호 변경 성공 후 안내 메시지와 이메일 prefill 상태를 받아 로그인 화면에 표시한다.

### 비밀번호 재설정

- 레이아웃 구조
  - 이메일 + 인증번호 요청 행
  - 인증번호 / 새 비밀번호 / 새 비밀번호 확인 폼
  - 로그인 복귀 링크
- 주요 UI 요소
  - 이메일 input (`maxLength=255`)
  - 인증번호 요청 버튼
  - 인증번호 input (`maxLength=6`)
  - 새 비밀번호 input (`minLength=8`, `maxLength=64`)
  - 새 비밀번호 확인 input (`minLength=8`, `maxLength=64`)
  - 비밀번호 변경 버튼
- 화면 데이터 요구사항
  - `POST /api/auth/password-reset/request`
  - `POST /api/auth/password-reset/confirm`
- 상태 및 예외
  - 검증 오류
  - 인증번호 재요청 제한 상태
  - 인증번호 불일치 / 만료
  - 비밀번호 변경 후 로그인 화면 복귀 안내
- 사용자 액션
  - 이메일 입력
  - 인증번호 요청
  - 새 비밀번호 입력 / 확인
  - 비밀번호 변경
- 구현 상태
  - `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm` 연동이 구현되어 있다.
  - 인증번호 요청 성공 시 안내 메시지를 화면에 표시한다.
  - 성공 시 로그인 화면으로 이동하고 이메일을 미리 채운다.

### 회원가입

- 레이아웃 구조
  - 이메일 인증 요청 행
  - 인증번호 확인 행
  - 닉네임 / 주 종목 / 비밀번호 / 비밀번호 확인 폼
- 주요 UI 요소
  - 이메일 input (`maxLength=255`)
  - 인증번호 요청 버튼
  - 인증번호 input (`maxLength=6`)
  - 인증번호 확인 버튼
  - 입력 필드 4종
  - 가입 완료 버튼
- 화면 데이터 요구사항
  - `POST /api/auth/email-verification/request`
  - `POST /api/auth/email-verification/confirm`
  - `POST /api/auth/signup`
  - 인증번호 요청/확인, 중복, validation 에러 처리
- 상태 및 예외
  - 검증 오류
  - 인증번호 재요청 제한 상태
  - 인증번호 불일치 / 만료
  - 이메일/닉네임 중복 처리
  - 가입 후 로그인 화면 이동 및 안내 메시지 처리
- 사용자 액션
  - 이메일 입력
  - 인증번호 요청
  - 인증번호 확인
  - 비밀번호 확인
  - 회원가입 제출
- 구현 상태
  - `POST /api/auth/email-verification/request`, `POST /api/auth/email-verification/confirm`, `POST /api/auth/signup` 연동이 구현되어 있다.
  - 이메일 변경 시 인증 완료 상태를 즉시 초기화한다.
  - 이메일 인증이 끝나기 전까지 가입 완료 버튼은 비활성화된다.
  - 이메일/닉네임/비밀번호 입력에는 화면 길이 제한이 적용되어 있다.
  - 가입 성공 시 로그인 화면으로 이동하고 이메일을 미리 채운다.

### 마이페이지

- 레이아웃 구조
  - 프로필 카드
  - 계정 관리 모달
  - 요약 통계
  - 주 종목 기록 추세 그래프
  - 전체 기록 테이블
  - 로그아웃
- 주요 UI 요소
  - 계정 관리 버튼
  - 로그아웃 버튼
  - 닉네임 / 주 종목 수정 input
  - 현재 비밀번호 / 새 비밀번호 / 새 비밀번호 확인 input
  - 계정 관리 탭 (`프로필 수정`, `비밀번호 변경`)
  - 기록 추세 그래프
  - 기록 테이블
- 화면 데이터 요구사항
  - `GET /api/users/me/profile`
  - `GET /api/users/me/records`
  - `PATCH /api/users/me/profile`
  - `PATCH /api/users/me/password`
  - `PATCH /api/records/{recordId}`
  - `DELETE /api/records/{recordId}`
  - 프로필
  - 통계
  - 주 종목 기준 최근 기록 그래프
  - 전체 기록 목록
  - 로그아웃 처리
- 상태 및 예외
  - 보호 화면 처리 필요
  - `loading`, `empty`, `error`, `auth failure`가 모두 필요하다.
- 사용자 액션
  - 닉네임 / 주 종목 수정
  - 비밀번호 변경
  - 로그아웃
  - 기록 페이지 이동
  - 기록 penalty 수정
  - 기록 삭제
- 구현 상태
  - 보호 라우트와 `/api/auth/logout` 연동이 구현되어 있다.
  - 헤더 닉네임은 `/api/me` 기준으로 표시된다.
  - `/api/users/me/profile`로 프로필/요약을 조회한다.
  - `/api/users/me/records?page&size`로 전체 기록을 서버 페이지네이션으로 조회한다.
  - 프로필 수정과 비밀번호 변경은 `계정 관리` 모달 안의 탭에서만 노출된다.
  - `PATCH /api/users/me/profile`로 닉네임과 주 종목을 수정하고 `/api/me`를 다시 동기화한다.
  - `PATCH /api/users/me/password` 성공 시 현재 세션을 정리하고 로그인 화면으로 이동한다.
  - 같은 records API를 재사용해 주 종목 기준 최근 기록 추세 그래프를 렌더링한다.
  - 전체 기록 페이지네이션은 `1~10` 단위 그룹과 `이전`, `다음`, `<<`, `>>` 이동으로 동작한다.
  - 기록 penalty 수정과 삭제 후 프로필/기록을 다시 조회해 화면을 갱신한다.
  - 모바일 폭에서는 프로필/기록 헤더가 세로 배치로 바뀌고 전체 기록은 카드형 행으로 전환된다.

### 피드백

- 레이아웃 구조
  - 피드백 종류 선택
  - 회신 이메일 입력
  - 제목 / 본문 입력
  - 제출 / 이전 화면 이동
- 주요 UI 요소
  - 종류 select
  - 회신 이메일 input (`maxLength=255`)
  - 제목 input (`maxLength=100`)
  - 본문 textarea (`maxLength=2000`)
- 화면 데이터 요구사항
  - `POST /api/feedbacks`
  - 현재 로그인 사용자 컨텍스트
- 상태 및 예외
  - 검증 오류
  - 제출 성공/실패 메시지
  - auth failure 시 로그인 이동
- 사용자 액션
  - 피드백 종류 선택
  - 회신 이메일 확인 또는 수정
  - 제목/본문 입력
  - 제출
- 구현 상태
  - `POST /api/feedbacks` 실연동이 구현되어 있다.
  - 보호 라우트로 로그인 사용자만 접근할 수 있다.
  - 회신 이메일 input은 현재 로그인 사용자 이메일을 기본값으로 채우고 수정 가능하다.
  - 서버는 제출자를 현재 로그인 사용자와 연결하고 제출 시점의 `reply_email`을 함께 저장한다.
  - 제출 후에는 일반 사용자용 접수 완료 toast만 노출한다.
  - Discord 운영 알림 상태는 사용자 화면이 아니라 내부 운영 경로에서 추적한다.

### 공개 Q&A 목록 / 상세

- 레이아웃 구조
  - 목록: 질문 카드 목록, 페이지네이션
  - 상세: 질문 블록, 답변 블록, 목록/피드백 이동 CTA
- 화면 데이터 요구사항
  - `GET /api/qna`
  - `GET /api/qna/{feedbackId}`
- 상태 및 예외
  - `loading`, `empty`, `error` 상태가 필요하다.
  - 비공개 또는 미답변 피드백은 노출하지 않는다.
- 구현 상태
  - 공개된 질문/답변만 `/qna`와 `/qna/:id`에 노출한다.
  - 질문자 표시는 `사용자`, 답변자 표시는 `관리자`로 고정한다.

### 관리자 메인 / 상세

- 레이아웃 구조
  - 메인: 피드백 탭, 관리자 메모 탭, 피드백 필터, 메모 생성 폼
  - 상세: 질문 본문, 답변/공개 설정 폼 또는 메모 수정 폼
- 화면 데이터 요구사항
  - `GET /api/admin/feedbacks`
  - `GET /api/admin/feedbacks/{feedbackId}`
  - `PATCH /api/admin/feedbacks/{feedbackId}/answer`
  - `PATCH /api/admin/feedbacks/{feedbackId}/visibility`
  - `GET /api/admin/memos`
  - `POST /api/admin/memos`
  - `GET /api/admin/memos/{memoId}`
  - `PATCH /api/admin/memos/{memoId}`
  - `DELETE /api/admin/memos/{memoId}`
- 상태 및 예외
  - 관리자 권한이 없으면 접근할 수 없다.
  - 피드백 목록에는 검색 없이 `답변 여부`, `공개 여부` 필터만 사용한다.
- 구현 상태
  - `/admin`은 관리자 전용 라우트다.
  - 피드백 목록은 최신순, 관리자 메모 목록은 `updatedAt desc` 최신순으로 정렬된다.
  - 피드백 답변 저장과 공개 여부 전환은 상세 화면에서 처리한다.
  - 관리자 메모는 질문/답변 한 세트의 list/detail CRUD로 동작한다.

### 인증 리다이렉트

- 레이아웃 구조
  - 별도 화면 없이 라우팅 리다이렉트
- 주요 UI 요소
  - 없음
- 화면 데이터 요구사항
  - `/login` 경로 리다이렉트
- 상태 및 예외
  - 인증 완료 후 복귀 경로 설계는 후속 정리가 필요할 수 있다.
- 사용자 액션
  - 없음
- 구현 상태
  - `/auth`는 `/login`으로 이동하도록 구현되어 있다.

## 6. 화면에서 사용하는 API 요약

| 화면 | API | 사용 목적 | 상태 |
| --- | --- | --- | --- |
| 홈 | `GET /api/home` | 오늘의 스크램블, 통계, 최근 기록 조회 | 백엔드 구현 / 프런트 연동 |
| 타이머 | `GET /api/scramble` | 종목별 스크램블 조회 | 연동 완료 |
| 타이머 | `POST /api/records` | 기록 저장 | 연동 완료 |
| 타이머 | `PATCH /api/records/{recordId}` | 최근 기록 penalty 수정 | 연동 완료 |
| 타이머 | `DELETE /api/records/{recordId}` | 최근 기록 삭제 | 연동 완료 |
| 랭킹 | `GET /api/rankings` | 종목별 랭킹 조회 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 목록 | `GET /api/posts` | 게시글 목록 조회 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 상세 | `GET /api/posts/{postId}` | 게시글 상세 조회 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 수정 | `GET /api/posts/{postId}/edit` | 게시글 수정 화면 사전 조회 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 작성 | `POST /api/posts` | 게시글 생성 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 수정 | `PUT /api/posts/{postId}` | 게시글 수정 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 상세 | `DELETE /api/posts/{postId}` | 게시글 삭제 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 상세 | `GET /api/posts/{postId}/comments` | 댓글 목록 조회 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 상세 | `POST /api/posts/{postId}/comments` | 댓글 생성 | 백엔드 구현 / 프런트 연동 |
| 커뮤니티 상세 | `DELETE /api/posts/{postId}/comments/{commentId}` | 댓글 삭제 | 백엔드 구현 / 프런트 연동 |
| 로그인 | `POST /api/auth/login` | 로그인 | 백엔드 구현 / 프런트 연동 |
| 비밀번호 재설정 | `POST /api/auth/password-reset/request` | 인증번호 요청 | 백엔드 구현 / 프런트 연동 |
| 비밀번호 재설정 | `POST /api/auth/password-reset/confirm` | 비밀번호 재설정 | 백엔드 구현 / 프런트 연동 |
| 회원가입 | `POST /api/auth/email-verification/request` | 인증번호 요청 | 백엔드 구현 / 프런트 연동 |
| 회원가입 | `POST /api/auth/email-verification/confirm` | 인증번호 확인 | 백엔드 구현 / 프런트 연동 |
| 회원가입 | `POST /api/auth/signup` | 회원가입 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `GET /api/users/me/profile` | 프로필/요약 조회 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `GET /api/users/me/records` | 전체 기록 페이지 조회 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `PATCH /api/users/me/profile` | 프로필 수정 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `PATCH /api/users/me/password` | 비밀번호 변경 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `PATCH /api/records/{recordId}` | 기록 penalty 수정 | 백엔드 구현 / 프런트 연동 |
| 마이페이지 | `DELETE /api/records/{recordId}` | 기록 삭제 | 백엔드 구현 / 프런트 연동 |
| 피드백 | `POST /api/feedbacks` | 로그인 사용자 피드백 저장 | 백엔드 구현 / 프런트 연동 |
| 공개 Q&A 목록 | `GET /api/qna` | 공개 질문/답변 목록 조회 | 백엔드 구현 / 프런트 연동 |
| 공개 Q&A 상세 | `GET /api/qna/{feedbackId}` | 공개 질문/답변 상세 조회 | 백엔드 구현 / 프런트 연동 |
| 관리자 메인 | `GET /api/admin/feedbacks` | 관리자 피드백 목록 조회 | 백엔드 구현 / 프런트 연동 |
| 관리자 피드백 상세 | `GET /api/admin/feedbacks/{feedbackId}` | 관리자 피드백 상세 조회 | 백엔드 구현 / 프런트 연동 |
| 관리자 피드백 상세 | `PATCH /api/admin/feedbacks/{feedbackId}/answer` | 관리자 피드백 답변 저장 | 백엔드 구현 / 프런트 연동 |
| 관리자 피드백 상세 | `PATCH /api/admin/feedbacks/{feedbackId}/visibility` | 관리자 피드백 공개 상태 변경 | 백엔드 구현 / 프런트 연동 |
| 관리자 메인 | `GET /api/admin/memos` | 관리자 메모 목록 조회 | 백엔드 구현 / 프런트 연동 |
| 관리자 메인 | `POST /api/admin/memos` | 관리자 메모 생성 | 백엔드 구현 / 프런트 연동 |
| 관리자 메모 상세 | `GET /api/admin/memos/{memoId}` | 관리자 메모 상세 조회 | 백엔드 구현 / 프런트 연동 |
| 관리자 메모 상세 | `PATCH /api/admin/memos/{memoId}` | 관리자 메모 수정 | 백엔드 구현 / 프런트 연동 |
| 관리자 메모 상세 | `DELETE /api/admin/memos/{memoId}` | 관리자 메모 삭제 | 백엔드 구현 / 프런트 연동 |

## 7. 구현 참고

### Frontend

- 라우트 기준: `frontend/src/App.jsx`
- 인증 상태:
  - 구현 기준: `frontend/src/context/AuthContext.jsx`, `frontend/src/authStorage.js` 기반 메모리 access token과 앱 초기 `refresh -> /api/me` 부트스트랩
  - 검증 기준: `AuthContext`, `apiClient` refresh queue, 보호/비로그인 전용 라우트 회귀 테스트 추가
- 공통 API 클라이언트: `frontend/src/lib/apiClient.js`
- 타이머 핵심 로직: `frontend/src/hooks/useCubeTimer.js`

### Backend / 연동 참고

- 인증: `POST /api/auth/email-verification/request`, `POST /api/auth/email-verification/confirm`, `POST /api/auth/signup`, `POST /api/auth/login`
- 계정 관리: `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`, `PATCH /api/users/me/profile`, `PATCH /api/users/me/password`
- 기록: `GET /api/scramble`, `POST /api/records`
- 랭킹: `GET /api/rankings`
- 게시판: `POST /api/posts`, `GET /api/posts`, `GET /api/posts/{postId}`, `PUT /api/posts/{postId}`, `DELETE /api/posts/{postId}`
- 공개 Q&A: `GET /api/qna`, `GET /api/qna/{feedbackId}`
- 관리자 운영: `GET/PATCH /api/admin/feedbacks/**`, `GET/POST/PATCH/DELETE /api/admin/memos/**`

## 8. 연결 체크리스트

- 타이머 외 화면의 실제 API 연동 여부를 문서와 코드에서 동시에 갱신할 것
- 보호 화면(`mypage`, `community/write`, `community/:id/edit`, `admin/**`)의 인증 실패 UX를 명시할 것
- 홈, 랭킹, 커뮤니티, 마이페이지에 `loading`, `empty`, `error` 상태를 구현 시점에 점검할 것
- 피드백 메일 전달이나 처리 상태 관리가 추가되면 이 문서의 화면 데이터 요구사항과 상태를 함께 갱신할 것

## 9. 미확정 사항

- 로그인 성공 후 이동 경로와 토큰 만료 시 재로그인 UX
- 랭킹 `nickname` 검색을 Redis secondary index로 확장할지 여부
