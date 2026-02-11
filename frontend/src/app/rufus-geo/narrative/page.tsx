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
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Donut — Correct / Partially correct / Incorrect / Outdated */}
            Donut: Claim accuracy breakdown
          </div>
        </ChartContainer>

        <ChartContainer
          title="Comparator Sets"
          subtitle="Which competitors is Levoit grouped with by Rufus"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Graph — center=Levoit, edges to competitors, thickness=frequency */}
            Network: Levoit at center, competitor co-appearance frequency
          </div>
        </ChartContainer>
      </div>

      {/* Risk surfacing tracker */}
      <ChartContainer
        title="Risk Surfacing Tracker"
        subtitle="Which negative statements Rufus includes about Levoit"
        span="full"
      >
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          {/* Table: Risk statement | Frequency | Source (Reddit/Review/Unknown) | Counter status */}
          Table: Risk statements surfaced by Rufus — frequency, origin, and counter-content status
        </div>
      </ChartContainer>
    </div>
  );
}
