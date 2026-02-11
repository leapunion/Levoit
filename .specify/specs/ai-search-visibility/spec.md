# Specification: AI Search Visibility Monitoring

> **Feature**: AI Search Visibility Monitoring
> **Priority**: P0 (Must Have)
> **Status**: Draft
> **Created**: 2026-02-10
> **Author**: /eng specify
> **Constitution Check**: Aligned with all 5 principles

---

## 1. Problem Statement

Levoit has no visibility into how its brand and products appear in AI-powered search engines (ChatGPT, Perplexity, Google AI Overview). Marketing decisions are made without data on AI search performance, while competitors may already be optimizing for generative engine visibility. The brand team needs a systematic way to monitor, measure, and compare AI search rankings.

## 2. Goals

1. **Monitor** Levoit's appearance and ranking position across 3 Tier-1 AI search platforms
2. **Track** ranking changes over time with time-series storage and visualization
3. **Compare** Levoit's AI search performance against 3 direct competitors
4. **Alert** (P1 scope, interface prepared) when significant ranking changes occur

## 3. Non-Goals (Explicit Exclusions)

- Content generation or optimization recommendations (P2)
- Citation source tracking and analysis (P1 - separate feature)
- Multi-brand support (P3)
- E-commerce attribution (P2)
- Automated content publishing (P3)

---

## 4. Requirements (EARS Syntax)

### 4.1 Data Collection

**R-DC-01** (Ubiquitous):
The system shall support monitoring search queries across ChatGPT, Perplexity AI, and Google AI Overview.

**R-DC-02** (Ubiquitous):
The system shall execute search queries against each AI platform at a configurable interval, defaulting to every 6 hours.

**R-DC-03** (Ubiquitous):
The system shall store the raw HTML/markdown response from each search query as an immutable snapshot in MongoDB.

**R-DC-04** (Ubiquitous):
The system shall extract and store the following structured data from each search result:
- Query text
- Platform name
- Timestamp (UTC)
- Brand mentions (Levoit + configured competitors)
- Position/rank of each brand mention (1-based, 0 = not found)
- Response snippet containing the brand mention
- Source URLs cited in the AI response

**R-DC-05** (State-driven):
While a search query is being executed, the system shall mark the query status as `in_progress` and prevent duplicate execution of the same query on the same platform.

**R-DC-06** (Unwanted behavior):
If a search query fails (network error, rate limit, platform unavailable), the system shall retry up to 3 times with exponential backoff (5s, 15s, 45s) and log the failure.

**R-DC-07** (Unwanted behavior):
If all retries fail, the system shall record a `failed` status with error details and continue to the next query without blocking the pipeline.

