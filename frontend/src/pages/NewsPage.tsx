/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  collectNews,
  createNewsKeyword,
  createNewsSource,
  deleteNewsKeyword,
  deleteNewsSource,
  listNews,
  listNewsKeywords,
  listNewsSources,
  toggleNewsBookmark,
  type NewsArticle,
  type NewsKeyword,
  type NewsSource,
} from "../shared/api/news";

type Notice = { kind: "success" | "error"; message: string };

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [keywords, setKeywords] = useState<NewsKeyword[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [query, setQuery] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const bookmarkedCount = useMemo(
    () => articles.filter((article) => article.is_bookmarked).length,
    [articles],
  );

  async function refreshArticles() {
    const items = await listNews({
      q: query.trim() || undefined,
      keyword: keywordFilter || undefined,
      source: sourceFilter || undefined,
      bookmarked: bookmarkedOnly ? true : undefined,
    });
    setArticles(items);
  }

  async function refreshSettings() {
    const [keywordItems, sourceItems] = await Promise.all([listNewsKeywords(), listNewsSources()]);
    setKeywords(keywordItems);
    setSources(sourceItems);
  }

  async function refreshAll() {
    setLoading(true);
    setNotice(null);

    try {
      await Promise.all([refreshArticles(), refreshSettings()]);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "뉴스 데이터를 불러오지 못했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    void refreshArticles().catch((error: unknown) => {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "기사 목록을 불러오지 못했습니다.",
      });
    });
  }, [keywordFilter, sourceFilter, bookmarkedOnly]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      await refreshArticles();
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "검색에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect() {
    setCollecting(true);
    setNotice(null);

    try {
      const result = await collectNews();
      await refreshArticles();
      const failed = result.failed.length > 0 ? `, 실패 ${result.failed.length}건` : "";
      setNotice({
        kind: result.failed.length > 0 ? "error" : "success",
        message: `수집 완료: 신규 ${result.inserted}건, 중복 ${result.skipped}건${failed}`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "뉴스 수집에 실패했습니다.",
      });
    } finally {
      setCollecting(false);
    }
  }

  async function handleKeywordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = newKeyword.trim();
    if (!keyword) return;

    setLoading(true);
    setNotice(null);

    try {
      await createNewsKeyword(keyword);
      setNewKeyword("");
      await refreshSettings();
      setNotice({ kind: "success", message: "키워드를 등록했습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "키워드 등록에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSourceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sourceName.trim();
    const rssUrl = sourceUrl.trim();
    if (!name || !rssUrl) return;

    setLoading(true);
    setNotice(null);

    try {
      await createNewsSource({ name, rss_url: rssUrl });
      setSourceName("");
      setSourceUrl("");
      await refreshSettings();
      setNotice({ kind: "success", message: "RSS 출처를 등록했습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "RSS 출처 등록에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteKeyword(id: number) {
    setLoading(true);
    setNotice(null);

    try {
      await deleteNewsKeyword(id);
      if (keywordFilter === String(id)) setKeywordFilter("");
      await refreshSettings();
      setNotice({ kind: "success", message: "키워드를 삭제했습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "키워드 삭제에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSource(source: NewsSource) {
    if (!window.confirm(`RSS 출처 '${source.name}'을(를) 삭제할까요?`)) return;

    setLoading(true);
    setNotice(null);

    try {
      await deleteNewsSource(source.id);
      if (sourceFilter === source.name) setSourceFilter("");
      await refreshSettings();
      setNotice({ kind: "success", message: "RSS 출처를 삭제했습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "RSS 출처 삭제에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleBookmark(article: NewsArticle) {
    try {
      const updated = await toggleNewsBookmark(article.id);
      setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "북마크 변경에 실패했습니다.",
      });
    }
  }

  return (
    <div className="news-page">
      <header className="page-header compact">
        <div>
          <p className="section-kicker">News Collection</p>
          <h2>뉴스 기사 수집</h2>
        </div>
        <div className="summary-grid news-summary">
          <div className="summary-card">
            <span>저장 기사</span>
            <strong>{articles.length}건</strong>
          </div>
          <div className="summary-card">
            <span>북마크</span>
            <strong>{bookmarkedCount}건</strong>
          </div>
          <div className="summary-card">
            <span>RSS 출처</span>
            <strong>{sources.length}개</strong>
          </div>
        </div>
      </header>

      {notice ? <div className={`notice ${notice.kind}`}>{notice.message}</div> : null}
      {loading ? <div className="notice">처리 중...</div> : null}

      <section className="panel news-controls">
        <form className="news-search" onSubmit={handleSearch}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 요약, 언론사 검색" />
          <select value={keywordFilter} onChange={(event) => setKeywordFilter(event.target.value)}>
            <option value="">전체 키워드</option>
            {keywords.map((keyword) => (
              <option key={keyword.id} value={keyword.keyword}>
                {keyword.keyword}
              </option>
            ))}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="">전체 출처</option>
            {sources.map((source) => (
              <option key={source.id} value={source.name}>
                {source.name}
              </option>
            ))}
          </select>
          <label className="inline-switch compact-switch">
            <input
              type="checkbox"
              checked={bookmarkedOnly}
              onChange={(event) => setBookmarkedOnly(event.target.checked)}
            />
            <span>북마크만</span>
          </label>
          <button className="primary-button" type="submit">검색</button>
          <button className="primary-button collect-button" type="button" onClick={handleCollect} disabled={collecting}>
            {collecting ? "수집 중" : "뉴스 수집"}
          </button>
        </form>
      </section>

      <section className="news-layout">
        <div className="panel news-list-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Articles</p>
              <h3>기사 목록</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table news-table">
              <thead>
                <tr>
                  <th>기사</th>
                  <th>출처</th>
                  <th>발행일</th>
                  <th>키워드</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">수집된 기사가 없습니다.</td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr key={article.id}>
                      <td>
                        <div className="article-title-cell">
                          <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                          <span>{article.summary ?? hostFromUrl(article.url)}</span>
                        </div>
                      </td>
                      <td>{article.source ?? "-"}</td>
                      <td>{formatDate(article.published_at ?? article.collected_at)}</td>
                      <td>{article.keyword ?? "-"}</td>
                      <td>
                        <div className="action-group">
                          <button className="ghost-button" type="button" onClick={() => handleBookmark(article)}>
                            {article.is_bookmarked ? "북마크 해제" : "북마크"}
                          </button>
                          <a className="ghost-link" href={article.url} target="_blank" rel="noreferrer">열기</a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="news-settings">
          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Keywords</p>
                <h3>키워드</h3>
              </div>
            </div>
            <form className="stack-form" onSubmit={handleKeywordSubmit}>
              <input value={newKeyword} onChange={(event) => setNewKeyword(event.target.value)} placeholder="예: 행정안전부" />
              <button className="primary-button" type="submit">등록</button>
            </form>
            <div className="chip-list">
              {keywords.map((keyword) => (
                <button key={keyword.id} className="chip-button" type="button" onClick={() => handleDeleteKeyword(keyword.id)}>
                  {keyword.keyword} ×
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">RSS Sources</p>
                <h3>RSS 출처</h3>
              </div>
            </div>
            <form className="stack-form" onSubmit={handleSourceSubmit}>
              <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="출처 이름" />
              <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="RSS URL" />
              <button className="primary-button" type="submit">등록</button>
            </form>
            <div className="source-list">
              {sources.map((source) => (
                <div key={source.id} className="source-item">
                  <div>
                    <strong>{source.name}</strong>
                    <span>{hostFromUrl(source.rss_url)}</span>
                  </div>
                  <button className="danger-button" type="button" onClick={() => handleDeleteSource(source)}>삭제</button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
