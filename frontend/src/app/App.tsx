import { useEffect, useState } from "react";
import { getSystemHealth, type SystemHealth } from "../shared/api/health";
import { ChatbotPage } from "../pages/ChatbotPage";
import { ExcelPage } from "../pages/ExcelPage";
import { NewsPage } from "../pages/NewsPage";
import { SchedulePage } from "../pages/SchedulePage";

const navItems = [
  { id: "schedule", label: "팀원 스케쥴", component: <SchedulePage /> },
  { id: "excel", label: "엑셀 자동화", component: <ExcelPage /> },
  { id: "chatbot", label: "민원 챗봇", component: <ChatbotPage /> },
  { id: "news", label: "뉴스 수집", component: <NewsPage /> },
];

export function App() {
  const [activeId, setActiveId] = useState(navItems[0].id);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    getSystemHealth()
      .then((result) => {
        setHealth(result);
        setHealthError(null);
      })
      .catch((error: unknown) => {
        setHealth(null);
        setHealthError(error instanceof Error ? error.message : "상태 확인 실패");
      });
  }, []);

  const activeItem = navItems.find((item) => item.id === activeId) ?? navItems[0];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Public Administration Superapp</p>
        <h1>행정업무를 한 곳에서 조율하는 내부 업무 허브</h1>
        <p className="lead">
          문서화된 PRD와 아키텍처를 기준으로 FE 페이지 구조, FE-BE 연결,
          BE-DB 연결을 확인하는 초기 스캐폴드입니다.
        </p>
      </section>

      <section className="status-panel" aria-label="시스템 연동 상태">
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
