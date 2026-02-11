/**
 * Attribution — Conversion Funnel
 *
 * Core question: "How does AI search visibility convert into purchases?"
 * Charts: Attribution Funnel + Platform Conversion + Conversion Trend
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  AttributionFunnel,
  PlatformConversionBar,
  ConversionTrendLine,
} from "@/components/charts/attribution-charts";

const FUNNEL_KPIS = [
  { label: "AI Impressions (7d)", value: 124500, change: 12.3, format: "number" as const },
  { label: "Click-through Rate", value: 14.6, change: 1.8, format: "percent" as const },
  { label: "Sessions from AI", value: 9400, change: 8.2, format: "number" as const },
  { label: "Conversion Rate", value: 3.2, change: 0.4, format: "percent" as const },
  { label: "Attributed Orders", value: 742, change: 15.1, format: "number" as const },
];

export default function ConversionFunnelPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversion Funnel"
        description="AI search impression → traffic → conversion attribution"
        tabs={getTabsForPath("/attribution/funnel")}
      />

      <KpiRow metrics={FUNNEL_KPIS} />

      <ChartContainer
        title="Attribution Funnel"
        subtitle="Full-path conversion from AI impressions to purchases"
        span="full"
      >
        <AttributionFunnel />
      </ChartContainer>

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Conversion by Platform"
          subtitle="Which AI platforms drive highest conversion rates"
        >
          <PlatformConversionBar />
        </ChartContainer>

        <ChartContainer
          title="Conversion Trend (30d)"
          subtitle="Daily conversion rate from AI-attributed sessions"
        >
          <ConversionTrendLine />
        </ChartContainer>
      </div>
    </div>
  );
}
