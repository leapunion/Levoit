# Tasks: AI Search Visibility Monitoring

> **Spec**: [spec.md](./spec.md)
> **Plan**: [plan.md](./plan.md)
> **Created**: 2026-02-10
> **Total Tasks**: 20
> **Estimated Effort**: ~8-10 working days

---

## Dependency Graph

```
T01 ─────────────────────────────────────────────────────┐
 │ Infrastructure                                         │
T02 ──┐                                                   │
 │     │ Backend foundation                               │
T03 ──┤                                                   │
 │     │ DB models + migrations                           │
 │     │                                                   │
T04 ──┴──────────────────────────────────────────────────┐│
 │ Processing layer                                      ││
T05 ──┐                                                  ││
 │     │ Rate limiter                                    ││
T06 ──┤                                                  ││
 │     │ Platform scrapers                               ││
T07 ──┘                                                  ││
 │ Scrape orchestrator                                   ││
T08 ──┐                                                  ││
 │     │ Rank extractor                                  ││
T09 ──┘                                                  ││
 │ Score calculator                                      ││
T10 ──┐                                                  ││
 │     │ Query CRUD API                                  ││
T11 ──┤                                                  ││
 │     │ Rankings API                                    ││
T12 ──┤                                                  ││
 │     │ Scores + comparison API                         ││
T13 ──┘                                                  ││
 │ Snapshot API                                          ││
T14 ──┐                                                  ││
 │     │ Hourly pipeline                                 ││
T15 ──┘                                                  ││
 │ Daily pipeline                                        ││
T16 ──┐                                                  ││
 │     │ Frontend: API client + types                    │┘
T17 ──┤                                                  │
 │     │ Frontend: Overview page                         │
T18 ──┤                                                  │
 │     │ Frontend: Trends page                           │
T19 ──┤                                                  │
 │     │ Frontend: Comparison + Platform breakdown       │
T20 ──┘                                                  │
 │ Integration testing + seed data                       │
 └───────────────────────────────────────────────────────┘
```

---

## Phase 1: Infrastructure & Foundation

### T01: Project scaffolding and Docker infrastructure
- **Blocked by**: None
- **Blocks**: T02, T03, T16
- **Files**:
  - `docker-compose.yml` — PostgreSQL 17 + TimescaleDB + MongoDB + Redis
  - `backend/pyproject.toml` — Python deps (fastapi, sqlalchemy, motor, redis, prefect, polars, pydantic)
  - `frontend/package.json` — Next.js 15, React 19, echarts, echarts-for-react, tailwindcss
  - `.env.example` — All connection strings
  - `backend/src/__init__.py`, `backend/src/shared/__init__.py`
- **Acceptance**:
  - `docker compose up -d` starts all 4 services healthy
  - `uv sync` installs Python deps without errors
  - `pnpm install` installs Node deps without errors
- **Spec refs**: N/A (foundation)

### T02: FastAPI app skeleton with config and DB connections
- **Blocked by**: T01
- **Blocks**: T03, T04, T05, T10
- **Files**:
  - `backend/src/main.py` — FastAPI app, CORS, lifespan (startup/shutdown)
  - `backend/src/config.py` — Pydantic Settings (DB URLs, Redis, rate limits)
  - `backend/src/db/postgres.py` — async SQLAlchemy engine + sessionmaker
  - `backend/src/db/mongo.py` — Motor async client
  - `backend/src/db/redis.py` — redis.asyncio client
  - `backend/src/api/__init__.py`, `backend/src/api/v1/__init__.py`
  - `backend/src/api/deps.py` — FastAPI dependency injection (get_db, get_mongo, get_redis)
  - `backend/src/shared/pagination.py` — PaginatedResponse, PaginationMeta, paginate()
- **Acceptance**:
  - `uv run fastapi dev src/main.py` starts, `GET /health` returns 200
  - DB connections verified on startup (PostgreSQL, MongoDB, Redis)
  - Pagination helper works with generic types
- **Spec refs**: R-API-02, R-API-03

### T03: Database schema — models, migrations, hypertables
- **Blocked by**: T02
- **Blocks**: T04, T06, T08, T10, T14
- **Files**:
  - `backend/src/models/__init__.py`
  - `backend/src/models/visibility.py` — SQLAlchemy models: VisQuery, VisBrand, VisRanking, VisScore, VisPipelineRun
  - `backend/src/models/schemas.py` — Pydantic schemas: all request/response models from plan Section 5.1
  - `backend/src/models/enums.py` — Platform, QueryPriority, PipelineStatus enums
  - `backend/src/db/migrations/env.py` — Alembic config
  - `backend/src/db/migrations/versions/001_vis_tables.py` — PostgreSQL tables
  - `backend/src/db/migrations/versions/002_timescaledb.py` — Hypertable + continuous aggregate + retention
  - `backend/src/db/init_mongo.py` — MongoDB index creation script
