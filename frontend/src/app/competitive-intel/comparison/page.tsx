/**
 * Competitive Intel — Brand Comparison
 *
 * Head-to-head competitive analysis across key dimensions.
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  BrandRadar,
  HeadToHeadBar,
  SentimentComparisonBar,
} from "@/components/charts/competitive-intel-charts";

const COMPARISON_KPIS = [
  { label: "Levoit Avg Score", value: 77.8, change: 2.4, format: "score" as const },
  { label: "Dyson Avg Score", value: 76.0, change: -0.8, format: "score" as const },
  { label: "Sentiment Advantage", value: 13, change: 4.2, format: "percent" as const },
  { label: "Citation Lead", value: 8, change: 2.1, format: "percent" as const },
  { label: "Query Coverage", value: 74, change: 3.5, format: "percent" as const },
];

export default function BrandComparisonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Comparison"
        description="Head-to-head competitive analysis across key dimensions"
        tabs={getTabsForPath("/competitive-intel/comparison")}
      />

      <KpiRow metrics={COMPARISON_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Multi-Dimension Comparison"
          subtitle="SoA, Sentiment, Citations, Stability, Coverage"
        >
          <BrandRadar />
        </ChartContainer>

        <ChartContainer
          title="Head-to-Head: Levoit vs Dyson"
          subtitle="Win rate across query clusters"
        >
          <HeadToHeadBar />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Sentiment Comparison"
        subtitle="Positive / Neutral / Negative sentiment by brand"
        span="full"
      >
        <SentimentComparisonBar />
      </ChartContainer>
    </div>
  );
}
