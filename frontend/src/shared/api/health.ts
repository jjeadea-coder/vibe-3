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
  const response = await fetch("/api/health/system");

  if (!response.ok) {
    throw new Error(`시스템 상태 확인 실패: ${response.status}`);
  }

  return response.json() as Promise<SystemHealth>;
}
