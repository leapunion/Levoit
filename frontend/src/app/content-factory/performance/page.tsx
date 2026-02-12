/**
 * Content Factory — Performance
 *
 * Core question: "How effective is our content in AI search and SEO?"
 * Charts: CitationRateTrend + PerformanceByTypeBubble + ContentROIWaterfall
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  CitationRateTrend,
  PerformanceByTypeBubble,
  ContentROIWaterfall,
} from "@/components/charts/content-factory-charts";

const PERFORMANCE_KPIS = [
  { label: "AI Citations", value: 2847, change: 34.2, format: "number" as const },
  { label: "Avg Rank Lift", value: "+2.3", format: "score" as const },
  { label: "Traffic Impact", value: 48200, change: 28.7, format: "number" as const },
  { label: "Conversion Rate", value: 3.8, change: 0.9, format: "percent" as const },
  { label: "Revenue Impact", value: "$182K", format: "score" as const },
];

export default function ContentPerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Track content effectiveness in AI search and SEO"
        tabs={getTabsForPath("/content-factory/performance")}
      />

      <KpiRow metrics={PERFORMANCE_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="AI Citation Rate by Content Type (30d)"
          subtitle="Buying Guides lead at ~24% citation rate"
        >
          <CitationRateTrend />
        </ChartContainer>

        <ChartContainer
          title="Performance by Content Type"
          subtitle="Bubble size = conversion rate — X: citations, Y: traffic"
        >
          <PerformanceByTypeBubble />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Content ROI Waterfall"
        subtitle="Revenue attribution from content investment to total ROI"
        span="full"
      >
        <ContentROIWaterfall />
      </ChartContainer>
    </div>
  );
}
