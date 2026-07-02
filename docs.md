# 프로젝트 문서

## 개요

공공 행정 업무를 한 화면에서 처리하기 위한 FE/BE 스캐폴드이다. 현재 구현된 핵심 기능은 팀원 관리와 일정 관리이며, 엑셀 자동화, 민원 대응 챗봇, 뉴스 수집은 화면과 capability API 중심의 초기 구조가 준비되어 있다.

## 기술 스택

- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI, Uvicorn
- Database: SQLite
- Package/환경 관리: npm, uv

## 디렉터리 구조

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI 라우터
│   │   ├── api/schemas.py   # Pydantic 요청/응답 모델
│   │   ├── core/config.py   # 데이터 경로 설정
│   │   ├── core/database.py # SQLite 초기화 및 연결
│   │   └── main.py          # FastAPI 앱 진입점
│   └── pyproject.toml
├── frontend/
│   ├── src/app/App.tsx
│   ├── src/pages/
│   ├── src/shared/api/
│   └── package.json
├── data/                    # 런타임 SQLite DB 위치
├── docs/                    # 기존 상세 문서
└── docs.md                  # 현재 프로젝트 요약 문서
```

## 환경 설정

백엔드는 `backend/pyproject.toml` 기준으로 Python `>=3.14`를 요구한다. 현재 의존성은 `fastapi==0.138.2`, `uvicorn==0.49.0`이다.

uv 캐시 권한 문제가 발생하면 워크스페이스 내부 캐시를 사용한다.

```powershell
$env:UV_CACHE_DIR="..\.uv-cache"
```

프론트엔드는 `frontend/package.json` 기준으로 Vite, React, TypeScript, ESLint를 사용한다.

## 실행 방법

백엔드 실행:

```powershell
cd backend
$env:UV_CACHE_DIR="..\.uv-cache"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

프론트엔드 실행:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Vite 개발 서버는 `/api` 요청을 `http://127.0.0.1:8000`으로 프록시한다. 백엔드 CORS 허용 origin은 `http://127.0.0.1:5173`, `http://localhost:5173`이다.

## 테스트 및 빌드

프론트엔드 빌드:

```powershell
cd frontend
npm run build
```

프론트엔드 린트:

```powershell
cd frontend
npm run lint
```

프론트엔드 프리뷰:

```powershell
cd frontend
npm run preview
```

백엔드 전용 테스트 스크립트는 현재 확인되지 않았다.

## 주요 기능

### 팀원 일정 관리

현재 실제 CRUD가 구현된 주요 기능이다.

- 팀원 등록, 수정, 비활성화
- 활성/비활성 팀원 목록 조회
- 일정 등록, 수정, 삭제
- 주간/월간 일정 보기
- 팀원별 일정 필터
- 일정 충돌 가능성 표시

프론트엔드 화면은 `frontend/src/pages/SchedulePage.tsx`에 구현되어 있고, API 클라이언트는 `frontend/src/shared/api/schedule.ts`에 있다.

### 엑셀 업무 자동화

현재 프론트엔드에는 기능 안내 화면이 있으며, 백엔드는 capability API만 제공한다.

- 준비 항목: 엑셀 업로드, 시트/컬럼 선택, 분리 및 병합, 결과 파일 다운로드
- capability: `split-by-column`, `merge-files`

### 민원 대응 챗봇

현재 프론트엔드에는 기능 안내 화면이 있으며, 백엔드는 capability API만 제공한다.

- 준비 항목: 메뉴얼 업로드, 민원 내용 입력, 답변 초안 생성, 근거 문서 표시
- capability: `manual-upload`, `query-draft`, `source-citation`

### 뉴스 기사 수집

현재 프론트엔드에는 기능 안내 화면이 있으며, 백엔드는 빈 뉴스 목록 API를 제공한다.

- 준비 항목: 키워드 설정, 수집 스케줄, 중복 기사 제거, 요약 및 목록 보기

## API

기본 prefix는 `/api`이다.

### 상태 확인

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/health` | API 상태 확인 |
| GET | `/api/db/health` | SQLite 연결 및 스키마 버전 확인 |
| GET | `/api/health/system` | API와 DB 상태를 함께 확인 |

### 팀원

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/members` | 팀원 목록 조회 |
| GET | `/api/members?active_only=true` | 활성 팀원만 조회 |
| GET | `/api/members/{member_id}` | 팀원 단건 조회 |
| POST | `/api/members` | 팀원 생성 |
| PATCH | `/api/members/{member_id}` | 팀원 수정 |
| DELETE | `/api/members/{member_id}` | 팀원 비활성화 |

팀원 생성/수정 필드:

```json
{
  "name": "홍길동",
  "department": "민원행정과",
  "role": "주무관"
}
```

### 일정

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/schedules` | 일정 목록 조회 |
| GET | `/api/schedules/{schedule_id}` | 일정 단건 조회 |
| POST | `/api/schedules` | 일정 생성 |
| PATCH | `/api/schedules/{schedule_id}` | 일정 수정 |
| DELETE | `/api/schedules/{schedule_id}` | 일정 삭제 |

일정 목록 조회 쿼리:

- `from`: 조회 시작 일시
- `to`: 조회 종료 일시
- `member_id`: 팀원 ID
- `status`: 일정 상태
- `type`: 일정 유형

일정 생성/수정 필드:

```json
{
  "member_id": 1,
  "title": "민원 응대 회의",
  "type": "회의",
  "start_at": "2026-07-01T09:00:00",
  "end_at": "2026-07-01T10:00:00",
  "location": "3층 회의실",
  "memo": "주간 민원 이슈 점검",
  "all_day": false,
  "status": "확정"
}
```

### 기타 기능

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/excel/capabilities` | 엑셀 자동화 지원 capability 목록 |
| GET | `/api/chatbot/capabilities` | 챗봇 지원 capability 목록 |
| GET | `/api/news` | 뉴스 기사 목록 |

## 데이터 및 저장소

SQLite DB 경로는 `data/app.sqlite3`이다. 백엔드 시작 또는 DB 연결 시 `backend/app/core/database.py`의 `initialize_database()`가 실행되어 필요한 테이블과 인덱스를 생성한다.

현재 스키마 버전은 `0.2.0`이다.

주요 테이블:

- `app_metadata`: 스키마 버전 등 메타데이터
- `members`: 팀원 정보와 활성 상태
- `schedules`: 팀원 일정
- `news_articles`: 뉴스 기사 저장용 테이블

생성되는 인덱스:

- `idx_members_is_active`
- `idx_schedules_member_start`
- `idx_schedules_start_end`

## 운영/배포 참고사항

- `data/*.sqlite3`, `data/*.db`는 `.gitignore`에 포함되어 있다.
- `frontend/node_modules/`, `backend/.venv/`, `frontend/dist/`, `.uv-cache/`는 Git 추적 대상이 아니다.
- 현재 인증/인가 계층은 확인되지 않았다. 내부 개발용 또는 초기 스캐폴드로 취급한다.
- 업로드 파일 처리, 챗봇 답변 생성, 뉴스 외부 수집 로직은 아직 실제 구현이 확인되지 않았다.

## 확인 필요

- 백엔드 테스트 전략 및 테스트 명령
- 실제 배포 방식과 환경 변수 정책
- 인증/인가 요구사항
- 엑셀 파일 업로드/다운로드 구현 범위
- 민원 챗봇에서 사용할 LLM, 문서 저장 방식, 개인정보 처리 기준
- 뉴스 수집 대상, 스케줄러, 외부 사이트 요청 정책

