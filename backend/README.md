# 🎲 Cube Server (Backend)

## 1. 📝 프로젝트 개요
이 프로젝트는 **React 기반의 큐브 기록 및 커뮤니티 플랫폼(Cubing Hub)**을 위한 백엔드 REST API 서버입니다.
Spring Boot와 JPA를 기반으로 구현되었으며, 프론트엔드(SPA)와의 원활한 데이터 통신을 위해 **RESTful 원칙**을 준수하여 설계되었습니다.

* **목표**: 회원 관리, 게시판 CRUD, 타이머 기록 저장 기능을 제공하는 REST API 서버 구현
* **특징**:
    * **Entity 직접 노출 금지**: 모든 API 통신은 철저히 분리된 **DTO(Request/Response)** 를 통해 이루어집니다.
    * **JPA 연관관계 활용**: Member, Post, Record 간의 1:N 관계를 객체 지향적으로 매핑했습니다.
    * **H2 DB 연동**: 개발 편의성을 위해 로컬 파일 기반의 H2 데이터베이스를 사용합니다.

---

## 2. 🛠️ 기술 스택 (Tech Stack)
* **Framework**: Spring Boot 3.x, Spring Web
* **Database**: H2 Database (File Mode)
* **ORM**: Spring Data JPA
* **Tool**: Lombok
* **Build**: Gradle

---

## 3. 🏗️ 주요 도메인 설명
본 프로젝트는 3개의 핵심 Entity로 구성되어 있습니다.

1.  **Member (회원)**
    * 사용자 정보를 관리하는 핵심 엔티티입니다.
    * 아이디(id), 비밀번호(password), 이름(name), 나이(age) 정보를 가집니다.
    * `Post`와 `Record`에 대해 **1:N (일대다)** 관계를 가집니다.
2.  **Post (게시글)**
    * 커뮤니티 기능을 위한 엔티티입니다.
    * 제목, 내용, 작성자, 작성일, 수정일 정보를 가집니다.
    * `Member`와 **N:1 (다대일)** 관계를 맺어 작성자를 식별합니다.
3.  **Record (기록)**
    * 큐브 타이머 측정 기록을 저장하는 엔티티입니다.
    * 측정 시간(time), 스크램블(scramble, 섞는 공식), 날짜 정보를 가집니다.
    * `Member`와 **N:1 (다대일)** 관계를 맺어 누구의 기록인지 식별합니다.

---

## 4. 📡 API 명세 (API Specification)

### 👤 1. 회원 (Member)

#### 1-1. 회원가입
신규 회원을 등록합니다.

* **Method + URL**: `POST /api/members/signup`
* **Request Body (JSON)**:
  ```json
  {
    "id": "cube_master",
    "password": "password123!",
    "name": "김큐브",
    "age": 25
  }
  ```
* **Response Body (String)**: 생성된 회원의 ID
  ```text
  "cube_master"
  ```
* **Status Code**:
    * `200 OK`: 가입 성공
    * `500 Internal Server Error`: 이미 존재하는 ID일 경우

#### 1-2. 로그인
아이디와 비밀번호를 검증하고 회원 정보를 반환합니다.

* **Method + URL**: `POST /api/members/login`
* **Request Body (JSON)**:
  ```json
  {
    "id": "cube_master",
    "password": "password123!"
  }
  ```
* **Response Body (JSON)**:
  ```json
  {
    "id": "cube_master",
    "name": "김큐브",
    "age": 25
  }
  ```
* **Status Code**:
    * `200 OK`: 로그인 성공 (회원 정보 반환)
    * `400`: 로그인 실패 (Response Body가 비어있음/null)

---

### 📝 2. 게시판 (Post)

#### 2-1. 게시글 목록 조회
모든 게시글을 최신순으로 조회합니다.

* **Method + URL**: `GET /api/posts`
* **Request Body**: 없음
* **Response Body (JSON Array)**:
  ```json
  [
    {
      "id": 2,
      "title": "큐브 추천해주세요!",
      "content": "가성비 좋은 3x3 큐브 추천 좀...",
      "author": "김큐브",
      "authorId": "cube_master",
      "createTime": "2025-12-19T10:30:00"
    },
    {
      "id": 1,
      "title": "가입 인사",
      "content": "반갑습니다.",
      "author": "홍길동",
      "authorId": "hong123",
      "createTime": "2025-12-18T14:00:00"
    }
  ]
  ```
* **Status Code**: `200 OK`

#### 2-2. 게시글 상세 조회
특정 게시글의 상세 내용을 조회합니다.

* **Method + URL**: `GET /api/posts/{id}`
* **Request Body**: 없음
* **Response Body (JSON)**:
  ```json
  {
    "id": 2,
    "title": "큐브 추천해주세요!",
    "content": "가성비 좋은 3x3 큐브 추천 좀...",
    "author": "김큐브",
    "authorId": "cube_master",
    "createTime": "2025-12-19T10:30:00"
  }
  ```
