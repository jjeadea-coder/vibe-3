import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getApiBaseUrl, loadApiBaseUrl, normalizeApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from "../shared/api/client";
import { getSystemHealth, testBackendConnection, type SystemHealth } from "../shared/api/health";
import { ChatbotPage } from "../pages/ChatbotPage";
import { ExcelPage } from "../pages/ExcelPage";
import { NewsPage } from "../pages/NewsPage";
import { SchedulePage } from "../pages/SchedulePage";

const navItems = [
  { id: "schedule", label: "팀원 일정", component: <SchedulePage /> },
  { id: "excel", label: "엑셀 자동화", component: <ExcelPage /> },
  { id: "chatbot", label: "민원 챗봇", component: <ChatbotPage /> },
  { id: "news", label: "뉴스 수집", component: <NewsPage /> },
];

type ConnectionState = {
  kind: "idle" | "testing" | "success" | "error";
  message: string;
};

export function App() {
  const [activeId, setActiveId] = useState(navItems[0].id);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [apiUrlInput, setApiUrlInput] = useState(() => loadApiBaseUrl());
  const [apiUrlSaved, setApiUrlSaved] = useState(() => getApiBaseUrl());
  const [connectionState, setConnectionState] = useState<ConnectionState>({ kind: "idle", message: "" });

  async function refreshHealth() {
    try {
      const result = await getSystemHealth();
      setHealth(result);
      setHealthError(null);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : "상태 확인에 실패했습니다.");
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, [apiUrlSaved]);

  const activeItem = navItems.find((item) => item.id === activeId) ?? navItems[0];
  const activeBackendLabel = apiUrlSaved || "same origin / local proxy";

  async function handleSaveBackendUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeApiBaseUrl(apiUrlInput);
    setApiBaseUrl(normalized);
    setApiUrlInput(normalized);
    setApiUrlSaved(normalized);
    setConnectionState({
      kind: "success",
      message: normalized ? `백엔드 주소를 저장했습니다. ${normalized}` : "백엔드 주소를 초기화했습니다.",
    });
    await refreshHealth();
  }

  async function handleTestBackendUrl() {
    const target = normalizeApiBaseUrl(apiUrlInput);
    if (!target) {
      setConnectionState({ kind: "error", message: "백엔드 URL을 먼저 입력하세요." });
      return;
    }

    setConnectionState({ kind: "testing", message: "연결을 확인하는 중입니다." });

    try {
      const result = await testBackendConnection(target);
      setConnectionState({
        kind: "success",
        message: `연결 성공: ${result.api.service} / SQLite ${result.database.sqlite_version}`,
      });
    } catch (error) {
      setConnectionState({
        kind: "error",
        message: error instanceof Error ? error.message : "연결 테스트에 실패했습니다.",
      });
    }
  }

  async function handleResetBackendUrl() {
    resetApiBaseUrl();
    setApiUrlInput("");
    setApiUrlSaved("");
    setConnectionState({ kind: "success", message: "백엔드 주소를 초기화했습니다." });
    await refreshHealth();
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Public Administration Superapp</p>
        <h1>공공 행정 업무를 한 화면에서 처리하는 슈퍼앱</h1>
        <p className="lead">
          팀원 일정 관리, 엑셀 자동화, 민원 응대 챗봇, 뉴스 수집 기능을 하나의 운영 화면에서 다루는 초기 스캐폴드입니다.
        </p>
      </section>

      <section className="status-panel" aria-label="시스템 연결 상태">
        <div>
          <span className="status-label">FE-BE</span>
          <strong className={health?.api.status === "ok" ? "ok" : "fail"}>
            {health?.api.status ?? "checking"}
          </strong>
        </div>
        <div>
          <span className="status-label">BE-DB</span>
          <strong className={health?.database.status === "ok" ? "ok" : "fail"}>
            {health?.database.status ?? "checking"}
          </strong>
        </div>
        <div>
          <span className="status-label">DB Path</span>
          <strong>{health?.database.path ?? "-"}</strong>
        </div>
        {healthError ? <p className="error-text">{healthError}</p> : null}
      </section>

      <section className="panel connection-panel" aria-label="백엔드 주소 설정">
        <div className="panel-head">
          <div>
            <p className="section-kicker">Backend URL</p>
            <h3>백엔드 서버 주소 설정</h3>
          </div>
          <span className="connection-pill">현재: {activeBackendLabel}</span>
        </div>

        <form className="connection-form" onSubmit={handleSaveBackendUrl}>
          <label className="field field-wide">
            <span>백엔드 URL</span>
            <input
              value={apiUrlInput}
              onChange={(event) => setApiUrlInput(event.target.value)}
              placeholder="예: https://xxxx.trycloudflare.com"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div className="button-row field-wide connection-actions">
            <button className="primary-button" type="submit">
              저장
            </button>
            <button className="ghost-button" type="button" onClick={handleTestBackendUrl} disabled={connectionState.kind === "testing"}>
              연결 테스트
            </button>
            <button className="danger-button" type="button" onClick={handleResetBackendUrl}>
              초기화
            </button>
          </div>
        </form>

        <p className={`connection-message ${connectionState.kind}`}>
          {connectionState.message || "URL을 저장한 뒤 연결 테스트를 실행하세요."}
        </p>
      </section>

      <section className="workspace">
        <aside className="side-nav" aria-label="기능 메뉴">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeId ? "active" : ""}
              type="button"
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>
        <article className="page-card">{activeItem.component}</article>
      </section>
    </main>
  );
}
