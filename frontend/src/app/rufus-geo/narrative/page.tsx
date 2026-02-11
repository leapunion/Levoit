/**
 * Rufus GEO — Narrative Analysis (A2 Narrative)
 *
 * How Rufus talks about Levoit: claim accuracy, competitor framing, risk surfacing
 * Tabs: Claim Match | Comparator Sets | Risk Surfacing
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { ClaimMatchDonut, ComparatorGraph, RiskSurfacingTable } from "@/components/charts/rufus-charts";

const NARRATIVE_KPIS = [
  { label: "Claim Match Score", value: 73, change: 5.4, format: "percent" as const },
  { label: "Correct Claims", value: 31, format: "number" as const },
  { label: "Incorrect/Outdated", value: 4, format: "number" as const },
  { label: "Competitor Sets", value: 8, format: "number" as const },
  { label: "Risks Surfaced", value: 12, format: "number" as const },
];

export default function NarrativeAnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Narrative Analysis"
        description="How Rufus describes Levoit — claim accuracy, competitor framing, and risk emphasis"
        tabs={getTabsForPath("/rufus-geo/narrative")}
        showIntentFilter
      />

      <KpiRow metrics={NARRATIVE_KPIS} />

      {/* Claim match detail + Comparator sets */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Claim Match Analysis"
          subtitle="Are Rufus citations of Levoit accurate?"
        >
          <ClaimMatchDonut />
        </ChartContainer>

        <ChartContainer
          title="Comparator Sets"
          subtitle="Which competitors is Levoit grouped with by Rufus"
        >
          <ComparatorGraph />
        </ChartContainer>
      </div>

      {/* Risk surfacing tracker */}
      <ChartContainer
        title="Risk Surfacing Tracker"
        subtitle="Which negative statements Rufus includes about Levoit"
        span="full"
      >
        <RiskSurfacingTable />
      </ChartContainer>
    </div>
  );
}