- **Acceptance**:
  - `uv run alembic upgrade head` creates all tables
  - TimescaleDB hypertable `ts_search_rank` created with `time` partition
  - Continuous aggregate `ts_daily_rank` created
  - MongoDB indexes (TTL + compound) created
  - All Pydantic models have field-level `description` (Constitution quality gate)
- **Spec refs**: R-RE-03, plan Section 3

---

## Phase 2: Core Services

### T04: Processing layer — ScrapeProcessor
- **Blocked by**: T02, T03
- **Blocks**: T06, T07
- **Files**:
  - `backend/src/services/scraper/processing.py` — ScrapeProcessor
  - `backend/src/models/scrape_models.py` — ScrapeResult, ProcessedContent, QuarantineError
  - `backend/tests/test_processing.py`
- **Logic**:
  1. Strip HTML → clean text (regex + basic parser, no heavy deps)
  2. Validate against ScrapeResultSchema (Pydantic)
  3. Truncate to 10K chars
  4. SHA-256 content hash for dedup
  5. On validation failure → raise QuarantineError
- **Acceptance**:
  - Processes sample Firecrawl HTML output → clean text
  - Rejects malformed input → QuarantineError with details
  - Output < 10K chars guaranteed
  - Unit tests pass with 3+ fixture samples
- **Spec refs**: R-DQ-01, R-DQ-02, plan Section 4.5

### T05: Redis rate limiter — PlatformRateLimiter
- **Blocked by**: T02
- **Blocks**: T07
- **Files**:
  - `backend/src/services/scraper/rate_limiter.py` — PlatformRateLimiter
  - `backend/tests/test_rate_limiter.py`
- **Logic**:
  - Sliding window via Redis ZSET
  - `acquire(platform)` → bool
  - `wait_and_acquire(platform, timeout)` → bool (poll every 1s)
  - Configurable limits from Settings
- **Acceptance**:
  - Allows requests within limit
  - Blocks requests exceeding limit
  - `wait_and_acquire` retries until window slides
  - Unit tests with mock Redis
- **Spec refs**: R-DC-08, plan Section 4.4

### T06: Platform scrapers — ChatGPT, Perplexity, Google AI
- **Blocked by**: T03, T04
- **Blocks**: T07
- **Files**:
  - `backend/src/services/scraper/__init__.py`
  - `backend/src/services/scraper/base.py` — AbstractPlatformScraper
  - `backend/src/services/scraper/chatgpt.py` — ChatGPTScraper
  - `backend/src/services/scraper/perplexity.py` — PerplexityScraper
  - `backend/src/services/scraper/google_ai.py` — GoogleAIScraper
  - `backend/tests/test_scrapers.py`
- **Logic per scraper**:
  1. `build_search_url(query)` → platform-specific URL
  2. `scrape(query)` → call Firecrawl via httpx, return raw content
  3. Store raw snapshot in MongoDB (immutable)
  4. Pass through ScrapeProcessor
  5. Return ProcessedContent
- **Acceptance**:
  - Each scraper implements AbstractPlatformScraper interface
  - URL building is platform-specific and correct
  - MongoDB snapshot stored with all required fields
  - Retry logic: 3x with exponential backoff
  - Tests with mocked Firecrawl responses (3 fixture files)
- **Spec refs**: R-DC-01 through R-DC-07, plan Section 4.1

### T07: Scrape orchestrator — ScrapeOrchestrator
- **Blocked by**: T04, T05, T06
- **Blocks**: T14
- **Files**:
  - `backend/src/services/scraper/orchestrator.py` — ScrapeOrchestrator
  - `backend/tests/test_orchestrator.py`
- **Logic**:
  1. Accept `list[VisQuery]`
  2. Expand to `query × platform` task list
  3. Check dedup key in Redis (`dedup:{qid}:{platform}`, TTL 6h)
  4. Acquire rate limit before each scrape
  5. Execute with `asyncio.Semaphore(3)` per platform
  6. Collect results: `list[ScrapeResult | ScrapeFailure]`
  7. Record failures, continue on error
- **Acceptance**:
  - Respects rate limits (no burst)
  - Dedup prevents same query+platform within 6h
  - Max 3 concurrent per platform
  - Failures don't block other tasks
  - Integration test with mocked scrapers
- **Spec refs**: R-DC-05, R-DC-06, R-DC-07