* **Status Code**: `200 OK`

#### 2-3. 게시글 작성
새로운 게시글을 작성합니다.

* **Method + URL**: `POST /api/posts?memberId={memberId}`
* **Query Parameter**: `memberId` (작성자 ID)
* **Request Body (JSON)**:
  ```json
  {
    "title": "큐브 추천해주세요!",
    "content": "가성비 좋은 3x3 큐브 추천 좀 부탁드립니다."
  }
  ```
* **Response Body (Long)**: 생성된 게시글의 PK(ID)
  ```text
  2
  ```
* **Status Code**: `200 OK`

#### 2-4. 게시글 수정
기존 게시글의 제목과 내용을 수정합니다.

* **Method + URL**: `PUT /api/posts/{id}`
* **Path Variable**: `id` (게시글 ID)
* **Request Body (JSON)**:
  ```json
  {
    "title": "큐브 추천 (수정됨)",
    "content": "내용을 수정했습니다."
  }
  ```
* **Response Body (Long)**: 수정된 게시글의 PK(ID)
  ```text
  2
  ```
* **Status Code**: `200 OK`

#### 2-5. 게시글 삭제
특정 게시글을 삭제합니다.

* **Method + URL**: `DELETE /api/posts/{id}`
* **Path Variable**: `id` (게시글 ID)
* **Request Body**: 없음
* **Response Body**: 없음
* **Status Code**: `200 OK`

---

### ⏱️ 3. 기록 (Record)

#### 3-1. 내 기록 조회
특정 회원의 모든 큐브 측정 기록을 조회합니다.

* **Method + URL**: `GET /api/records?memberId={memberId}`
* **Query Parameter**: `memberId` (조회할 회원 ID)
* **Response Body (JSON Array)**:
  ```json
  [
    {
      "id": 10,
      "time": 12.45,
      "scramble": "R U R' U' R' F R2 U' R' U' R U R' F'",
      "createTime": "2025-12-19T11:00:00"
    },
    {
      "id": 9,
      "time": 15.20,
      "scramble": "D L2 B2 F L2 U' R' L2 B' R D2",
      "createTime": "2025-12-19T10:55:00"
    }
  ]
  ```
* **Status Code**: `200 OK`

#### 3-2. 기록 저장
큐브 측정 결과를 저장합니다.

* **Method + URL**: `POST /api/records?memberId={memberId}`
* **Query Parameter**: `memberId` (기록할 회원 ID)
* **Request Body (JSON)**:
  ```json
  {
    "time": 12.45,
    "scramble": "R U R' U' R' F R2 U' R' U' R U R' F'"
  }
  ```
* **Response Body (Long)**: 저장된 기록의 PK(ID)
  ```text
  10
  ```
* **Status Code**: `200 OK`

#### 3-3. 기록 삭제
특정 기록을 삭제합니다.

* **Method + URL**: `DELETE /api/records/{id}`
* **Path Variable**: `id` (삭제할 기록 ID)
* **Request Body**: 없음
* **Response Body**: 없음
* **Status Code**: `200 OK`

---

## 5. 🚀 실행 방법 (How to Run)

### 1️⃣ 백엔드 (Spring Boot) 실행
1.  `backend` 디렉토리로 이동합니다.
2.  아래 명령어로 빌드 및 실행합니다.
    ```bash
    # Windows
    ./gradlew.bat bootRun

    # Mac/Linux
    ./gradlew bootRun
    ```
3.  서버가 `http://localhost:8080` 포트에서 실행됩니다.

### 2️⃣ H2 데이터베이스 접속 (콘솔)
서버 실행 후 브라우저에서 아래 주소로 접속하여 DB 상태를 확인할 수 있습니다.

* **접속 URL**: `http://localhost:8080/h2-console`
* **Driver Class**: `org.h2.Driver`
* **JDBC URL**: `jdbc:h2:file:./database/cube`
* **User Name**: `sa`
* **Password**: `1234`

### 3️⃣ 프론트엔드 (React) 실행
1.  `frontend` 디렉토리로 이동합니다.
2.  의존성을 설치하고 개발 서버를 시작합니다.
    ```bash
    npm install
    npm run dev
    ```
3.  브라우저에서 `http://localhost:5173`으로 접속합니다.
    * *참고: 프론트엔드의 `package.json` 또는 `vite.config.js`에 Proxy 설정이 되어 있어 CORS 문제없이 백엔드와 통신 가능합니다.*

---

## 6. 📁 프로젝트 구조 (Package Structure)
```
com.cube.cube_server
├── controller    # API 요청을 처리하는 Controller (REST API)
├── service       # 비즈니스 로직을 처리하는 Service (@Transactional)
├── repository    # DB 접근을 담당하는 Repository (JPA)
├── domain        # DB 테이블과 매핑되는 Entity 클래스
└── dto           # 데이터 전송을 위한 DTO (Request/Response 분리)
```

