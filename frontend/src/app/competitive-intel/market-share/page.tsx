/**
 * Competitive Intel — Market Share
 *
 * Brand share of AI search visibility across platforms and categories.
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  MarketShareDonut,
  ShareByPlatformGroupedBar,
  ShareByProductBar,
} from "@/components/charts/competitive-intel-charts";

const MARKET_SHARE_KPIS = [
  { label: "Levoit SoA", value: 28, change: 3.2, format: "percent" as const },
  { label: "#1 Competitor", value: "Dyson 24%", format: "score" as const },
  { label: "Competitive Gap", value: 4, change: 1.8, format: "percent" as const },
  { label: "Win Rate", value: 62, change: 5.1, format: "percent" as const },
  { label: "Categories Led", value: 2, format: "number" as const },
];

export default function MarketSharePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Share"
        description="Brand share of AI search visibility across platforms and categories"
        tabs={getTabsForPath("/competitive-intel/market-share")}
      />

      <KpiRow metrics={MARKET_SHARE_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="AI Search Market Share"
          subtitle="Overall brand share across all AI platforms"
        >
          <MarketShareDonut />
        </ChartContainer>

        <ChartContainer
          title="Share by AI Platform"
          subtitle="Brand visibility breakdown per platform"
        >
          <ShareByPlatformGroupedBar />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Share by Product Category"
        subtitle="Competitive position across product lines"
        span="full"
      >
        <ShareByProductBar />
      </ChartContainer>
    </div>
  );
}
