const STORAGE_KEY = "public-sector-superapp.apiBaseUrl";
const ABSOLUTE_URL_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
let apiBaseUrl = "";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

function readStoredBaseUrl() {
  if (!isBrowser()) {
    return "";
  }

  return normalizeBaseUrl(window.localStorage.getItem(STORAGE_KEY) ?? "");
}

apiBaseUrl = readStoredBaseUrl();

export function loadApiBaseUrl() {
  apiBaseUrl = readStoredBaseUrl();
  return apiBaseUrl;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function normalizeApiBaseUrl(value: string) {
  return normalizeBaseUrl(value);
}

export function setApiBaseUrl(value: string) {
  apiBaseUrl = normalizeBaseUrl(value);

  if (isBrowser()) {
    if (apiBaseUrl) {
      window.localStorage.setItem(STORAGE_KEY, apiBaseUrl);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return apiBaseUrl;
}

export function resetApiBaseUrl() {
  return setApiBaseUrl("");
}

export function buildApiUrl(path: string, baseUrl = apiBaseUrl) {
  if (ABSOLUTE_URL_RE.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

async function parseErrorMessage(response: Response) {
  let message = `${response.status} ${response.statusText}`;

  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      message = payload.detail;
    }
  } catch {
    // Keep the HTTP status text when the payload is not JSON.
  }

  return message;
}

export async function fetchJson<T>(path: string, init?: RequestInit, baseUrl?: string): Promise<T> {
  const response = await fetch(buildApiUrl(path, baseUrl), {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(path, init);
}
