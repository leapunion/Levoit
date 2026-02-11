/**
 * Competitive Intel — Trend Analysis
 *
 * Competitive position changes and momentum tracking over time.
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  CompetitiveRankTrend,
  MentionVolumeTrend,
  CompetitiveHeatmap,
} from "@/components/charts/competitive-intel-charts";

const TREND_KPIS = [
  { label: "Rank Trend (7d)", value: -0.3, change: -0.3, format: "score" as const },
  { label: "Mention Growth", value: 18, change: 18, format: "percent" as const },
  { label: "Share Momentum", value: 3.2, change: 3.2, format: "percent" as const },
  { label: "Volatility Index", value: 0.12, format: "score" as const },
  { label: "Emerging Threats", value: 2, format: "number" as const },
];

export default function TrendAnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trend Analysis"
        description="Competitive position changes and momentum tracking over time"
        tabs={getTabsForPath("/competitive-intel/trends")}
      />

      <KpiRow metrics={TREND_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="AI Search Rank Trend (30d)"
          subtitle="Average rank position by brand across AI platforms"
        >
          <CompetitiveRankTrend />
        </ChartContainer>

        <ChartContainer
          title="Mention Volume Trend (30d)"
          subtitle="Brand mention volume across AI search results"
        >
          <MentionVolumeTrend />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Competitive Heatmap"
        subtitle="Brand win rate by query cluster"
        span="full"
      >
        <CompetitiveHeatmap />
      </ChartContainer>
    </div>
  );
}
