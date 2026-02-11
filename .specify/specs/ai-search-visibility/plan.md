# Design Plan: AI Search Visibility Monitoring

> **Spec**: [spec.md](./spec.md)
> **Status**: Draft
> **Created**: 2026-02-10
> **Architecture**: 五层执行模型 (智能→编排→执行→处理→基础设施)

---

## 1. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  Overview     │ │  Trends      │ │  Comparison  │ │  Platform  │ │
│  │  Page         │ │  Chart       │ │  Table       │ │  Breakdown │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘ │
│         └────────────────┴────────────────┴───────────────┘        │
│                              │ fetch                                │
└──────────────────────────────┼──────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Backend API (FastAPI)                             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  /api/v1/visibility/                                         │    │
│  │  ├── queries.*       → QueryRouter    → QueryService         │    │
│  │  ├── rankings.*      → RankingRouter  → RankingService       │    │
│  │  ├── scores.*        → ScoreRouter    → ScoreService         │    │
│  │  └── snapshots.*     → SnapshotRouter → SnapshotService      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────┼──────────────────────────────────┐    │
│  │  Services Layer           │                                   │    │
│  │  ├── ScrapeOrchestrator   │  调度抓取任务，管理并发           │    │
│  │  ├── RankExtractor        │  从原始内容提取品牌排名           │    │
│  │  ├── ScoreCalculator      │  计算 Visibility Score            │    │
│  │  └── CostTracker          │  追踪 API 调用成本                │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  TimescaleDB │ │   MongoDB    │
│  (结构化)     │ │  (时序)       │ │  (快照)      │
└──────────────┘ └──────────────┘ └──────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Pipeline Layer (Prefect)                         │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │ hourly_rank_check│  │ daily_full_scan  │                         │
│  │ (高优先级 queries)│  │ (全量 queries)    │                         │
│  └────────┬─────────┘  └────────┬─────────┘                         │
│           └─────────┬───────────┘                                    │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Task Chain:                                                  │    │
│  │  fetch_queries → dispatch_scrapes → collect_results →         │    │
│  │  extract_rankings → compute_scores → record_metrics           │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────┐                ┌──────────────┐
│    Redis     │                │  Firecrawl   │
│  (队列+缓存) │                │  (MCP 抓取)   │
└──────────────┘                └──────────────┘
```

## 2. Data Flow

```
                    ┌─────────────────────┐
                    │  Prefect Scheduler   │
                    │  (cron: 0 */6 * * *)│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  1. Fetch Queries    │
                    │  (PostgreSQL)        │
                    │  SELECT active HIGH  │
                    └──────────┬──────────┘
                               │ List[VisQuery]
                    ┌──────────▼──────────┐
                    │  2. Dispatch Scrapes │
                    │  (Redis Streams)     │
                    │  XADD per query×plat │
                    └──────────┬──────────┘
                               │ stream messages
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ Scrape     │  │ Scrape     │  │ Scrape     │
     │ ChatGPT    │  │ Perplexity │  │ Google AI  │
     │ (Firecrawl)│  │ (Firecrawl)│  │ (Firecrawl)│
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │ raw html       │               │
           └────────────────┼───────────────┘
                    ┌───────▼──────────┐
                    │ 3. Store Snapshot │
                    │ (MongoDB)         │
                    │ → snapshot_id     │
                    └───────┬──────────┘
                    ┌───────▼──────────────┐
                    │ 4. Processing Layer   │
                    │ (Polars/Python)       │
                    │ - Clean HTML → text   │
                    │ - Validate schema     │
                    │ - Extract brand names │
                    │ → quarantine if fail  │
                    └───────┬──────────────┘
                    ┌───────▼──────────────┐
                    │ 5. Extract Rankings   │
                    │ (RankExtractor)       │
                    │ - Find brand position │
                    │ - Extract snippets    │
                    │ - Map to rank 1-5/0   │
                    └───────┬──────────────┘
                    ┌───────▼──────────────┐
                    │ 6. Store Rankings     │
                    │ PostgreSQL: vis_rank  │
                    │ TimescaleDB: ts_*     │
                    └───────┬──────────────┘
                    ┌───────▼──────────────┐
                    │ 7. Compute Scores     │
                    │ (ScoreCalculator)     │
                    │ - Visibility Score    │
                    │ - Competitive Gap     │
                    └───────┬──────────────┘
                    ┌───────▼──────────────┐
                    │ 8. Record Metrics     │
                    │ vis_pipeline_run      │
                    │ success/fail/duration │
                    └──────────────────────┘
