/**
 * Rufus GEO — Share of Answer (A2 Presence)
 *
 * Core question: "Is Levoit present in Rufus answers, and how stable?"
 * Tabs: Overview | By QueryCluster | Stability Tracking
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { SoaTrendLine, StabilityHeatmap, SoaByClusterBar } from "@/components/charts/rufus-charts";

const SOA_KPIS = [
  { label: "Overall SoA", value: 41.5, change: -1.3, format: "percent" as const },
  { label: "Appearance Stability", value: 0.82, change: 2.1, format: "score" as const },
  { label: "Claim Match Rate", value: 73, change: 5.4, format: "percent" as const },
  { label: "Risk Surfacing", value: 8, change: -2, format: "number" as const },
  { label: "Probes Run (7d)", value: 156, format: "number" as const },
];

export default function ShareOfAnswerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Share of Answer"
        description="Levoit's presence and stability in Amazon Rufus AI recommendations"
        tabs={getTabsForPath("/rufus-geo/share-of-answer")}
        showIntentFilter
      />

      <KpiRow metrics={SOA_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="SoA Trend (30d)"
          subtitle="Levoit vs top competitors in Rufus answers"
        >
          <SoaTrendLine />
        </ChartContainer>

        <ChartContainer
          title="Appearance Stability"
          subtitle="How consistently Levoit appears across repeated probes"
        >
          <StabilityHeatmap />
        </ChartContainer>
      </div>

      <ChartContainer
        title="SoA by Query Cluster"
        subtitle="Which question types Levoit wins or loses"
        span="full"
      >
        <SoaByClusterBar />
      </ChartContainer>
    </div>
  );
}
