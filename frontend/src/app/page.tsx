/**
 * GEO Decision Cockpit — Executive Overview (U3)
 *
 * Three persona views: CEO / Operations / Content
 * Combines Reddit VOC + Rufus GEO + Bridge metrics
 */
import { PageHeader } from "@/components/layout/page-header";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";

const OVERVIEW_KPIS = [
  { label: "Reddit SoD (Levoit)", value: 34.2, change: 2.8, format: "percent" as const },
  { label: "Rufus SoA (Levoit)", value: 41.5, change: -1.3, format: "percent" as const },
  { label: "Avg Sentiment", value: 0.72, change: 3.2, format: "score" as const },
  { label: "Risk Library", value: 47, change: 5, format: "number" as const },
  { label: "Topic→Query Coverage", value: 68, change: 4.1, format: "percent" as const },
  { label: "Action Items", value: 12, format: "number" as const },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="GEO Decision Cockpit"
        description="Reddit VOC + Amazon Rufus GEO unified view &mdash; what to fix this week"
        tabs={[
          { label: "CEO View", href: "/" },
          { label: "Operations View", href: "/?view=ops" },
          { label: "Content View", href: "/?view=content" },
        ]}
        showIntentFilter
      />

      {/* KPI strip */}
      <KpiRow metrics={OVERVIEW_KPIS} />

      {/* Row 1: Reddit health + Rufus health */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Reddit VOC Health"
          subtitle="Share of Discussion × Sentiment by Topic"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Bubble chart — X=SoD%, Y=Sentiment, Size=Mentions */}
            Bubble chart: SoD × Sentiment × Volume per Topic
          </div>
        </ChartContainer>

        <ChartContainer
          title="Rufus Share of Answer"
          subtitle="Levoit appearance rate across Query Clusters"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Horizontal bar — SoA% per QueryCluster, colored by Intent */}
            Bar chart: SoA% per Cluster (A1 blue / A2 yellow / A3 green)
          </div>
        </ChartContainer>
      </div>

      {/* Row 2: Bridge coverage + Action items */}
      <div className="grid grid-cols-3 gap-4">
        <ChartContainer
          title="Topic → Query Bridge"
          subtitle="Reddit Topics mapped to Rufus Query Clusters"
        >
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Sankey — Reddit Topics → QueryClusters */}
            Sankey: Reddit Topic → QueryCluster flow
          </div>
        </ChartContainer>

        <ChartContainer
          title="Risk Counter-Content Status"
          subtitle="Risks with Amazon content coverage"
        >
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Donut — covered / partial / missing */}
            Donut: 23 covered, 12 partial, 12 missing
          </div>
        </ChartContainer>

        <ChartContainer
          title="This Week's Actions"
          subtitle="Priority-ranked items to fix"
        >
          <div className="flex h-56 flex-col gap-2 overflow-y-auto text-sm text-gray-400">
            {/* Action list: priority badge + title + source tag */}
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">
              CRITICAL: "Filter replacement cost" risk — no Q&A counter
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
              HIGH: "Noise level accuracy" — A+ table outdated
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
              MEDIUM: "VOC removal" topic — Rufus not citing Core 600S
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* Row 3: Competitor landscape */}
      <ChartContainer
        title="Competitive Landscape"
        subtitle="Levoit vs Dyson vs Coway vs Honeywell — Reddit SoD + Rufus SoA"
        span="full"
      >
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          {/* ECharts: Grouped bar — Brand × (Reddit SoD + Rufus SoA) */}
          Grouped bar: 4 brands × 2 metrics (SoD + SoA)
        </div>
      </ChartContainer>
    </div>
  );
}