**R-DC-08** (Constraint - Constitution #4):
The system shall respect a configurable rate limit per platform, defaulting to:
- ChatGPT: max 10 requests/hour
- Perplexity: max 20 requests/hour
- Google AI Overview: max 15 requests/hour

### 4.2 Query Management

**R-QM-01** (Ubiquitous):
The system shall maintain a configurable list of search queries to monitor, categorized by priority (high/medium/low).

**R-QM-02** (Ubiquitous):
The system shall support CRUD operations on monitored queries via REST API.

**R-QM-03** (Ubiquitous):
Each query shall be associated with:
- Query text (e.g., "best air purifier 2026")
- Category (e.g., "product_comparison", "brand_search", "category_search")
- Priority (high/medium/low)
- Target brands to track (default: Levoit + 3 competitors)
- Active/inactive status

**R-QM-04** (Event-driven):
When a new query is added, the system shall execute an immediate first scan within the next scheduled pipeline run.

### 4.3 Ranking Extraction & Scoring

**R-RE-01** (Ubiquitous):
The system shall parse each AI search response and determine the rank position of each tracked brand using the following rules:
- **Position 1**: Brand is the first recommendation or appears in the first paragraph
- **Position 2-5**: Brand appears in subsequent recommendations
- **Position 0**: Brand is not mentioned in the response

**R-RE-02** (Ubiquitous):
The system shall compute an **AI Visibility Score** per brand per query using the formula:
```
visibility_score = Σ (platform_weight × position_score) / num_platforms

platform_weight:
  ChatGPT: 0.4, Perplexity: 0.35, Google AI Overview: 0.25

position_score:
  Position 1: 100, Position 2: 75, Position 3: 50,
  Position 4: 30, Position 5: 15, Not found: 0
```

**R-RE-03** (Ubiquitous):
The system shall store each ranking result as a time-series record in TimescaleDB with fields:
- `timestamp` (UTC, partition key)
- `query_id` (FK)
- `platform` (enum: chatgpt, perplexity, google_ai)
- `brand` (string)
- `rank_position` (integer, 0-10)
- `visibility_score` (float, 0-100)
- `snippet` (text, max 500 chars)
- `snapshot_id` (FK to MongoDB document)

### 4.4 Competitor Comparison

**R-CC-01** (Ubiquitous):
The system shall track the same ranking data for 3 default competitors: Dyson, Coway, Honeywell.

**R-CC-02** (Ubiquitous):
The system shall compute a **Competitive Gap** metric per query:
```
competitive_gap = levoit_visibility_score - max(competitor_scores)
```
Positive = Levoit leads. Negative = competitor leads.

**R-CC-03** (Ubiquitous):
The system shall provide an API endpoint that returns comparative ranking data across all tracked brands for a given query or time range.

### 4.5 REST API

**R-API-01** (Ubiquitous):
The system shall expose the following REST API endpoints under `/api/v1/visibility/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/queries` | List monitored queries (paginated, filterable) |
| POST | `/queries` | Add a new query to monitor |
| GET | `/queries/{id}` | Get query details |
| PUT | `/queries/{id}` | Update query configuration |
| DELETE | `/queries/{id}` | Deactivate a query (soft delete) |
| GET | `/rankings` | Get ranking results (filterable by query, platform, brand, date range) |
| GET | `/rankings/latest` | Get most recent rankings for all queries |
| GET | `/rankings/trends` | Get time-series ranking data for trend charts |
| GET | `/scores` | Get computed visibility scores |
| GET | `/scores/comparison` | Get competitive comparison data |
| GET | `/snapshots/{id}` | Get raw snapshot content |

**R-API-02** (Ubiquitous):
All list endpoints shall support pagination (`page`, `page_size`), sorting (`sort_by`, `sort_order`), and filtering via query parameters.

**R-API-03** (Ubiquitous):
All responses shall follow the project standard format:
```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "page_size": 20 }
}
```

### 4.6 Dashboard (Frontend)

**R-FE-01** (Ubiquitous):
The dashboard shall display a **Visibility Overview** page showing:
- Overall AI Visibility Score for Levoit (aggregated across all queries)
- Score change vs. previous period (day/week/month selector)
- Top 5 queries where Levoit ranks highest
- Top 5 queries where Levoit has the largest competitive gap (negative)

**R-FE-02** (Ubiquitous):
The dashboard shall display a **Ranking Trends** chart (ECharts line chart) showing:
- X-axis: time (day/week/month granularity)
- Y-axis: rank position (inverted, 1 at top)
- One line per tracked brand
- Query selector dropdown

**R-FE-03** (Ubiquitous):
The dashboard shall display a **Competitor Comparison** table showing:
- Rows: monitored queries
- Columns: Levoit rank, Dyson rank, Coway rank, Honeywell rank, Gap
- Color coding: green (Levoit leads), red (competitor leads), gray (not found)

**R-FE-04** (Ubiquitous):
The dashboard shall display a **Platform Breakdown** view showing per-platform ranking for a selected query (ChatGPT vs Perplexity vs Google AI Overview).

**R-FE-05** (Event-driven):
When the user selects a specific ranking cell, the dashboard shall display the raw AI response snippet with the brand mention highlighted.

### 4.7 Data Pipeline

**R-PL-01** (Ubiquitous):
The system shall implement a Prefect flow `hourly_rank_check` that:
1. Reads active high-priority queries from PostgreSQL
2. Dispatches scrape tasks via Redis Streams
3. Collects results and stores raw snapshots in MongoDB
4. Extracts rankings and stores in PostgreSQL + TimescaleDB
5. Updates computed visibility scores

**R-PL-02** (Ubiquitous):
The system shall implement a Prefect flow `daily_full_scan` that:
1. Executes all active queries (high + medium + low priority)
2. Computes daily aggregated visibility scores
3. Computes competitive gap metrics

**R-PL-03** (Constraint - Constitution #5):
The system shall track AI API token usage per pipeline run and halt if daily cumulative cost exceeds $10.

### 4.8 Data Quality

**R-DQ-01** (Ubiquitous):
The system shall validate each scraped result against a Pydantic schema before storage.

**R-DQ-02** (Unwanted behavior):
If a scraped result fails schema validation, the system shall log the violation, store the raw content in a `quarantine` collection, and skip the record.

**R-DQ-03** (Ubiquitous):
The system shall record data quality metrics per pipeline run: success_count, failure_count, quarantine_count, total_duration_seconds.

---

## 5. Data Model Summary

```
PostgreSQL (levoit_geo):
├── vis_query          → Monitored search queries
├── vis_brand          → Tracked brands (Levoit + competitors)
├── vis_ranking        → Individual ranking results per query/platform/brand
├── vis_score          → Computed visibility scores (aggregated)
└── vis_pipeline_run   → Pipeline execution log

TimescaleDB (levoit_ts):
├── ts_search_rank     → Hypertable: ranking time-series
└── ts_visibility_score → Hypertable: score time-series

MongoDB (levoit_geo):
├── snapshots          → Raw AI search response snapshots
└── quarantine         → Failed validation records
```

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Pipeline latency (per query) | < 30 seconds |
| API response time (list endpoints) | < 500ms (p95) |
| API response time (trend queries) | < 2 seconds (p95) |
| Data freshness (high priority queries) | < 6 hours |
| Data retention (raw snapshots) | 90 days |
| Data retention (time-series) | 1 year |
| Concurrent pipeline queries | Max 3 per platform |

## 7. Assumptions

1. AI search platforms do not require authentication for basic search queries
2. Firecrawl MCP can render ChatGPT/Perplexity/Google AI Overview results
3. AI platform responses are deterministic enough for meaningful ranking comparison (acknowledged variance)
4. MVP handles ~50 monitored queries across 3 platforms = ~150 scrape tasks per cycle
5. Single-user access pattern for MVP dashboard (no concurrent editing)

## 8. Open Questions

1. **Ranking precision**: AI search responses vary per session. Should we average multiple samples per query per cycle, or accept single-sample variance? → Recommend: single sample for MVP, note variance in UI
2. **Platform access method**: Direct web scraping vs API access (where available)? → Recommend: Firecrawl scraping for all 3 (unified approach)
3. **Authentication wall**: ChatGPT may require login for some features. Scope to public/shared link responses only? → Recommend: yes, public only for MVP

---

## 9. Constitution Compliance Check

| Principle | Compliance | Notes |
|-----------|------------|-------|
| #1 Data accuracy | ✅ | Raw snapshots preserved in MongoDB, all rankings traceable to snapshot_id |
| #2 MVP minimal | ✅ | Only P0 scope, no content generation or attribution |
| #3 Brand safety | ✅ N/A | No content generation in this feature |
| #4 Scraping compliance | ✅ | Rate limits per platform, configurable |
| #5 Cost control | ✅ | Pipeline cost tracking, $10/day halt |

---

*Specification generated by `/eng specify`. Next step: `/eng plan` to generate design document.*