```

## 3. Database Schema

### 3.1 PostgreSQL — `levoit_geo`

```sql
-- 监控查询配置
CREATE TABLE vis_query (
    id            SERIAL PRIMARY KEY,
    query_text    VARCHAR(500) NOT NULL,
    category      VARCHAR(50)  NOT NULL DEFAULT 'general',
        -- ENUM: product_comparison, brand_search, category_search, general
    priority      VARCHAR(10)  NOT NULL DEFAULT 'medium',
        -- ENUM: high, medium, low
    brands        JSONB        NOT NULL DEFAULT '["Levoit","Dyson","Coway","Honeywell"]',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vis_query_active_priority ON vis_query(is_active, priority);

-- 跟踪品牌
CREATE TABLE vis_brand (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    is_primary    BOOLEAN      NOT NULL DEFAULT FALSE,  -- Levoit = TRUE
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 单次排名结果 (每次抓取/每个平台/每个品牌一条记录)
CREATE TABLE vis_ranking (
    id            BIGSERIAL    PRIMARY KEY,
    query_id      INTEGER      NOT NULL REFERENCES vis_query(id),
    platform      VARCHAR(20)  NOT NULL,
        -- ENUM: chatgpt, perplexity, google_ai
    brand         VARCHAR(100) NOT NULL,
    rank_position INTEGER      NOT NULL DEFAULT 0,  -- 0 = not found, 1-5
    snippet       TEXT,
    source_urls   JSONB        DEFAULT '[]',
    snapshot_id   VARCHAR(24),  -- MongoDB ObjectId reference
    scraped_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    pipeline_run_id INTEGER
);

CREATE INDEX idx_vis_ranking_query_time ON vis_ranking(query_id, scraped_at DESC);
CREATE INDEX idx_vis_ranking_brand_time ON vis_ranking(brand, scraped_at DESC);

-- 聚合可见性分数
CREATE TABLE vis_score (
    id            BIGSERIAL    PRIMARY KEY,
    query_id      INTEGER      NOT NULL REFERENCES vis_query(id),
    brand         VARCHAR(100) NOT NULL,
    visibility_score FLOAT     NOT NULL DEFAULT 0,   -- 0-100
    competitive_gap  FLOAT,                           -- positive=lead, negative=trail
    period        VARCHAR(10)  NOT NULL DEFAULT 'raw',
        -- ENUM: raw, daily, weekly, monthly
    computed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vis_score_query_brand ON vis_score(query_id, brand, computed_at DESC);

-- 管道运行日志
CREATE TABLE vis_pipeline_run (
    id            SERIAL       PRIMARY KEY,
    flow_name     VARCHAR(50)  NOT NULL,  -- hourly_rank_check, daily_full_scan
    status        VARCHAR(20)  NOT NULL DEFAULT 'running',
        -- ENUM: running, completed, failed, cost_halted
    queries_total INTEGER      NOT NULL DEFAULT 0,
    success_count INTEGER      NOT NULL DEFAULT 0,
    failure_count INTEGER      NOT NULL DEFAULT 0,
    quarantine_count INTEGER   NOT NULL DEFAULT 0,
    cost_usd      FLOAT        NOT NULL DEFAULT 0,
    duration_sec  FLOAT,
    error_detail  TEXT,
    started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);
```

### 3.2 TimescaleDB — `levoit_ts`

```sql
-- 搜索排名时序表
CREATE TABLE ts_search_rank (
    time          TIMESTAMPTZ  NOT NULL,
    query_id      INTEGER      NOT NULL,
    platform      VARCHAR(20)  NOT NULL,
    brand         VARCHAR(100) NOT NULL,
    rank_position INTEGER      NOT NULL DEFAULT 0,
    visibility_score FLOAT     NOT NULL DEFAULT 0
);

SELECT create_hypertable('ts_search_rank', 'time');
CREATE INDEX idx_ts_rank_query ON ts_search_rank(query_id, time DESC);

-- 连续聚合: 每日平均排名
CREATE MATERIALIZED VIEW ts_daily_rank
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS day,
    query_id,
    brand,
    AVG(rank_position)     AS avg_rank,
    AVG(visibility_score)  AS avg_score,
    COUNT(*)               AS sample_count
FROM ts_search_rank
GROUP BY day, query_id, brand
WITH NO DATA;

SELECT add_continuous_aggregate_policy('ts_daily_rank',
    start_offset  => INTERVAL '3 days',
    end_offset    => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- 数据保留策略: 原始数据 1 年
SELECT add_retention_policy('ts_search_rank', INTERVAL '1 year');
```

### 3.3 MongoDB — `levoit_geo`

```javascript
// snapshots collection
{
    _id: ObjectId,
    query_id: Number,          // FK to PostgreSQL vis_query.id
    platform: String,          // "chatgpt" | "perplexity" | "google_ai"
    query_text: String,        // denormalized for easy lookup
    raw_content: String,       // full HTML/markdown response
    content_hash: String,      // SHA-256 for dedup detection
    scraped_at: ISODate,
    scrape_duration_ms: Number,
    metadata: {
        url: String,
        status_code: Number,
        content_length: Number
    }
}

// Index: TTL 90 days
db.snapshots.createIndex({ "scraped_at": 1 }, { expireAfterSeconds: 7776000 })
db.snapshots.createIndex({ "query_id": 1, "platform": 1, "scraped_at": -1 })

// quarantine collection
{
    _id: ObjectId,
    source: String,            // "scrape" | "extraction"
    raw_content: String,
    error_type: String,
    error_detail: String,
    query_id: Number,
    platform: String,
    created_at: ISODate
}

db.quarantine.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 }) // 30 days
```

## 4. Key Component Design

### 4.1 Platform Scrapers (Strategy Pattern)

```
backend/src/services/scraper/
├── __init__.py
├── base.py              # AbstractPlatformScraper
├── chatgpt.py           # ChatGPTScraper(AbstractPlatformScraper)
├── perplexity.py        # PerplexityScraper(AbstractPlatformScraper)
├── google_ai.py         # GoogleAIScraper(AbstractPlatformScraper)
├── orchestrator.py      # ScrapeOrchestrator - 调度 + 并发控制
└── rate_limiter.py      # PerPlatformRateLimiter (Redis-backed)
```

**AbstractPlatformScraper** 接口:

```python
class AbstractPlatformScraper(ABC):
    platform: PlatformEnum

    @abstractmethod
    async def build_search_url(self, query: str) -> str: ...

    @abstractmethod
    async def scrape(self, query: str) -> ScrapeResult: ...

    @abstractmethod
    def extract_brands(self, content: str, brands: list[str]) -> list[BrandMention]: ...
```

**ScrapeOrchestrator** 职责:
- 读取待执行查询列表
- 按平台分组，遵守 rate limit
- 并发执行 (每平台 max 3 concurrent)
- 收集结果，处理失败
- 返回 `list[ScrapeResult]`

### 4.2 Rank Extractor

```
backend/src/services/analyzer/
├── __init__.py
├── rank_extractor.py    # RankExtractor - 品牌位置提取
├── brand_matcher.py     # BrandMatcher - 品牌名称模糊匹配
└── snippet_extractor.py # SnippetExtractor - 上下文截取
```

**排名提取算法**:

```
Input: cleaned_text (from Processing layer), brands: ["Levoit", "Dyson", ...]

1. Split text into semantic sections (paragraphs / numbered lists / headers)
2. For each brand:
   a. Find first occurrence position (paragraph index)
   b. Check if brand is in "recommendation" context (regex patterns):
      - "recommend {brand}"
      - "{brand} is the best"
      - "top pick: {brand}"
      - numbered list: "1. {brand}"
   c. Assign rank based on position:
      - First recommendation section → rank 1
      - Second → rank 2, etc.
      - Mentioned but not recommended → rank 5
      - Not found → rank 0
   d. Extract surrounding ±200 chars as snippet
3. Return list[RankResult(brand, rank, snippet, source_urls)]
```

### 4.3 Score Calculator

```python
# backend/src/services/analyzer/score_calculator.py

PLATFORM_WEIGHTS = {
    "chatgpt": 0.40,
    "perplexity": 0.35,
    "google_ai": 0.25,
}

POSITION_SCORES = {
    1: 100, 2: 75, 3: 50, 4: 30, 5: 15, 0: 0
}

def calculate_visibility_score(
    rankings: list[RankResult],  # same query, same brand, all platforms
) -> float:
    total = 0.0
    platform_count = 0
    for r in rankings:
        weight = PLATFORM_WEIGHTS.get(r.platform, 0)
        score = POSITION_SCORES.get(r.rank_position, 0)
        total += weight * score
        platform_count += 1
    return round(total, 2) if platform_count > 0 else 0.0

def calculate_competitive_gap(
    levoit_score: float,
    competitor_scores: dict[str, float],
) -> float:
    max_competitor = max(competitor_scores.values()) if competitor_scores else 0
    return round(levoit_score - max_competitor, 2)
```

### 4.4 Rate Limiter (Redis-backed)

```python
# backend/src/services/scraper/rate_limiter.py
# Sliding window rate limiter using Redis sorted sets

class PlatformRateLimiter:
    """Per-platform rate limiter backed by Redis ZSET."""

    LIMITS = {
        "chatgpt":    10,   # per hour
        "perplexity": 20,
        "google_ai":  15,
    }

    async def acquire(self, platform: str) -> bool:
        """Returns True if request is allowed, False if rate limited."""
        # ZRANGEBYSCORE key (now - 3600) now → count
        # If count < limit: ZADD key now member → return True
        # Else: return False

    async def wait_and_acquire(self, platform: str, timeout: float = 60) -> bool:
        """Block until rate limit allows, or timeout."""
```

### 4.5 Processing Layer (Polars)

```
backend/src/services/scraper/
├── processing.py         # ScrapeProcessor - 清洗 + 验证
```

**职责** (Constitution: MCP 返回值必须经处理层):

```python
class ScrapeProcessor:
    """Cleans Firecrawl MCP output before passing to extractors."""

    def process(self, raw: FirecrawlResult) -> ProcessedContent:
        # 1. Strip HTML tags, ads, navigation → clean text
        # 2. Validate against Pydantic schema (ScrapeResultSchema)
        # 3. Detect content language (skip non-English for MVP)
        # 4. Truncate to max 10K chars (Token optimization)
        # 5. Hash content for dedup detection
        # Return ProcessedContent or raise QuarantineError
```

**Token 优化效果**: Firecrawl 原始返回 ~20KB → Processing 后 ~3KB (85% reduction)

## 5. API Design Detail

### 5.1 Pydantic Schemas

```python
# backend/src/models/visibility.py

class QueryPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class Platform(str, Enum):
    chatgpt = "chatgpt"
    perplexity = "perplexity"
    google_ai = "google_ai"

class VisQueryCreate(BaseModel):
    query_text: str = Field(..., max_length=500, description="Search query to monitor")
    category: str = Field("general", description="Query category")
    priority: QueryPriority = Field(QueryPriority.medium, description="Monitoring priority")
    brands: list[str] = Field(
        default=["Levoit", "Dyson", "Coway", "Honeywell"],
        description="Brands to track in results"
    )

class VisQueryResponse(BaseModel):
    id: int
    query_text: str
    category: str
    priority: QueryPriority
    brands: list[str]
    is_active: bool
    created_at: datetime
    latest_score: float | None = Field(None, description="Most recent visibility score")

class RankingResponse(BaseModel):
    query_id: int
    query_text: str
    platform: Platform
    brand: str
    rank_position: int = Field(..., ge=0, le=10)
    visibility_score: float = Field(..., ge=0, le=100)
    snippet: str | None
    snapshot_id: str | None
    scraped_at: datetime

class TrendPoint(BaseModel):
    timestamp: datetime
    brand: str
    avg_rank: float
    avg_score: float
    sample_count: int

class ComparisonRow(BaseModel):
    query_id: int
    query_text: str
    levoit_score: float
    dyson_score: float
    coway_score: float
    honeywell_score: float
    competitive_gap: float

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta

class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
```

### 5.2 Key API Endpoints

```
GET /api/v1/visibility/rankings/trends
    ?query_id=5
    &brands=Levoit,Dyson
    &from=2026-01-01
    &to=2026-02-10
    &granularity=daily          # daily|weekly|monthly
    → PaginatedResponse[TrendPoint]
    → Backend: SELECT from ts_daily_rank (continuous aggregate)

GET /api/v1/visibility/scores/comparison
    ?category=product_comparison
    &from=2026-02-01
    &to=2026-02-10
    → PaginatedResponse[ComparisonRow]
    → Backend: vis_score JOIN vis_query, GROUP BY query_id
```

## 6. Frontend Components

```
frontend/src/app/visibility/
├── page.tsx                    # Overview page (R-FE-01)
├── trends/page.tsx             # Trends page (R-FE-02)
├── comparison/page.tsx         # Comparison page (R-FE-03)
└── [queryId]/page.tsx          # Platform breakdown (R-FE-04)

frontend/src/components/charts/
├── visibility-score-card.tsx   # Big number + delta badge
├── rank-trend-chart.tsx        # ECharts line chart (inverted Y)
├── comparison-table.tsx        # Color-coded data table
├── platform-breakdown.tsx      # ECharts bar chart (3 platforms)
└── snippet-modal.tsx           # Raw snippet viewer (R-FE-05)

frontend/src/lib/
├── api.ts                      # API client (fetch wrapper)
└── types.ts                    # TypeScript types (mirror Pydantic)
```

**rank-trend-chart.tsx** 核心 option:

```typescript
const option: Record<string, unknown> = {
  tooltip: { trigger: 'axis' },
  legend: { data: brands },
  xAxis: { type: 'time' },
  yAxis: {
    type: 'value',
    inverse: true,        // Rank 1 at top
    min: 0, max: 6,
    axisLabel: { formatter: (v: number) => v === 0 ? 'N/A' : `#${v}` }
  },
  series: brands.map(brand => ({
    name: brand,
    type: 'line',
    smooth: true,
    data: trendData.filter(t => t.brand === brand).map(t => [t.timestamp, t.avg_rank]),
  })),
}
```

## 7. Pipeline Design (Prefect)

```python
# backend/src/pipelines/hourly_rank_check.py

@flow(name="hourly_rank_check", retries=1, retry_delay_seconds=300)
async def hourly_rank_check():
    """Every 6 hours: scan high-priority queries across all platforms."""

    # Task 1: Get queries
    queries = await fetch_active_queries(priority="high")

    # Task 2: Check cost budget
    budget_ok = await check_daily_budget(max_usd=10.0)
    if not budget_ok:
        await record_pipeline_run(status="cost_halted")
        return

    # Task 3: Create pipeline run record
    run_id = await create_pipeline_run(flow_name="hourly_rank_check", total=len(queries))

    # Task 4: Scrape all (with concurrency control)
    results = await scrape_all_queries.map(
        queries,
        return_state=True,
        concurrency=3
    )

    # Task 5: Process results through pipeline
    for result in results:
        if result.is_completed():
            await process_scrape_result(result.result(), run_id)
        else:
            await record_failure(result, run_id)

    # Task 6: Compute scores
    await compute_all_scores(queries, run_id)

    # Task 7: Finalize
    await finalize_pipeline_run(run_id)
```

**Schedule**:

```python
# backend/src/pipelines/schedules.py

from prefect.deployments import Deployment

hourly_deployment = await Deployment.build_from_flow(
    flow=hourly_rank_check,
    name="hourly-rank-check",
    schedule=CronSchedule(cron="0 */6 * * *"),  # Every 6 hours
)

daily_deployment = await Deployment.build_from_flow(
    flow=daily_full_scan,
    name="daily-full-scan",
    schedule=CronSchedule(cron="0 2 * * *"),     # Daily at 2 AM UTC
)
```

## 8. Redis Usage

```
Key patterns:

# Rate limiter (sorted sets)
ratelimit:{platform}           ZSET  score=timestamp, member=request_id

# Scrape task queue (streams)
stream:scrape_tasks            XADD  {query_id, platform, priority}
stream:scrape_results          XADD  {query_id, platform, snapshot_id, status}

# Cache (strings, TTL 1 hour)
cache:rankings:latest          JSON  latest rankings for overview page
cache:scores:comparison:{cat}  JSON  comparison data per category
cache:score:overview           JSON  aggregated overview metrics

# Dedup (strings, TTL 6 hours)
dedup:{query_id}:{platform}    "1"   prevent duplicate scrapes within cycle
```

## 9. Error Handling Strategy

| Error Type | Handling | Constitution |
|------------|----------|-------------|
| Scrape network error | Retry 3x with backoff → mark failed → continue | #4 compliance |
| Scrape rate limited | Wait via RateLimiter → retry | #4 compliance |
| Schema validation fail | Quarantine to MongoDB → log → skip | #1 data accuracy |
| Cost budget exceeded | Halt pipeline → record status → alert | #5 cost control |
| Platform unavailable | Skip platform → partial results OK → log | Graceful degrade |
| Database connection fail | Prefect retry (flow level) → alert if persistent | - |

## 10. Open Questions Resolution

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Single vs multi-sample | **Single sample** per cycle | MVP simplicity; add `variance_note` to UI |
| 2 | Unified scraping method | **Firecrawl for all** | ADR-001; fallback to Playwright for dynamic pages |
| 3 | Auth wall scope | **Public results only** | MVP scope; auth scraping adds legal/technical risk |

---

*Design plan generated by `/eng plan`. Next step: `/eng task` to generate task decomposition.*
