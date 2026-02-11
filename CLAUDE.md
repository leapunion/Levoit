# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **项目**: Levoit Brand GEO Growth Flywheel
> **类型**: 混合智能型 (传统业务 + AI 增强)
> **阶段**: MVP
> **全局继承**: `~/.claude/CLAUDE.md` v3.2

---

## 一、项目概述

Levoit 品牌 GEO (Generative Engine Optimization) 增长飞轮平台，监控品牌在 AI 搜索引擎中的可见性，追踪引用来源，自动化内容生产，实现增长归因闭环。

### 核心模块

```
Levoit Brand GEO Growth Flywheel
├── AI Search Visibility   → 监控 Levoit 在 ChatGPT/Perplexity/Gemini 中的搜索排名
├── AI Citation Tracking   → 追踪 AI 生成内容中对 Levoit 产品的引用和推荐
├── Content Factory        → 基于 VOC + 竞品分析自动生成 SEO/GEO 优化内容
├── Growth Attribution     → AI 搜索 → 流量 → 转化的全链路归因
└── Competitive Intel      → 竞品在 AI 搜索中的表现对比
```

### 产品线覆盖

- **Air Purifiers** (Core 300, Core 400S, Core 600S, Vital 200S, EverestAir)
- **Humidifiers** (Classic 300S, LV600S, OasisMist 1000S)
- **空气循环扇, 塔扇** 等新品类

---

## 二、技术栈

### 核心选型 (Right-Sizing: MVP 小规模)

| 层 | 选型 | 理由 |
|----|------|------|
| **后端 API** | FastAPI + Python 3.12 | 异步高性能，Pydantic 原生 |
| **前端** | Next.js 15 + React 19 | SSR/ISR，Dashboard 展示 |
| **主数据库** | PostgreSQL 17 | 关系数据 + JSON 灵活 |
| **时序数据** | TimescaleDB | 搜索排名、引用趋势时序存储 |
| **文档存储** | MongoDB | 原始抓取内容、非结构化数据 |
| **缓存/队列** | Redis | 缓存 + Streams 消息队列 |
| **数据处理** | Polars + DuckDB | 本地 OLAP，MVP 够用 |
| **编排** | Prefect | Python-native DAG，轻量 |
| **AI** | Claude Agent SDK + Anthropic API | 内容生成、智能分析 |
| **监控** | Grafana + Prometheus | 系统监控 + 业务指标 |
| **网页抓取** | Firecrawl (Docker MCP) | JS 渲染，结构化提取 |

### 不选什么 (过度工程防护)

```
❌ Kafka        → Redis Streams 够用 (MVP 日消息量 < 10K)
❌ Elasticsearch → PostgreSQL FTS 够用 (MVP 文档量 < 100K)
❌ PySpark      → Polars 够用 (MVP 日数据量 < 100MB)
❌ Airflow      → Prefect 更轻量
❌ Kubernetes   → Docker Compose 够用 (单机部署)
```

---

## 三、项目结构

```
levoit/
├── CLAUDE.md                    # 本文件
├── PROJECT_INDEX.md             # 快速索引 (减少 token)
├── docker-compose.yml           # 本地开发环境
├── .env.example                 # 环境变量模板
│
├── backend/                     # FastAPI 后端
│   ├── pyproject.toml           # uv 包管理
│   ├── src/
│   │   ├── main.py              # FastAPI app 入口
│   │   ├── config.py            # Pydantic Settings
│   │   ├── models/              # SQLAlchemy + Pydantic models
│   │   ├── api/                 # API routes
│   │   │   ├── v1/
│   │   │   │   ├── visibility.py   # 搜索可见性 API
│   │   │   │   ├── citations.py    # 引用追踪 API
│   │   │   │   ├── content.py      # 内容工厂 API
│   │   │   │   └── analytics.py    # 归因分析 API
│   │   │   └── deps.py             # 依赖注入
│   │   ├── services/            # 业务逻辑
│   │   │   ├── scraper/         # AI 搜索抓取
│   │   │   ├── analyzer/        # 引用分析
│   │   │   ├── content/         # 内容生成
│   │   │   └── attribution/     # 归因引擎
│   │   ├── pipelines/           # Prefect 数据管道
│   │   ├── shared/              # 共享模块
│   │   │   ├── patterns/        # 复用模式库
│   │   │   └── utils/           # 工具函数
│   │   └── db/                  # 数据库迁移
│   │       └── migrations/      # Alembic 迁移
│   └── tests/
│
├── frontend/                    # Next.js 前端
│   ├── package.json
│   ├── src/
│   │   ├── app/                 # App Router
│   │   ├── components/
│   │   │   ├── charts/          # ECharts 图表组件
│   │   │   └── ui/              # 通用 UI 组件
│   │   └── lib/                 # 工具库
│   └── tests/
│
├── .claude/                     # Claude Code 配置
│   ├── mcp_config.json          # 项目级 MCP
│   └── steering/                # 指导文件
│       ├── product.md           # 产品决策指引
│       └── technical.md         # 技术决策指引
│
└── .specify/                    # 规范驱动
    ├── memory/
    │   └── constitution.md      # 项目原则
    └── specs/                   # 特性规范
```

