# PROJECT_INDEX.md

> 快速索引文件 - Claude Code 优先读取此文件以减少 Token 消耗。
> 详细说明请参考各模块的 README 或 CLAUDE.md。

## 项目一句话

Levoit Brand GEO Growth Flywheel: 监控品牌在 AI 搜索中的可见性，追踪引用，自动化内容生产，归因增长。

## 模块地图

| 模块 | 路径 | 职责 | 关键文件 |
|------|------|------|----------|
| **API 入口** | `backend/src/main.py` | FastAPI app | `config.py`, `api/deps.py` |
| **搜索可见性** | `backend/src/services/scraper/` | AI 搜索排名抓取 | `rank_checker.py` |
| **引用追踪** | `backend/src/services/analyzer/` | 引用发现与分析 | `citation_scanner.py` |
| **内容工厂** | `backend/src/services/content/` | AI 内容生成 | `content_generator.py` |
| **归因引擎** | `backend/src/services/attribution/` | 搜索→流量→转化归因 | `attribution_engine.py` |
| **数据管道** | `backend/src/pipelines/` | Prefect DAG | `daily_*.py`, `hourly_*.py` |
| **模式库** | `backend/src/shared/patterns/` | 复用基类 | `scraper_base.py`, `agent_base.py` |
| **前端 Dashboard** | `frontend/src/app/` | Next.js App Router | `dashboard/`, `analytics/` |
| **图表组件** | `frontend/src/components/charts/` | ECharts 复用组件 | `sankey-chart.tsx`, `trend-chart.tsx` |
| **数据库迁移** | `backend/src/db/migrations/` | Alembic | `env.py`, `versions/` |

## 数据流

```
AI 搜索引擎 (ChatGPT, Perplexity, Gemini)
    │ Firecrawl MCP / Playwright MCP
    ▼
MongoDB (原始快照) → Polars (清洗) → PostgreSQL (结构化)
                                     ↓
                              TimescaleDB (时序)
                                     ↓
                              Grafana (可视化)
                              Next.js (Dashboard)
```

## 数据库表前缀

| 前缀 | 模块 | 示例 |
|------|------|------|
| `vis_` | 搜索可见性 | `vis_search_rank`, `vis_query_config` |
| `cite_` | 引用追踪 | `cite_mention`, `cite_source` |
| `content_` | 内容工厂 | `content_article`, `content_keyword` |
| `attr_` | 归因分析 | `attr_touchpoint`, `attr_conversion` |
| `ts_` | TimescaleDB 时序 | `ts_search_rank`, `ts_citation_count` |
| `sys_` | 系统配置 | `sys_config`, `sys_task_log` |

## 快速命令

```bash
# 开发
uv run fastapi dev src/main.py        # 后端
pnpm dev                               # 前端

# 测试
uv run pytest tests/ -x                # 后端测试
pnpm test                              # 前端测试

# 基础设施
docker compose up -d                    # 启动所有服务
docker compose logs -f postgres         # 查看日志
```