### T08: Rank extractor — RankExtractor + BrandMatcher
- **Blocked by**: T03
- **Blocks**: T09, T14
- **Files**:
  - `backend/src/services/analyzer/__init__.py`
  - `backend/src/services/analyzer/rank_extractor.py` — RankExtractor
  - `backend/src/services/analyzer/brand_matcher.py` — BrandMatcher
  - `backend/src/services/analyzer/snippet_extractor.py` — SnippetExtractor
  - `backend/tests/test_rank_extractor.py`
- **Logic**:
  - BrandMatcher: case-insensitive, handles variants ("LEVOIT", "Levoit", "levoit")
  - RankExtractor: section splitting → brand position detection → rank assignment (plan Section 4.2 algorithm)
  - SnippetExtractor: ±200 chars around brand mention
- **Acceptance**:
  - Correctly ranks brands from sample AI search outputs (5+ test fixtures)
  - Handles: brand not found (rank 0), numbered list, narrative mention
  - Snippet extraction preserves word boundaries
  - Edge case: multiple mentions of same brand → use first/highest recommendation
- **Spec refs**: R-RE-01, R-DC-04, plan Section 4.2

### T09: Score calculator — ScoreCalculator + CostTracker
- **Blocked by**: T08
- **Blocks**: T12, T14
- **Files**:
  - `backend/src/services/analyzer/score_calculator.py` — calculate_visibility_score, calculate_competitive_gap
  - `backend/src/services/analyzer/cost_tracker.py` — CostTracker (Redis-backed daily counter)
  - `backend/tests/test_score_calculator.py`
- **Logic**:
  - Visibility Score: weighted sum (plan Section 4.3 formula)
  - Competitive Gap: levoit_score - max(competitor_scores)
  - CostTracker: Redis INCRBYFLOAT on `cost:daily:{date}` key, TTL 48h
- **Acceptance**:
  - Score matches manual calculation for 3+ test cases
  - All platforms present → full score; partial platforms → proportional
  - CostTracker correctly accumulates and checks $10 budget
  - Unit tests cover edge cases (no platforms, all rank 0)
- **Spec refs**: R-RE-02, R-CC-02, R-PL-03, plan Section 4.3

---

## Phase 3: API Endpoints

### T10: Query management CRUD API
- **Blocked by**: T02, T03
- **Blocks**: T14, T16
- **Files**:
  - `backend/src/api/v1/visibility.py` — Router registration
  - `backend/src/api/v1/queries.py` — QueryRouter (5 endpoints)
  - `backend/src/services/query_service.py` — QueryService (CRUD logic)
  - `backend/tests/test_api_queries.py`
- **Endpoints**:
  - `GET /queries` — list (paginated, filter by category/priority/active)
  - `POST /queries` — create
  - `GET /queries/{id}` — get with latest_score
  - `PUT /queries/{id}` — update
  - `DELETE /queries/{id}` — soft delete (is_active=False)
- **Acceptance**:
  - All 5 endpoints return correct response format (`{data, meta}`)
  - Pagination works with `page` and `page_size` params
  - Soft delete sets `is_active=False`, does not remove row
  - Integration tests for each endpoint
- **Spec refs**: R-QM-01 through R-QM-04, R-API-01

### T11: Rankings API — list, latest, trends
- **Blocked by**: T10
- **Blocks**: T16
- **Files**:
  - `backend/src/api/v1/rankings.py` — RankingRouter (3 endpoints)
  - `backend/src/services/ranking_service.py` — RankingService
  - `backend/tests/test_api_rankings.py`
- **Endpoints**:
  - `GET /rankings` — filter by query_id, platform, brand, date range
  - `GET /rankings/latest` — most recent per query (cached 1h in Redis)
  - `GET /rankings/trends` — time-series from `ts_daily_rank` continuous aggregate
- **Acceptance**:
  - Trends endpoint queries TimescaleDB continuous aggregate
  - `granularity` param (daily/weekly/monthly) controls `time_bucket`
  - Latest endpoint uses Redis cache, falls back to DB
  - Response time < 500ms for list, < 2s for trends (with seed data)
- **Spec refs**: R-API-01, R-FE-02

### T12: Scores + comparison API
- **Blocked by**: T09, T10
- **Blocks**: T16
- **Files**:
  - `backend/src/api/v1/scores.py` — ScoreRouter (2 endpoints)
  - `backend/src/services/score_service.py` — ScoreService
  - `backend/tests/test_api_scores.py`
- **Endpoints**:
  - `GET /scores` — visibility scores (filter by query, brand, period)
  - `GET /scores/comparison` — ComparisonRow per query (levoit vs competitors + gap)
