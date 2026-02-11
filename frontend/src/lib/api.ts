/**
 * Typed API client for Levoit GEO Platform.
 *
 * Wraps fetch() with:
 *   - Base URL handling (proxied via next.config.ts rewrites)
 *   - Typed JSON responses
 *   - Error handling with ApiError class
 *   - Pagination helpers
 *   - Query parameter building
 */

import type {
  PaginatedResponse,
  VisQueryResponse,
  VisQueryCreate,
  VisQueryUpdate,
  RankingResponse,
  ScoreResponse,
  TrendPoint,
  ComparisonRow,
  SnapshotDoc,
} from "./types";

// ── Error ────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

// ── Core fetch wrapper ───────────────────────────────────────

const BASE = "/api/v1/visibility";

/** Build query string from a params object, omitting null/undefined. */
function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries = Object.entries(params).filter(
    (kv): kv is [string, string | number | boolean] => kv[1] != null,
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ── Query endpoints ──────────────────────────────────────────

export const queries = {
  list(params: {
    page?: number;
    page_size?: number;
    category?: string;
    priority?: string;
    is_active?: boolean;
  } = {}) {
    return request<PaginatedResponse<VisQueryResponse>>(
      `${BASE}/queries${qs(params)}`,
    );
  },

  get(id: number) {
    return request<VisQueryResponse>(`${BASE}/queries/${id}`);
  },

  create(body: VisQueryCreate) {
    return request<VisQueryResponse>(`${BASE}/queries`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(id: number, body: VisQueryUpdate) {
    return request<VisQueryResponse>(`${BASE}/queries/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(id: number) {
    return request<VisQueryResponse>(`${BASE}/queries/${id}`, {
      method: "DELETE",
    });
  },
};

// ── Ranking endpoints ────────────────────────────────────────

export const rankings = {
  list(params: {
    page?: number;
    page_size?: number;
    query_id?: number;
    platform?: string;
    brand?: string;
    from?: string;
    to?: string;
  } = {}) {
    return request<PaginatedResponse<RankingResponse>>(
      `${BASE}/rankings${qs(params)}`,
    );
  },

  latest(query_id: number) {
    return request<RankingResponse[]>(
      `${BASE}/rankings/latest${qs({ query_id })}`,
    );
  },

  trends(params: {
    query_id: number;
    brands?: string;
    from?: string;
    to?: string;
    granularity?: "daily" | "weekly" | "monthly";
  }) {
    return request<TrendPoint[]>(
      `${BASE}/rankings/trends${qs(params)}`,
    );
  },
};

// ── Score endpoints ──────────────────────────────────────────

export const scores = {
  list(params: {
    page?: number;
    page_size?: number;
    query_id?: number;
    brand?: string;
    period?: string;
  } = {}) {
    return request<PaginatedResponse<ScoreResponse>>(
      `${BASE}/scores${qs(params)}`,
    );
  },

  comparison(params: {
    category?: string;
    from?: string;
    to?: string;
  } = {}) {
    return request<ComparisonRow[]>(
      `${BASE}/scores/comparison${qs(params)}`,
    );
  },
};

// ── Snapshot endpoints ───────────────────────────────────────

export const snapshots = {
  get(id: string) {
    return request<SnapshotDoc>(`${BASE}/snapshots/${id}`);
  },
};
