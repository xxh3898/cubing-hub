# 🎲 Cube Server (Backend)

## 1. 📝 프로젝트 개요
이 프로젝트는 **React 기반의 큐브 기록 및 커뮤니티 플랫폼(Cubing Hub)** 을 위한 백엔드 REST API 서버입니다.
Spring Boot와 JPA를 기반으로 구현되었으며, 프론트엔드(SPA)와의 원활한 데이터 통신을 위해 **RESTful 원칙**을 준수하여 설계되었습니다.

* **목표**: 회원 관리, 게시판 CRUD, 타이머 기록 저장 기능을 제공하는 REST API 서버 구현
* **특징**:
    * **Entity 직접 노출 금지**: 모든 API 통신은 철저히 분리된 **DTO(Request/Response)**를 통해 이루어집니다.
    * **JPA 연관관계 활용**: Member, Post, Record 간의 1:N 관계를 객체 지향적으로 매핑했습니다.
    * **H2 DB 연동**: 개발 편의성을 위해 로컬 파일 기반의 H2 데이터베이스를 사용합니다.

---

## 2. 🛠️ 기술 스택 (Tech Stack)
* **Framework**: Spring Boot 3.4.12, Spring Web
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
| 기능 | Method | URL | 설명 |
| :--- | :---: | :--- | :--- |
| **회원가입** | `POST` | `/api/members/signup` | 신규 회원을 등록합니다. |
| **로그인** | `POST` | `/api/members/login` | 아이디/비밀번호 검증 후 회원 정보를 반환합니다. |

**Request Example (JSON)**
```json
// POST /api/members/signup
{
  "id": "cube_master",
  "password": "password123!",
  "name": "김큐브",
  "age": 25
}
```

**Response Example (JSON)**
```json
// POST /api/members/login (성공 시)
{
  "id": "cube_master",
  "name": "김큐브",
  "age": 25
}
```

---

### 📝 2. 게시판 (Post)
| 기능 | Method | URL | 설명 |
| :--- | :---: | :--- | :--- |
| **게시글 작성** | `POST` | `/api/posts?memberId={id}` | 게시글을 작성합니다. (Query Param으로 작성자 식별) |
| **전체 조회** | `GET` | `/api/posts` | 모든 게시글 목록을 최신순으로 조회합니다. |
| **상세 조회** | `GET` | `/api/posts/{id}` | 특정 ID의 게시글 상세 정보를 조회합니다. |
| **게시글 수정** | `PUT` | `/api/posts/{id}` | 게시글의 제목과 내용을 수정합니다. |
| **게시글 삭제** | `DELETE` | `/api/posts/{id}` | 특정 게시글을 삭제합니다. |

**Request Example (JSON)**
```json
// POST /api/posts?memberId=cube_master
{
  "title": "큐브 추천해주세요!",
  "content": "3x3 큐브 입문하려고 하는데 가성비 좋은 거 있을까요?"
}
```

**Response Example (JSON)**
```json
// GET /api/posts/{id}
{
  "id": 1,
  "title": "큐브 추천해주세요!",
  "content": "3x3 큐브 입문하려고 하는데 가성비 좋은 거 있을까요?",
  "author": "김큐브",
  "authorId": "cube_master",
  "createTime": "2025-12-19T10:00:00"
}
```

---

### ⏱️ 3. 기록 (Record)
| 기능 | Method | URL | 설명 |
| :--- | :---: | :--- | :--- |
| **기록 저장** | `POST` | `/api/records?memberId={id}` | 타이머 측정 결과를 저장합니다. |
| **내 기록 조회** | `GET` | `/api/records?memberId={id}` | 특정 회원의 모든 기록을 조회합니다. |
| **기록 삭제** | `DELETE` | `/api/records/{id}` | 특정 기록을 삭제합니다. |

**Request Example (JSON)**
```json
// POST /api/records?memberId=cube_master
{
  "time": 12.45,
  "scramble": "R U R' U' R' F R2 U' R' U' R U R' F'"
}
```

**Response Example (JSON)**
```json
// GET /api/records?memberId=cube_master
[
  {
    "id": 1,
    "time": 12.45,
    "scramble": "R U R' U' R' F R2 U' R' U' R U R' F'"
  },
  {
    "id": 2,
    "time": 15.20,
    "scramble": "D L2 B2 F L2 U' R' L2 B' R D2"
  }
]
```

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