- **Acceptance**:
  - Comparison endpoint returns all 4 brand scores per query
  - Competitive gap calculated correctly
  - Filter by category, date range
  - Cached in Redis (1h TTL)
- **Spec refs**: R-CC-03, R-API-01

### T13: Snapshot API
- **Blocked by**: T10
- **Blocks**: T16
- **Files**:
  - `backend/src/api/v1/snapshots.py` — SnapshotRouter (1 endpoint)
  - `backend/src/services/snapshot_service.py` — SnapshotService (MongoDB query)
  - `backend/tests/test_api_snapshots.py`
- **Endpoints**:
  - `GET /snapshots/{id}` — get raw content from MongoDB by ObjectId
- **Acceptance**:
  - Returns raw_content + metadata
  - 404 for non-existent snapshot_id
  - Content returned as-is (no processing)
- **Spec refs**: R-API-01, R-FE-05

---

## Phase 4: Data Pipelines

### T14: Prefect flow — hourly_rank_check
- **Blocked by**: T03, T07, T08, T09, T10
- **Blocks**: T15, T20
- **Files**:
  - `backend/src/pipelines/__init__.py`
  - `backend/src/pipelines/hourly_rank_check.py` — main flow
  - `backend/src/pipelines/tasks.py` — shared Prefect tasks
  - `backend/tests/test_pipeline_hourly.py`
- **Flow logic** (plan Section 7):
  1. `fetch_active_queries(priority="high")`
  2. `check_daily_budget(max_usd=10.0)` → halt if exceeded
  3. `create_pipeline_run(flow_name, total)`
  4. `scrape_all_queries(queries)` via ScrapeOrchestrator
  5. For each result → `extract_rankings` → `store_ranking` → `write_timeseries`
  6. `compute_all_scores(queries, run_id)`
  7. `finalize_pipeline_run(run_id, metrics)`
- **Acceptance**:
  - Flow executes end-to-end with mocked Firecrawl
  - Pipeline run record created with correct metrics
  - Cost budget check works (halts when exceeded)
  - Failed scrapes recorded, don't block pipeline
  - Data quality: quarantined records logged
- **Spec refs**: R-PL-01, R-PL-03, R-DQ-03

### T15: Prefect flow — daily_full_scan + schedules
- **Blocked by**: T14
- **Blocks**: T20
- **Files**:
  - `backend/src/pipelines/daily_full_scan.py` — daily flow
  - `backend/src/pipelines/schedules.py` — CronSchedule definitions
- **Flow logic**:
  1. `fetch_active_queries(priority=None)` — all active queries
  2. Same pipeline as hourly but with full scope
  3. Additional: compute daily aggregated scores per query
  4. Additional: compute competitive gap metrics
- **Acceptance**:
  - Processes all priorities (high + medium + low)
  - Schedule: `0 */6 * * *` (hourly), `0 2 * * *` (daily)
  - Daily aggregates written to vis_score with period="daily"
- **Spec refs**: R-PL-02

---

## Phase 5: Frontend

### T16: Frontend scaffold — API client + TypeScript types
- **Blocked by**: T01, T10
- **Blocks**: T17, T18, T19
- **Files**:
  - `frontend/src/lib/api.ts` — typed fetch wrapper (base URL, error handling, pagination)
  - `frontend/src/lib/types.ts` — TypeScript types mirroring Pydantic schemas
  - `frontend/src/app/layout.tsx` — root layout with nav sidebar
  - `frontend/src/app/page.tsx` — redirect to /visibility
  - `frontend/tailwind.config.ts` — Tailwind config
  - `frontend/next.config.ts` — API proxy to backend
- **Acceptance**:
  - `pnpm dev` starts Next.js, shows layout with sidebar navigation
  - API client handles pagination, errors, typed responses
  - TypeScript types match all Pydantic response models
- **Spec refs**: R-FE-01 (layout)

### T17: Overview page — Visibility Score + top queries
- **Blocked by**: T16
- **Blocks**: T20
- **Files**:
  - `frontend/src/app/visibility/page.tsx` — Overview page
  - `frontend/src/components/charts/visibility-score-card.tsx` — Big number + delta
  - `frontend/src/components/charts/top-queries-list.tsx` — Top 5 best / worst gap
- **UI**:
  - Hero: AI Visibility Score (large number) + change badge (+3.2% ▲ green)
  - Period selector: day / week / month
  - Two columns: "Top Performing Queries" + "Largest Gaps (Action Needed)"
- **Acceptance**:
  - Score card shows aggregated score from `/scores`
  - Delta calculated from previous period
  - Lists show top 5 each, clickable to query detail
- **Spec refs**: R-FE-01

