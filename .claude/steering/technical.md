# Technical Steering - Levoit Brand GEO

## 架构决策记录 (ADR)

### ADR-001: 选择 Firecrawl 而非 Crawl4AI
- **场景**: AI 搜索结果页面大量 JS 渲染
- **决策**: Firecrawl (已在 Docker MCP 中启用)
- **理由**: ChatGPT/Perplexity 页面需要高级 JS 渲染，Firecrawl 自动检测更稳定

### ADR-002: TimescaleDB 而非独立时序库
- **场景**: 搜索排名趋势存储
- **决策**: TimescaleDB (PostgreSQL 扩展)
- **理由**: 与主库同实例，减少运维复杂度，SQL 兼容

### ADR-003: MongoDB 存储原始快照
- **场景**: AI 搜索结果原始内容存储
- **决策**: MongoDB (Docker MCP 已启用)
- **理由**: 非结构化内容、灵活 schema、便于全文搜索

### ADR-004: Redis Streams 而非 Kafka
- **场景**: 抓取任务队列
- **决策**: Redis Streams
- **理由**: MVP 日消息量 < 10K，Redis 已启用，无需额外基础设施

## 全局能力引用

### 可用的 Slash Commands
| 命令 | 本项目用途 |
|------|-----------|
| `/eng` | 新功能开发 (specify→plan→task→implement) |
| `/bug` | Bug 修复 (analyze→fix→verify) |
| `/ops` | 系统运维 (health→diagnose→heal) |
| `/data.etl` | 数据管道管理 (collect→transform→load) |
| `/data-warehouse` | 数据查询和分析 |

### 可用的 MCP 工具
| 工具 | 本项目用途 |
|------|-----------|
| `firecrawl_scrape` | 抓取单个 AI 搜索结果页 |
| `firecrawl_search` | 搜索品牌相关内容 |
| `browser_navigate` + `browser_snapshot` | 动态 AI 搜索页面交互 |
| `find` / `aggregate` (MongoDB) | 查询原始快照 |
| `set` / `get` / `xadd` (Redis) | 缓存 + 任务队列 |
| `search_dashboards` / `update_dashboard` (Grafana) | 管理监控仪表板 |

### Context7 常用查询
```
FastAPI:     /fastapi/fastapi        → API 路由、依赖注入
Pydantic:    /llmstxt/pydantic_dev   → Model 定义、验证器
Polars:      /pola-rs/polars         → 数据清洗、聚合
TimescaleDB: /timescale/docs         → Hypertable、连续聚合
Prefect:     /prefecthq/prefect      → Flow、Task、Schedule
Next.js:     /vercel/next.js         → App Router、SSR
```
