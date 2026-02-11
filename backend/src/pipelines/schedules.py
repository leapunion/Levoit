"""Prefect deployment schedule definitions.

Schedule constants and serve() function for running both pipelines.

Usage (production):
    python -m src.pipelines.schedules
"""

from src.pipelines.daily_full_scan import daily_full_scan
from src.pipelines.hourly_rank_check import hourly_rank_check

# Every 6 hours (high-priority queries)
HOURLY_CRON = "0 */6 * * *"

# Daily at 2 AM UTC (all queries + daily aggregation)
DAILY_CRON = "0 2 * * *"


async def serve_all() -> None:
    """Serve both flows with their schedules.

    Blocks indefinitely — intended for production deployment.
    Requires a running Prefect server.
    """
    from prefect import serve as prefect_serve

    hourly_deployment = hourly_rank_check.to_deployment(
        name="hourly-rank-check",
        cron=HOURLY_CRON,
    )
    daily_deployment = daily_full_scan.to_deployment(
        name="daily-full-scan",
        cron=DAILY_CRON,
    )

    await prefect_serve(hourly_deployment, daily_deployment)


if __name__ == "__main__":
    import asyncio
    asyncio.run(serve_all())