### T18: Trends page — ECharts ranking trend chart
- **Blocked by**: T16
- **Blocks**: T20
- **Files**:
  - `frontend/src/app/visibility/trends/page.tsx` — Trends page
  - `frontend/src/components/charts/rank-trend-chart.tsx` — ECharts line chart
- **UI**:
  - Query selector dropdown (from `/queries`)
  - Time range selector (7d / 30d / 90d / custom)
  - ECharts line chart: X=time, Y=rank (inverted), one line per brand
  - Google VI colors: Levoit=#4285F4, Dyson=#EA4335, Coway=#FBBC04, Honeywell=#34A853
- **Acceptance**:
  - Chart renders with data from `/rankings/trends`
  - Y-axis inverted (rank 1 at top)
  - Rank 0 displayed as "N/A" at bottom
  - Responsive, handles empty data gracefully
- **Spec refs**: R-FE-02, plan Section 6

### T19: Comparison table + Platform breakdown
- **Blocked by**: T16
- **Blocks**: T20
- **Files**:
  - `frontend/src/app/visibility/comparison/page.tsx` — Comparison page
  - `frontend/src/app/visibility/[queryId]/page.tsx` — Platform breakdown page
  - `frontend/src/components/charts/comparison-table.tsx` — Color-coded table
  - `frontend/src/components/charts/platform-breakdown.tsx` — ECharts bar chart
  - `frontend/src/components/charts/snippet-modal.tsx` — Snippet viewer modal
- **UI — Comparison**:
  - Table: rows=queries, columns=Levoit/Dyson/Coway/Honeywell/Gap
  - Color: green cell (brand leads), red cell (competitor leads), gray (not found)
  - Click row → navigate to platform breakdown
- **UI — Platform breakdown**:
  - Bar chart: 3 bars (ChatGPT/Perplexity/Google AI) per brand
  - Click bar → snippet modal with highlighted brand mention
- **Acceptance**:
  - Table color coding works correctly
  - Snippet modal shows raw text with brand highlighted (`<mark>`)
  - Platform breakdown bar chart renders per-platform data
- **Spec refs**: R-FE-03, R-FE-04, R-FE-05

---

## Phase 6: Integration & Polish

### T20: Integration testing + seed data
- **Blocked by**: T14, T15, T17, T18, T19
- **Blocks**: None
- **Files**:
  - `backend/tests/integration/test_full_pipeline.py` — end-to-end pipeline test
  - `backend/tests/integration/test_api_full.py` — API integration tests
  - `backend/src/db/seed.py` — seed script (sample queries + mock ranking data)
  - `backend/tests/fixtures/` — sample Firecrawl responses (3 platforms × 3 queries)
- **Scope**:
  1. Seed 10 sample queries across 3 categories
  2. Seed 4 brands (Levoit + 3 competitors)
  3. Seed 30 days of mock ranking data (for trend testing)
  4. Run full pipeline with mocked Firecrawl → verify data flow
  5. Verify all API endpoints with seeded data
  6. Verify frontend renders with backend data
- **Acceptance**:
  - `uv run python -m src.db.seed` populates all tables
  - Full pipeline flow completes (mocked scraping)
  - All API endpoints return expected data shapes
  - Frontend displays seeded data correctly
  - Data quality metrics recorded in vis_pipeline_run
- **Spec refs**: R-DQ-03, all NFRs

---

## Implementation Order Summary

| Phase | Tasks | Effort | Key Deliverable |
|-------|-------|--------|-----------------|
| **1. Foundation** | T01 → T02 → T03 | ~2 days | Running backend + DB with all tables |
| **2. Core Services** | T04, T05, T06, T07, T08, T09 | ~3 days | Full scrape→extract→score pipeline |
| **3. API** | T10, T11, T12, T13 | ~1.5 days | 11 REST endpoints |
| **4. Pipelines** | T14, T15 | ~1 day | Prefect flows with schedules |
| **5. Frontend** | T16, T17, T18, T19 | ~2 days | 4-page dashboard |
| **6. Integration** | T20 | ~1 day | Verified end-to-end |

## Parallelization Opportunities

```
After T03 completes, these can run in parallel:
├── Track A: T04 → T06 → T07 (Scraping chain)
├── Track B: T05 (Rate limiter, independent)
├── Track C: T08 → T09 (Analysis chain)
└── Track D: T10 (Query API, independent)

After Phase 2+3, these can run in parallel:
├── Track E: T14 → T15 (Pipelines)
└── Track F: T16 → T17, T18, T19 (Frontend, all pages parallel)
```

---

*Task list generated by `/eng task`. Next step: `/eng implement` to begin coding.*
