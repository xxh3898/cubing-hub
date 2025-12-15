# 큐브 커뮤니티 & 타이머 (Backend)

React 기반의 큐브 커뮤니티(SPA) 프로젝트를 위한 **RESTful API 서버**입니다.
Spring Boot를 사용하여 구현되었으며, 회원 관리, 게시판(CRUD), 큐브 기록 저장 기능을 제공합니다.
세션이나 토큰 기반의 인증 대신, 클라이언트로부터 전달받은 ID를 통해 간단한 식별 및 데이터 처리를 수행합니다.

## 1. 프로젝트 개요
* **프로젝트명**: Cube Server (큐브 API 서버)
* **목표**: 프론트엔드(React)의 요청을 처리하고 데이터를 반환하는 REST API 구현
* **핵심 원칙**:
    * 자원(Resource) 중심의 URI 설계 (`/api/members`, `/api/posts`)
    * HTTP 메서드(GET, POST, PUT, DELETE)를 통한 행위 표현
    * JSON 기반의 요청/응답 데이터 처리 (DTO 사용)

## 2. 사용 기술 스택 (Tech Stack)

| 구분 | 기술 | 설명 |
| :-- | :-- | :-- |
| **Language** | **Java 17** | 백엔드 주요 언어 |
| **Framework** | **Spring Boot 3.x** | REST API 서버 구축 |
| **Database** | **H2 Database** | 개발 및 테스트용 인메모리 DB |
| **ORM** | **Spring Data JPA** | 객체 중심의 데이터 접근 및 관리 |
| **Build Tool** | **Gradle** | 의존성 관리 및 빌드 |

## 3. 주요 도메인 설명

1.  **회원 (Member)**
    * 사용자의 기본 정보(아이디, 비밀번호, 이름, 나이)를 관리합니다.
    * 회원가입과 로그인 기능을 제공합니다.
2.  **게시판 (Post)**
    * 사용자 간의 소통을 위한 게시글 도메인입니다.
    * 제목, 내용, 작성자, 작성일시를 포함하며 CRUD(생성, 조회, 수정, 삭제)가 가능합니다.
3.  **기록 (Record)**
    * 큐브 타이머를 통해 측정된 기록을 관리합니다.
    * 측정 시간(초)과 당시의 스크램블(섞는 공식), 날짜 정보를 저장합니다.

## 4. API 명세 (API Specification)

모든 요청과 응답은 **JSON** 형식을 사용합니다.

### 4-1. 회원 (Member) - `/api/members`

#### 1) 회원가입
* **Method**: `POST`
* **URL**: `/api/members/signup`
* **Status Code**: `200 OK` (성공), `400 Bad Request` (중복 ID 등 실패)
* **Request Body**:
    ```json
    {
      "id": "cube_master",
      "password": "password123",
      "name": "김큐브",
      "age": 25
    }
    ```
* **Response**:
    ```text
    "회원가입 성공! ID: cube_master"
    ```

#### 2) 로그인
* **Method**: `POST`
* **URL**: `/api/members/login`
* **Status Code**: `200 OK` (성공), `400 Bad Request` (실패)
* **Request Body**:
    ```json
    {
      "id": "cube_master",
      "password": "password123"
    }
    ```
* **Response (JSON)**:
    ```json
    {
      "id": "cube_master",
      "name": "김큐브",
      "age": 25,
      "password": null // 보안상 null 처리 권장
    }
    ```

---

### 4-2. 게시판 (Post) - `/api/posts`

#### 1) 게시글 작성
* **Method**: `POST`
* **URL**: `/api/posts?memberId={memberId}`
* **Query Param**: `memberId` (작성자 ID)
* **Request Body**:
    ```json
    {
      "title": "큐브 20초 진입 팁 공유합니다",
      "content": "F2L 연습을 많이 하세요!"
    }
    ```
* **Response**:
    ```text
    "게시글 작성 완료! ID: 1"
    ```

#### 2) 전체 게시글 목록 조회
* **Method**: `GET`
* **URL**: `/api/posts`
* **Response (JSON List)**:
    ```json
    [
      {
        "id": 1,
        "title": "큐브 20초 진입 팁 공유합니다",
        "content": "F2L 연습을 많이 하세요!",
        "author": "김큐브",
        "authorId": "cube_master",
        "date": "2025-12-14T10:00:00"
      },
      ...
    ]
    ```

#### 3) 내 게시글 조회
* **Method**: `GET`
* **URL**: `/api/posts/my?memberId={memberId}`
* **Query Param**: `memberId` (조회할 회원의 ID)
* **Response**: 위와 동일한 JSON List 형식 (해당 회원이 쓴 글만 반환)

#### 4) 게시글 상세 조회
* **Method**: `GET`
* **URL**: `/api/posts/{id}`
* **Path Variable**: `id` (게시글 번호)
* **Response (JSON)**:
    ```json
    {
      "id": 1,
      "title": "큐브 20초 진입 팁 공유합니다",
      "content": "F2L 연습을 많이 하세요!",
      "author": "김큐브",
      "authorId": "cube_master",
      "date": "2025-12-14T10:00:00"
    }
    ```

#### 5) 게시글 수정
* **Method**: `PUT`
* **URL**: `/api/posts/{id}`
* **Path Variable**: `id` (게시글 번호)
* **Request Body**:
    ```json
    {
      "title": "제목 수정함",
      "content": "내용도 수정함"
    }
    ```
* **Response**: `1` (수정된 게시글 ID)

#### 6) 게시글 삭제
* **Method**: `DELETE`
* **URL**: `/api/posts/{id}`
* **Path Variable**: `id` (게시글 번호)
* **Response**: `"삭제 완료"`

---

### 4-3. 기록 (Record) - `/api/records`

#### 1) 큐브 기록 저장
* **Method**: `POST`
* **URL**: `/api/records?memberId={memberId}`
* **Query Param**: `memberId` (기록할 회원의 ID)
* **Request Body**:
    ```json
    {
      "time": 15.42,
      "scramble": "R U R' U' ..."
    }
    ```
* **Response**:
    ```text
    "기록 저장 완료! ID: 5"
    ```

#### 2) 내 기록 조회
* **Method**: `GET`
* **URL**: `/api/records?memberId={memberId}`
* **Query Param**: `memberId` (조회할 회원의 ID)
* **Response (JSON List)**:
    ```json
    [
      {
        "id": 5,
        "time": 15.42,
        "scramble": "R U R' U' ...",
        "date": "2025-12-14T12:34:56",
        "memberId": "cube_master"
      }
    ]
    ```

## 5. 실행 방법 (How to Run)

이 프로젝트는 Gradle을 기반으로 합니다.

1.  **프로젝트 루트 디렉토리로 이동**
    ```bash
    cd backend
    ```

2.  **애플리케이션 실행** (Mac/Linux)
    ```bash
    ./gradlew bootRun
    ```
    *(Windows의 경우)*
    ```cmd
    gradlew.bat bootRun
    ```

3.  **서버 확인**
    * 서버가 정상적으로 실행되면 `http://localhost:8080` 포트에서 요청을 대기합니다.
    * H2 Console 접속: `http://localhost:8080/h2-console`
