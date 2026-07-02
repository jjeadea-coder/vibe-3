export type NewsArticle = {
  id: number;
  title: string;
  source: string | null;
  url: string;
  published_at: string | null;
  summary: string | null;
  keyword: string | null;
  is_bookmarked: boolean;
  collected_at: string;
  created_at: string;
};

export type NewsKeyword = {
  id: number;
  keyword: string;
  created_at: string;
};

export type NewsSource = {
  id: number;
  name: string;
  rss_url: string;
  created_at: string;
};

export type NewsCollectResult = {
  inserted: number;
  skipped: number;
  failed: Array<{ source_id: number; source: string; error: string }>;
};

type ListResponse<T> = { items: T[] };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // keep HTTP status text
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function newsQuery(params: { q?: string; keyword?: string; source?: string; bookmarked?: boolean }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.source) query.set("source", params.source);
  if (params.bookmarked !== undefined) query.set("bookmarked", String(params.bookmarked));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function listNews(params: {
  q?: string;
  keyword?: string;
  source?: string;
  bookmarked?: boolean;
}): Promise<NewsArticle[]> {
  const response = await requestJson<ListResponse<NewsArticle>>(`/api/news${newsQuery(params)}`);
  return response.items;
}

export async function collectNews(sourceIds?: number[]): Promise<NewsCollectResult> {
  return requestJson<NewsCollectResult>("/api/news/collect", {
    method: "POST",
    body: JSON.stringify(sourceIds ? { source_ids: sourceIds } : {}),
  });
}

export async function listNewsKeywords(): Promise<NewsKeyword[]> {
  const response = await requestJson<ListResponse<NewsKeyword>>("/api/news/keywords");
  return response.items;
}

export async function createNewsKeyword(keyword: string): Promise<NewsKeyword> {
  return requestJson<NewsKeyword>("/api/news/keywords", {
    method: "POST",
    body: JSON.stringify({ keyword }),
  });
}

export async function deleteNewsKeyword(id: number): Promise<NewsKeyword> {
  return requestJson<NewsKeyword>(`/api/news/keywords/${id}`, { method: "DELETE" });
}

export async function listNewsSources(): Promise<NewsSource[]> {
  const response = await requestJson<ListResponse<NewsSource>>("/api/news/sources");
  return response.items;
}

export async function createNewsSource(input: { name: string; rss_url: string }): Promise<NewsSource> {
  return requestJson<NewsSource>("/api/news/sources", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteNewsSource(id: number): Promise<NewsSource> {
  return requestJson<NewsSource>(`/api/news/sources/${id}`, { method: "DELETE" });
}

export async function toggleNewsBookmark(id: number): Promise<NewsArticle> {
  return requestJson<NewsArticle>(`/api/news/${id}/bookmark`, { method: "POST" });
}
