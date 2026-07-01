import { useEffect, useState } from "react";
import { getSystemHealth, type SystemHealth } from "../shared/api/health";
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
        setHealthError(error instanceof Error ? error.message : "상태 확인에 실패했습니다.");
      });
  }, []);

  const activeItem = navItems.find((item) => item.id === activeId) ?? navItems[0];

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
