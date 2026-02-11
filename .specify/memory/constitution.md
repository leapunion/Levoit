# Levoit Brand GEO Growth Flywheel - Constitution

> 项目原则约束文件。所有开发决策必须与此文件一致。

## 不可违反的原则

1. **数据准确性第一**: 搜索排名和引用数据必须可追溯到原始快照，不可篡改或推测
2. **MVP 最小可用**: 不引入 MVP 阶段不需要的工具/框架 (参考全局 Right-Sizing)
3. **品牌安全**: 自动生成内容必须经过质量检查，不得损害 Levoit 品牌形象
4. **抓取合规**: 遵守 robots.txt，限制请求频率，不对目标站点造成压力
5. **成本可控**: 每日 AI API 调用预算上限 $10 (MVP 阶段)，超预算自动降级

## 技术约束

- **单一编排器**: Prefect only, 不混用 Airflow/Celery
- **单一 ORM**: SQLAlchemy 2.0 (async)，不混用 Tortoise/Peewee
- **单一包管理**: Python 用 `uv`, Node 用 `pnpm`
- **单一 CSS**: Tailwind CSS, 不混用 styled-components/CSS modules
- **数据库迁移**: Alembic only，手写 SQL 仅限 TimescaleDB hypertable

## 架构约束

- 后端 API 严格 RESTful，不引入 GraphQL (MVP 无此需求)
- 前端 Dashboard 为内部工具，不需要 i18n (仅英文)
- 所有 MCP 返回数据必须经过 Processing 层过滤后再传给 AI
- 抓取数据保留原始快照 (MongoDB)，结构化数据入 PostgreSQL

## 质量门槛

- 后端测试覆盖率 > 70%
- API 端点必须有集成测试
- 数据管道必须有数据质量检查 (schema 验证 + 空值检查)
- 所有 Pydantic model 必须有 field 级别 description
