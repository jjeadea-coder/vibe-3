# 공공직군 행정업무 슈퍼앱 아키텍처 문서

## 1. 문서 목적

본 문서는 공공직군 행정업무 슈퍼앱의 기술적 요구사항, 프로젝트 구조, 모듈별 역할을 정의한다. 현재 프로젝트는 프론트엔드 의존성과 백엔드 가상환경만 준비된 초기 상태이며, 본 문서는 이후 구현의 기준으로 사용한다.

## 2. 기술 스택

### Frontend

- TypeScript
- Vite
- React
- ESLint

### Backend

- Python
- FastAPI
- Uvicorn
- uv

### Database

- SQLite

### File Processing

- 엑셀 처리: `openpyxl` 또는 `pandas` 도입 예정
- 파일 업로드: FastAPI `UploadFile`

### Scheduling

- 뉴스 수집 정기 실행: `APScheduler` 또는 운영체제 작업 스케줄러 도입 예정

### Chatbot

- 초기 단계: 업로드된 매뉴얼 기반 검색 구조 설계
- 고도화 단계: 임베딩 검색, RAG, LLM API 연동 검토

## 3. 현재 구성 상태

```text
day3_rpa/
  frontend/
    package.json
    package-lock.json
    node_modules/
  backend/
    .venv/
  .uv-cache/
  docs/
```

## 4. 권장 프로젝트 구조

```text
day3_rpa/
  frontend/
    src/
      app/
      pages/
      features/
        schedule/
        excel/
        complaint-chatbot/
        news/
      shared/
        api/
        components/
        types/
        utils/
    public/
    package.json
    vite.config.ts
    tsconfig.json
    eslint.config.js

  backend/
    app/
      main.py
      core/
        config.py
        database.py
        scheduler.py
      api/
        routes/
          schedules.py
          excel.py
          chatbot.py
          news.py
      models/
        schedule.py
        member.py
        news.py
        document.py
      schemas/
        schedule.py
        member.py
        news.py
        chatbot.py
      services/
        schedule_service.py
        excel_service.py
        chatbot_service.py
        news_service.py
      repositories/
        schedule_repository.py
        news_repository.py
      storage/
        uploads/
        exports/
      tests/
    .venv/
    pyproject.toml
    uv.lock

  data/
    app.sqlite3

  docs/
    PRD.md
    Architexture.md
    Operation.md
    index.html
```

## 5. 모듈별 역할

### 5.1 Frontend App

- 라우팅과 전체 레이아웃을 담당한다.
- 기능별 페이지를 연결한다.
- API 호출 결과를 사용자에게 표시한다.

### 5.2 Schedule Module

#### Frontend

- 캘린더 화면
- 일정 등록, 수정, 삭제 폼
- 팀원 및 일정 유형 필터

#### Backend

- 일정 CRUD API
- 일정 충돌 검사
- 팀원별 일정 조회

#### DB

- `members`
- `schedules`
- `schedule_types`

### 5.3 Excel Automation Module

#### Frontend

- 파일 업로드 UI
- 기준 시트, 기준 컬럼 선택 UI
- 처리 결과 다운로드 UI

#### Backend

- 엑셀 파일 검증
- 컬럼 기준 파일 분리
- 파일 병합
- 결과 파일 생성
- 처리 로그 반환

#### Storage

- 업로드 원본 파일
- 처리 결과 파일
- 임시 파일

### 5.4 Complaint Chatbot Module

#### Frontend

- 매뉴얼 업로드 UI
- 민원 내용 입력 UI
- 답변 초안 출력 UI
- 근거 문서 표시 UI

#### Backend

- 매뉴얼 파일 저장
- 문서 텍스트 추출
- 문서 검색
- 답변 초안 생성
- 근거 항목 반환

#### DB

- `manual_documents`
- `manual_chunks`
- `chatbot_queries`

### 5.5 News Collection Module

#### Frontend

- 일자별 뉴스 목록
- 키워드 필터
- 북마크 UI

#### Backend

- 뉴스 수집 작업
- 중복 기사 제거
- 기사 요약 저장
- 기사 조회 API

#### DB

- `news_articles`
- `news_keywords`
- `news_bookmarks`

## 6. API 설계 초안

### Schedule

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/{schedule_id}`
- `PUT /api/schedules/{schedule_id}`
- `DELETE /api/schedules/{schedule_id}`

### Excel

- `POST /api/excel/split`
- `POST /api/excel/merge`
- `GET /api/excel/jobs/{job_id}`
- `GET /api/excel/download/{file_id}`

### Chatbot

- `POST /api/chatbot/manuals`
- `POST /api/chatbot/query`
- `GET /api/chatbot/manuals`

### News

- `GET /api/news`
- `POST /api/news/collect`
- `POST /api/news/{article_id}/bookmark`

## 7. 데이터베이스 설계 초안

### members

- `id`
- `name`
- `department`
- `role`
- `created_at`
- `updated_at`

### schedules

- `id`
- `member_id`
- `title`
- `type`
- `start_at`
- `end_at`
- `location`
- `memo`
- `created_at`
- `updated_at`

### excel_jobs

- `id`
- `job_type`
- `status`
- `source_file_name`
- `result_file_path`
- `message`
- `created_at`
- `completed_at`

### manual_documents

- `id`
- `file_name`
- `file_path`
- `status`
- `created_at`

### manual_chunks

- `id`
- `document_id`
- `content`
- `page`
- `section_title`

### news_articles

- `id`
- `title`
- `source`
- `url`
- `published_at`
- `summary`
- `keyword`
- `created_at`

## 8. 기술적 요구사항

- API 응답 형식은 일관된 JSON 구조를 사용한다.
- 파일 업로드 크기 제한을 설정한다.
- 업로드 파일 확장자와 MIME 타입을 검증한다.
- SQLite DB 파일은 `data/app.sqlite3`에 둔다.
- 개발 환경에서는 CORS를 허용하되 운영 환경에서는 허용 도메인을 제한한다.
- 백엔드 의존성 관리는 `uv`와 `pyproject.toml` 기준으로 한다.
- 프론트엔드 의존성 관리는 `npm`과 `package-lock.json` 기준으로 한다.

## 9. 보안 고려사항

- 민원 내용과 매뉴얼에는 개인정보가 포함될 수 있으므로 로그에 원문을 남기지 않는다.
- 업로드 파일명은 서버 내부 저장 시 안전한 이름으로 변환한다.
- 파일 다운로드는 서버가 발급한 식별자를 통해서만 허용한다.
- 외부 뉴스 수집 시 허용된 출처와 요청 주기를 관리한다.
- 챗봇 답변에는 “검토 필요” 고지를 표시한다.

## 10. 아키텍처 의사결정

- SQLite는 초기 MVP와 로컬 실행에 적합하므로 우선 채택한다.
- 향후 동시 사용자 수가 증가하면 PostgreSQL 전환을 고려한다.
- 엑셀 자동화는 백엔드에서 처리하여 브라우저 메모리 부담을 줄인다.
- 민원 챗봇은 초기에는 검색 기반으로 시작하고, 검증 절차가 마련된 뒤 생성형 AI 연동을 검토한다.

