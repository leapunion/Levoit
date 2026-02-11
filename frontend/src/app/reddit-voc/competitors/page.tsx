/**
 * Reddit VOC — Competitors (R3)
 *
 * KPIs: Share of Discussion, Co-mention patterns, Sentiment comparison
 * Tabs: Share of Discussion | Co-mention Graph | Sentiment Comparison
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { SodTrendsArea, ComentionGraph, TopicBrandHeatmap } from "@/components/charts/voc-charts";

const COMPETITOR_KPIS = [
  { label: "Levoit SoD", value: 34.2, change: 2.8, format: "percent" as const },
  { label: "Dyson SoD", value: 28.1, change: -1.5, format: "percent" as const },
  { label: "Coway SoD", value: 18.3, change: 0.4, format: "percent" as const },
  { label: "Honeywell SoD", value: 12.7, change: -0.8, format: "percent" as const },
  { label: "Blueair SoD", value: 6.7, change: 1.2, format: "percent" as const },
];

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Analysis"
        description="Share of Discussion, co-mention patterns, and sentiment comparison across Reddit"
        tabs={getTabsForPath("/reddit-voc/competitors")}
      />

      <KpiRow metrics={COMPETITOR_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Share of Discussion Trends"
          subtitle="Brand SoD% over time (30d)"
        >
          <SodTrendsArea />
        </ChartContainer>

        <ChartContainer
          title="Co-mention Network"
          subtitle="Which brands are compared together most often"
        >
          <ComentionGraph />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Topic × Brand Matrix"
        subtitle="SoD% breakdown by topic and brand"
        span="full"
      >
        <TopicBrandHeatmap />
      </ChartContainer>
    </div>
  );
}
