/**
 * Mock data for AI Visibility section — used as fallback when backend is unavailable.
 */
import type {
  ComparisonRow,
  ScoreResponse,
  TrendPoint,
  VisQueryResponse,
  RankingResponse,
} from "../types";

// ── Queries ─────────────────────────────────────────────────
export const MOCK_QUERIES: VisQueryResponse[] = [
  { id: 1, query_text: "best air purifier 2025", category: "product_comparison", priority: "high", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 72.5 },
  { id: 2, query_text: "levoit vs dyson air purifier", category: "brand_search", priority: "high", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 68.2 },
  { id: 3, query_text: "best humidifier for bedroom", category: "category_search", priority: "high", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 58.4 },
  { id: 4, query_text: "air purifier for allergies", category: "category_search", priority: "medium", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 64.8 },
  { id: 5, query_text: "best air purifier under $100", category: "product_comparison", priority: "medium", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 81.3 },
  { id: 6, query_text: "levoit core 300 review", category: "brand_search", priority: "high", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 76.1 },
  { id: 7, query_text: "smart home air quality", category: "general", priority: "low", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 42.6 },
  { id: 8, query_text: "levoit vs honeywell hepa filter", category: "brand_search", priority: "medium", brands: ["Levoit", "Dyson", "Coway", "Honeywell"], is_active: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-06-01T00:00:00Z", latest_score: 71.0 },
];

// ── Scores ──────────────────────────────────────────────────
export const MOCK_SCORES: ScoreResponse[] = MOCK_QUERIES.map((q, i) => ({
  id: i + 1,
  query_id: q.id,
  brand: "Levoit",
  visibility_score: q.latest_score ?? 0,
  competitive_gap: [8.2, -3.5, -12.1, 5.4, 22.6, 14.8, -18.2, 6.3][i],
  period: "raw" as const,
  computed_at: "2025-06-01T12:00:00Z",
}));

// ── Comparison Rows ─────────────────────────────────────────
export const MOCK_COMPARISON: ComparisonRow[] = [
  { query_id: 1, query_text: "best air purifier 2025", levoit_score: 72.5, dyson_score: 64.3, coway_score: 58.2, honeywell_score: 48.1, competitive_gap: 8.2 },
  { query_id: 2, query_text: "levoit vs dyson air purifier", levoit_score: 68.2, dyson_score: 71.7, coway_score: 32.4, honeywell_score: 28.6, competitive_gap: -3.5 },
  { query_id: 3, query_text: "best humidifier for bedroom", levoit_score: 58.4, dyson_score: 62.1, coway_score: 70.5, honeywell_score: 45.3, competitive_gap: -12.1 },
  { query_id: 4, query_text: "air purifier for allergies", levoit_score: 64.8, dyson_score: 59.4, coway_score: 52.1, honeywell_score: 61.2, competitive_gap: 5.4 },
  { query_id: 5, query_text: "best air purifier under $100", levoit_score: 81.3, dyson_score: 22.4, coway_score: 58.7, honeywell_score: 54.2, competitive_gap: 22.6 },
  { query_id: 6, query_text: "levoit core 300 review", levoit_score: 76.1, dyson_score: 18.5, coway_score: 12.3, honeywell_score: 8.4, competitive_gap: 57.6 },
  { query_id: 7, query_text: "smart home air quality", levoit_score: 42.6, dyson_score: 55.8, coway_score: 38.4, honeywell_score: 60.8, competitive_gap: -18.2 },
  { query_id: 8, query_text: "levoit vs honeywell hepa filter", levoit_score: 71.0, dyson_score: 35.2, coway_score: 28.6, honeywell_score: 64.7, competitive_gap: 6.3 },
];

// ── Trend Points (30 days × 4 brands for query_id=1) ────────
function generateTrends(queryId: number): TrendPoint[] {
  const brands = ["Levoit", "Dyson", "Coway", "Honeywell"];
  const baseRanks: Record<string, number> = { Levoit: 1.8, Dyson: 2.4, Coway: 3.1, Honeywell: 3.8 };
  const baseScores: Record<string, number> = { Levoit: 72, Dyson: 64, Coway: 55, Honeywell: 48 };
  const points: TrendPoint[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const ts = d.toISOString();

    for (const brand of brands) {
      const drift = (Math.sin(i * 0.3 + brands.indexOf(brand)) * 0.5);
      points.push({
        timestamp: ts,
        brand,
        avg_rank: Math.max(1, +(baseRanks[brand] + drift + (Math.random() - 0.5) * 0.4).toFixed(1)),
        avg_score: +(baseScores[brand] + drift * 8 + (Math.random() - 0.5) * 4).toFixed(1),
        sample_count: 3,
      });
    }
  }
  return points;
}

export const MOCK_TRENDS: Record<number, TrendPoint[]> = {
  1: generateTrends(1),
  2: generateTrends(2),
  3: generateTrends(3),
  4: generateTrends(4),
  5: generateTrends(5),
  6: generateTrends(6),
  7: generateTrends(7),
  8: generateTrends(8),
};

// ── Rankings (per query, latest scrape) ─────────────────────
function generateRankings(queryId: number): RankingResponse[] {
  const brands = ["Levoit", "Dyson", "Coway", "Honeywell"];
  const platforms = ["chatgpt", "perplexity", "google_ai"] as const;
  const now = new Date().toISOString();
  let id = queryId * 100;

  const rankMap: Record<string, Record<string, number>> = {
    Levoit: { chatgpt: 1, perplexity: 2, google_ai: 2 },
    Dyson: { chatgpt: 2, perplexity: 1, google_ai: 3 },
    Coway: { chatgpt: 3, perplexity: 3, google_ai: 1 },
    Honeywell: { chatgpt: 4, perplexity: 4, google_ai: 4 },
  };

  return brands.flatMap((brand) =>
    platforms.map((platform) => ({
      id: ++id,
      query_id: queryId,
      platform,
      brand,
      rank_position: rankMap[brand][platform],
      snippet: `${brand} is mentioned as a ${rankMap[brand][platform] === 1 ? "top" : "notable"} choice for this query on ${platform}.`,
      source_urls: [`https://example.com/${platform}/${brand.toLowerCase()}`],
      snapshot_id: `snap_${queryId}_${platform}_${brand.toLowerCase()}`,
      scraped_at: now,
      pipeline_run_id: 1,
    }))
  );
}

export const MOCK_RANKINGS: Record<number, RankingResponse[]> = Object.fromEntries(
  MOCK_QUERIES.map((q) => [q.id, generateRankings(q.id)])
);
