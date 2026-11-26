import type { ConnectionOption, DatasetMeta, DirectTrainOption, Station } from '@/domain/types';

export interface BackendHealthResponse {
  status: string;
  meta: DatasetMeta;
  stats: {
    stations: number;
    trains: number;
    stops: number;
    clusters: number;
    transfers: number;
  };
}

export interface BackendConnectionsResponse {
  from: string;
  to: string;
  date: string;
  count: number;
  directTrains?: DirectTrainOption[];
  connections: ConnectionOption[];
}

export function getDefaultApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://bharat-yatra-1bdr.onrender.com';
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBackendHealth(baseUrl: string): Promise<BackendHealthResponse> {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  return fetchJsonWithTimeout<BackendHealthResponse>(`${clean}/health`, 5000);
}

export async function fetchBackendStations(
  baseUrl: string,
  query: string,
  limit = 30
): Promise<Station[]> {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });
  const data = await fetchJsonWithTimeout<{ stations: Station[] }>(
    `${clean}/api/stations?${params.toString()}`,
    5000
  );
  return Array.isArray(data.stations) ? data.stations : [];
}

export async function fetchBackendConnections(
  baseUrl: string,
  input: { from: string; to: string; date: string; extraBuffer: number }
): Promise<BackendConnectionsResponse> {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
    date: input.date,
    extraBuffer: String(input.extraBuffer),
    limit: '100',
  });
  return fetchJsonWithTimeout<BackendConnectionsResponse>(
    `${clean}/api/connections?${params.toString()}`,
    30000
  );
}
