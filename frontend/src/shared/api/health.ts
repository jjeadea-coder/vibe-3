import { fetchJson } from "./client";

export type SystemHealth = {
  api: {
    status: string;
    service: string;
  };
  database: {
    status: string;
    path: string;
    sqlite_version: string;
  };
};

export async function getSystemHealth(): Promise<SystemHealth> {
  return fetchJson<SystemHealth>("/api/health/system");
}

export async function testBackendConnection(baseUrl: string): Promise<SystemHealth> {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("백엔드 URL을 입력하세요.");
  }

  return fetchJson<SystemHealth>("/api/health/system", undefined, normalized);
}
