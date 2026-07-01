# 공공직군 행정업무 슈퍼앱 운영 문서

## 1. 문서 목적

본 문서는 개발 환경 실행 방법, 운영 시 자주 발생하는 에러, 기본 사용법을 정리한다. 현재 프로젝트는 초기 의존성 설치 단계이며, 실제 애플리케이션 코드는 아직 작성되지 않았다.

## 2. 개발 환경 요구사항

### 필수

- Node.js
- npm
- uv
- Python 런타임은 `uv`를 통해 사용
- SQLite

### 현재 확인된 버전

- Node.js: `v24.18.0`
- npm: `11.16.0`
- uv: `0.11.25`
- uv 관리 Python: `3.14.6`
- Python 내장 SQLite: `3.53.1`

## 3. 초기 설치 상태

### Frontend

위치:

```powershell
cd frontend
```

설치된 주요 패키지:

- `vite`
- `@vitejs/plugin-react`
- `typescript`
- `react`
- `react-dom`
- `eslint`

### Backend

위치:

```powershell
cd backend
```

생성된 가상환경:

```text
backend/.venv
```

설치된 주요 패키지:

- `fastapi`
- `uvicorn`

## 4. 프론트엔드 실행 방법

현재는 코드 파일이 없으므로 `npm run dev`는 정상 실행되지 않을 수 있다. 추후 `vite.config.ts`, `index.html`, `src/main.tsx`가 추가된 뒤 아래 명령을 사용한다.

```powershell
cd frontend
npm run dev
```

빌드:

```powershell
cd frontend
npm run build
```

프리뷰:

```powershell
cd frontend
npm run preview
```

## 5. 백엔드 실행 방법

현재는 FastAPI 앱 코드가 없으므로 서버 실행은 추후 `backend/app/main.py` 작성 후 가능하다.

권장 실행 전 환경변수:

```powershell
cd backend
$env:UV_CACHE_DIR="..\.uv-cache"
```

패키지 확인:

```powershell
uv pip list
```

추후 FastAPI 앱 실행:

```powershell
uv run uvicorn app.main:app --reload
```

## 6. SQLite 사용 방법

현재 시스템에는 `sqlite3` CLI가 설치되어 있지 않다. 다만 Python 내장 SQLite 모듈은 사용 가능하다.

Python 내장 SQLite 버전 확인:

```powershell
cd backend
$env:UV_CACHE_DIR="..\.uv-cache"
uv run python -c "import sqlite3; print(sqlite3.sqlite_version)"
```

권장 DB 파일 위치:

```text
data/app.sqlite3
```

## 7. 자주 발생하는 에러와 대응

### 7.1 uv 캐시 접근 권한 오류

증상:

```text
Failed to initialize cache at C:\Users\admin\AppData\Local\uv\cache
액세스가 거부되었습니다.
```

원인:

- 기본 uv 캐시 디렉터리에 접근 권한 문제가 있다.

대응:

```powershell
$env:UV_CACHE_DIR="..\.uv-cache"
```

프로젝트 루트에서 실행하는 경우:

```powershell
$env:UV_CACHE_DIR=".uv-cache"
```

### 7.2 python 명령을 찾을 수 없음

증상:

```text
Python was not found but can be installed from the Microsoft Store
```

원인:

- 전역 Python이 PATH에 등록되어 있지 않다.

대응:

- 이 프로젝트에서는 전역 `python` 대신 `uv run python`을 사용한다.

```powershell
cd backend
$env:UV_CACHE_DIR="..\.uv-cache"
uv run python --version
```

### 7.3 sqlite3 명령을 찾을 수 없음

증상:

```text
sqlite3 : 'sqlite3' 용어가 cmdlet으로 인식되지 않습니다.
```

원인:

- SQLite CLI가 설치되어 있지 않다.

대응:

- 개발 초기에는 Python 내장 `sqlite3`를 사용한다.
- CLI가 필요하면 SQLite 공식 CLI 또는 DB Browser for SQLite 설치를 검토한다.

### 7.4 npm create vite 실패

증상:

```text
cache mode is 'only-if-cached' but no cached response is available
```

원인:

- npm 네트워크 접근 또는 캐시 정책 문제다.

대응:

- 현재 프로젝트는 수동 `package.json` 생성 후 `npm install` 방식으로 필수 모듈을 설치했다.
- 신규 패키지 설치 시 네트워크 접근 권한이 필요할 수 있다.

## 8. 기능별 사용 흐름

### 8.1 팀원 스케쥴 관리

1. 팀원을 등록한다.
2. 일정 유형을 선택한다.
3. 시작일시와 종료일시를 입력한다.
4. 캘린더에서 팀원별 일정을 확인한다.
5. 중복 일정이 있으면 충돌 표시를 확인한다.

### 8.2 엑셀 업무 자동화

1. 엑셀 파일을 업로드한다.
2. 처리 방식을 선택한다: 분리 또는 병합.
3. 분리 기능은 기준 시트와 기준 컬럼을 선택한다.
4. 병합 기능은 대상 파일들을 선택한다.
5. 처리 완료 후 결과 파일을 다운로드한다.

### 8.3 민원 대응 챗봇

1. 민원 매뉴얼을 업로드한다.
2. 민원 내용을 입력한다.
3. 원하는 응답 형식을 선택한다.
4. 답변 초안과 근거 매뉴얼 항목을 확인한다.
5. 담당자가 최종 검토 후 사용한다.

### 8.4 뉴스 기사 수집

1. 수집 키워드를 등록한다.
2. 매일 아침 수집 작업이 실행된다.
3. 기사 목록에서 제목, 언론사, 발행일, 요약을 확인한다.
4. 필요한 기사를 북마크한다.

## 9. 운영 원칙

- 민원 데이터와 매뉴얼 원문은 민감정보로 취급한다.
- 업로드 파일은 처리 완료 후 보관 기간을 정해야 한다.
- 챗봇 답변은 자동 생성 초안이며 담당자 검토를 필수로 한다.
- 뉴스 수집은 출처별 이용 정책과 요청 빈도를 준수한다.
- SQLite DB 파일은 정기 백업 대상에 포함한다.

## 10. 다음 구현 단계

1. 프론트엔드 Vite 설정 파일과 React 진입점 작성
2. 백엔드 `pyproject.toml` 구성
3. FastAPI `app.main` 작성
4. SQLite 연결 모듈 작성
5. 일정 관리 API와 화면부터 MVP 구현

