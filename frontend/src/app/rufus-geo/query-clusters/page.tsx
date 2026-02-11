/**
 * Rufus GEO — Query Clusters (A1)
 *
 * Intent layers: A1 (Research) → A2 (Evaluation) → A3 (Purchase)
 * Tabs: Cluster Map | Intent Layers | Coverage Gaps
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { IntentFunnel, CoverageGapTable } from "@/components/charts/rufus-charts";

const CLUSTER_KPIS = [
  { label: "Total Clusters", value: 48, format: "number" as const },
  { label: "A1 (Research)", value: 18, format: "number" as const },
  { label: "A2 (Evaluation)", value: 20, format: "number" as const },
  { label: "A3 (Purchase)", value: 10, format: "number" as const },
  { label: "Reddit Coverage", value: 68, change: 4.1, format: "percent" as const },
];

export default function QueryClustersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Query Clusters"
        description="Rufus observable question clusters — A1 Research → A2 Evaluation → A3 Purchase"
        tabs={getTabsForPath("/rufus-geo/query-clusters")}
        showIntentFilter
      />

      <KpiRow metrics={CLUSTER_KPIS} />

      {/* Intent funnel + Cluster map */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <ChartContainer
            title="Intent Funnel"
            subtitle="Query distribution across A1 → A2 → A3"
          >
            <IntentFunnel />
          </ChartContainer>
        </div>

        <div className="col-span-3">
          <ChartContainer
            title="Cluster Map"
            subtitle="All query clusters with SoA and Reddit coverage"
          >
            <div className="space-y-1.5 text-sm text-gray-500">
              {[
                { cluster: "Best air purifier for allergies", intent: "A1", soa: 62, coverage: 85 },
                { cluster: "Levoit vs Coway Airmega", intent: "A2", soa: 48, coverage: 72 },
                { cluster: "Quiet air purifier for bedroom", intent: "A1", soa: 55, coverage: 90 },
                { cluster: "Is Levoit good for wildfire smoke?", intent: "A2", soa: 71, coverage: 65 },
                { cluster: "Best purifier under $100", intent: "A3", soa: 38, coverage: 45 },
              ].map((c) => (
                <div key={c.cluster} className="flex items-center gap-3 rounded border border-gray-100 px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    c.intent === "A1" ? "bg-blue-100 text-blue-700" :
                    c.intent === "A2" ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>{c.intent}</span>
                  <span className="flex-1 text-gray-700">{c.cluster}</span>
                  <span className="text-xs text-gray-400">SoA: {c.soa}%</span>
                  <span className="text-xs text-gray-400">Reddit: {c.coverage}%</span>
                </div>
              ))}
            </div>
          </ChartContainer>
        </div>
      </div>

      <ChartContainer
        title="Coverage Gap Analysis"
        subtitle="Reddit Topics with high discussion volume but no mapped QueryCluster"
        span="full"
      >
        <CoverageGapTable />
      </ChartContainer>
    </div>
  );
}
