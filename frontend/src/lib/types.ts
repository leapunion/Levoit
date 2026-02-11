/**
 * Levoit GEO Platform — Shared TypeScript Types
 *
 * Mirrors backend Pydantic schemas + prompt-defined structures.
 */

// ── Enums ─────────────────────────────────────────────────────
export type Platform = "chatgpt" | "perplexity" | "google_ai" | "rufus";
export type VisPlatform = "chatgpt" | "perplexity" | "google_ai";
export type QueryCategory = "product_comparison" | "brand_search" | "category_search" | "general";
export type QueryPriority = "high" | "medium" | "low";
export type ScorePeriod = "raw" | "daily" | "weekly" | "monthly";
export type PipelineStatus = "running" | "completed" | "failed" | "cost_halted";
export type IntentLayer = "A1" | "A2" | "A3";
export type Sentiment = "positive" | "negative" | "neutral" | "mixed";
export type EvidenceType = "tested" | "long_term" | "hearsay" | "speculation";
export type Period = "7d" | "14d" | "30d" | "90d" | "custom";

// ── Pagination (shared) ──────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── KPI Card ─────────────────────────────────────────────────
export interface KpiMetric {
  label: string;
  value: string | number;
  change?: number;          // percentage change
  changeLabel?: string;     // e.g. "vs last 30d"
  icon?: string;
  format?: "number" | "percent" | "score";
}

// ── Reddit VOC (R1-R4) ──────────────────────────────────────
export interface RedditMention {
  id: string;
  subreddit: string;
  post_id: string;
  comment_id?: string;
  author: string;
  author_karma: number;
  text: string;
  brands_mentioned: string[];
  sentiment: Sentiment;
  evidence_type: EvidenceType;
  trust_score: number;
  created_at: string;
  url: string;
}

export interface TopicNode {
  id: string;
  name: string;
  parent_id?: string;
  level: "use_case" | "decision_dimension" | "risk";
  mention_count: number;
  avg_sentiment: number;
  children?: TopicNode[];
}

export interface RiskItem {
  id: string;
  topic_id: string;
  risk_text: string;          // e.g. "滤芯是不是很贵？"
  trigger_frequency: number;  // mentions per month
  severity: "high" | "medium" | "low";
  evidence_ratio: number;     // % backed by evidence
  mapped_query_clusters: string[];
  counter_content_status: "covered" | "partial" | "missing";
}

export interface ShareOfDiscussion {
  topic_id: string;
  topic_name: string;
  brand: string;
  sod_percent: number;
  mention_count: number;
  sentiment_score: number;
  period: string;
}

export interface CompetitorCoMention {
  brand_a: string;
  brand_b: string;
  co_mention_count: number;
  context: "comparison" | "recommendation" | "complaint";
  avg_sentiment_a: number;
  avg_sentiment_b: number;
}

// ── Rufus GEO (A1-A4) ──────────────────────────────────────
export interface QueryCluster {
  cluster_id: string;
  intent: IntentLayer;
  topic: string;
  example_queries: string[];
  coverage_score: number;     // 0-100
  levoit_soa: number;         // Share of Answer 0-100
  mapped_reddit_topics: string[];
}

export interface RufusProbeResult {
  probe_id: string;
  query: string;
  cluster_id: string;
  timestamp: string;
  levoit_present: boolean;
  levoit_rank: number;        // 0 = not present
  competitors_in_answer: string[];
  claims_cited: string[];
  risk_statements: string[];
  stability_score: number;    // 0-1
  raw_answer_snapshot: string;
}

export interface ShareOfAnswer {
  cluster_id: string;
  cluster_name: string;
  intent: IntentLayer;
  soa_percent: number;
  appearance_stability: number;
  claim_match_score: number;
  risk_surfacing_count: number;
  sample_count: number;
  period: string;
}

export interface ContentAsset {
  asin: string;
  asset_type: "listing_title" | "bullet" | "spec" | "aplus_table" | "aplus_comparison" | "aplus_scene" | "qa" | "review_cluster";
  content: string;
  mapped_claims: string[];
  mapped_topics: string[];
  rufus_cited: boolean;
  last_updated: string;
}

// ── Bridge (R4 + U1) ────────────────────────────────────────
export interface TopicQueryMapping {
  reddit_topic_id: string;
  reddit_topic_name: string;
  query_cluster_id: string;
  query_cluster_name: string;
  confidence: number;         // 0-1
  content_translation_status: "done" | "in_progress" | "pending";
  priority_score: number;
}

// ── Experiments (U2) ─────────────────────────────────────────
export interface Experiment {
  id: string;
  name: string;
  type: "reddit_diffusion" | "risk_fix" | "content_update" | "probe_ab";
  status: "running" | "completed" | "failed" | "pending";
  hypothesis: string;
  success_threshold: string;
  start_date: string;
  end_date?: string;
  results_summary?: string;
}

// ── Dashboard Overview (U3) ─────────────────────────────────
export interface GeoHealthSummary {
  reddit: {
    total_mentions: number;
    avg_sentiment: number;
    top_risks: RiskItem[];
    sod_vs_competitors: ShareOfDiscussion[];
  };
  rufus: {
    overall_soa: number;
    stability: number;
    top_claims_matched: number;
    risk_surfacing_count: number;
  };
  bridge: {
    topic_coverage_percent: number;
    risks_with_counter_content: number;
    total_risks: number;
    action_items: ActionItem[];
  };
}

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "risk_fix" | "content_gap" | "claim_update" | "probe_needed";
  title: string;
  description: string;
  source: "reddit" | "rufus" | "bridge";
  created_at: string;
}

// ── AI Search Visibility (mirrors backend Pydantic schemas) ──

export interface VisQueryCreate {
  query_text: string;
  category?: QueryCategory;
  priority?: QueryPriority;
  brands?: string[];
}

export interface VisQueryUpdate {
  query_text?: string;
  category?: QueryCategory;
  priority?: QueryPriority;
  brands?: string[];
  is_active?: boolean;
}

export interface VisQueryResponse {
  id: number;
  query_text: string;
  category: QueryCategory;
  priority: QueryPriority;
  brands: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_score: number | null;
}

export interface RankingResponse {
  id: number;
  query_id: number;
  platform: VisPlatform;
  brand: string;
  rank_position: number;
  snippet: string | null;
  source_urls: string[] | null;
  snapshot_id: string | null;
  scraped_at: string;
  pipeline_run_id: number | null;
}

export interface ScoreResponse {
  id: number;
  query_id: number;
  brand: string;
  visibility_score: number;
  competitive_gap: number | null;
  period: ScorePeriod;
  computed_at: string;
}

export interface TrendPoint {
  timestamp: string;
  brand: string;
  avg_rank: number;
  avg_score: number;
  sample_count: number;
}

export interface ComparisonRow {
  query_id: number;
  query_text: string;
  levoit_score: number;
  dyson_score: number;
  coway_score: number;
  honeywell_score: number;
  competitive_gap: number;
}

export interface PipelineRunResponse {
  id: number;
  flow_name: string;
  status: PipelineStatus;
  queries_total: number;
  success_count: number;
  failure_count: number;
  quarantine_count: number;
  cost_usd: number;
  duration_sec: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface SnapshotDoc {
  _id: string;
  query_id: number;
  platform: VisPlatform;
  query_text: string;
  raw_content: string;
  content_hash: string;
  scraped_at: string;
  scrape_duration_ms: number;
  metadata: {
    url: string;
    status_code: number;
    content_length: number;
  };
}