---

## 四、开发命令

### 环境设置

```bash
# 后端 (Python + uv)
cd backend && uv sync
uv run alembic upgrade head          # 数据库迁移

# 前端 (Node + pnpm)
cd frontend && pnpm install

# 基础设施
docker compose up -d                  # PostgreSQL + TimescaleDB + Redis + MongoDB
```

### 日常开发

```bash
# 后端
uv run fastapi dev src/main.py                    # 开发服务器 (hot reload)
uv run pytest tests/ -x                           # 运行测试
uv run pytest tests/test_visibility.py::test_name  # 单个测试
uv run ruff check src/                            # Lint
uv run ruff format src/                           # Format
uv run mypy src/                                  # 类型检查

# 前端
pnpm dev                              # Next.js 开发服务器
pnpm test                             # 运行测试
pnpm lint                             # ESLint
pnpm build                            # 生产构建

# 数据管道
uv run python -m src.pipelines.daily   # 手动触发日常管道
```

---

## 五、MCP 连接配置

### Docker MCP 服务器 (全量7个)

| 服务器 | 项目用途 | 连接地址 |
|--------|----------|----------|
| **firecrawl** | 抓取 AI 搜索结果、竞品页面 | `host.docker.internal:3002` |
| **mongodb** | 存储原始抓取内容、AI 对话快照 | `host.docker.internal:27018` / db: `levoit_geo` |
| **redis** | 抓取任务队列、结果缓存、限流 | `host.docker.internal:6382` / db: 2 |
| **grafana** | 搜索排名趋势、引用频率仪表板 | `host.docker.internal:3030` |
| **playwright** | 动态 AI 搜索页面交互、截图 | 无需配置 |
| **context7** | 查询 FastAPI/Next.js/Polars 最新文档 | 无需配置 |
| **dockerhub** | 镜像管理 (部署阶段) | 已全局配置 |

### 项目数据库

```
PostgreSQL:    localhost:5432 / levoit_geo     (主业务数据)
TimescaleDB:   localhost:5432 / levoit_ts      (时序数据，同实例不同库)
MongoDB:       localhost:27018 / levoit_geo    (文档数据)
Redis:         localhost:6382 / db:2           (缓存+队列)
```

---

## 六、架构约定

### API 设计

- RESTful，版本前缀 `/api/v1/`
- 响应格式: `{ "data": ..., "meta": { "total", "page" } }`
- 错误格式: `{ "error": { "code", "message", "detail" } }`
- 认证: JWT Bearer Token (后续阶段)

### 数据模型命名

- Python models: `snake_case` (SQLAlchemy)
- API schemas: `CamelCase` (Pydantic, alias_generator)
- 数据库表: `snake_case`，前缀区分模块 (`vis_`, `cite_`, `content_`, `attr_`)
- TimescaleDB hypertable: `ts_` 前缀 (`ts_search_rank`, `ts_citation_count`)

### 数据管道

```
抓取频率:
├── AI 搜索排名:   每 6 小时 (ChatGPT/Perplexity/Gemini)
├── 引用追踪:      每日 1 次 (全网扫描)
├── 竞品监控:      每日 1 次
└── 内容生成:      按需触发 (VOC 变化时)

管道命名: {频率}_{模块}_{动作}
  例: daily_citation_scan, hourly_rank_check
```

### 五层架构映射

```
智能层:   Claude Agent → 内容生成、引用语义分析、归因推理
编排层:   Prefect      → daily_citation_scan, hourly_rank_check
执行层:   Python       → API handlers, 业务逻辑
处理层:   Polars       → 抓取结果清洗、Token 优化 (MCP 返回值过滤)
基础设施: MCP          → Firecrawl 抓取、Redis 缓存、MongoDB 存储
```

---

## 七、Levoit 领域知识

### 关键 AI 搜索查询 (监控目标)

```
高优先级:
- "best air purifier 2025/2026"
- "levoit vs dyson air purifier"
- "best humidifier for bedroom"
- "levoit core 300 review"

中优先级:
- "air purifier for allergies"
- "smart home air quality"
- "best air purifier under $100"
```

### 竞品品牌

```
直接竞品: Dyson, Coway, Honeywell, Blueair, Winix
间接竞品: Xiaomi, Samsung, LG (智能家居生态)
```

### 监控的 AI 平台

```
Tier 1 (必须): ChatGPT, Perplexity, Google AI Overview
Tier 2 (次要): Claude.ai, Gemini, Copilot (Bing)
Tier 3 (观察): 垂直搜索 (Wirecutter AI, Reddit AI)
```
