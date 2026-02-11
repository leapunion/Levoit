/**
 * Attribution — Revenue Impact
 *
 * Core question: "How much revenue is driven by AI search visibility?"
 * Charts: Revenue by Channel + Product Treemap + Revenue Trend
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  RevenueByChannelBar,
  ProductRevenueTreemap,
  RevenueTrendArea,
} from "@/components/charts/attribution-charts";

const REVENUE_KPIS = [
  { label: "Attributed Revenue (30d)", value: "$92.0K", format: "score" as const },
  { label: "Revenue per AI Session", value: "$9.79", format: "score" as const },
  { label: "ROAS", value: 4.2, change: 0.6, format: "score" as const },
  { label: "Avg Order Value", value: "$124", format: "score" as const },
  { label: "Revenue Growth", value: 18.4, change: 18.4, format: "percent" as const },
];

export default function RevenueImpactPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Impact"
        description="Revenue attributed to AI search visibility and citations"
        tabs={getTabsForPath("/attribution/revenue")}
      />

      <KpiRow metrics={REVENUE_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Revenue by AI Channel"
          subtitle="Revenue attributed to each AI search platform"
        >
          <RevenueByChannelBar />
        </ChartContainer>

        <ChartContainer
          title="Revenue by Product"
          subtitle="AI-attributed revenue breakdown by product line"
        >
          <ProductRevenueTreemap />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Cumulative Revenue Trend"
        subtitle="30-day cumulative AI-attributed revenue"
        span="full"
      >
        <RevenueTrendArea />
      </ChartContainer>
    </div>
  );
}
