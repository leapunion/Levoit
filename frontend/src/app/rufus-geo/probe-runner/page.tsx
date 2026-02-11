/**
 * Rufus GEO — Probe Runner (A3)
 *
 * Execution system: turn Rufus black box into repeatable experiments
 * Tabs: Active Probes | Results | History
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProbeResultScatter, ClaimCitationBar } from "@/components/charts/rufus-charts";

const PROBE_KPIS = [
  { label: "Active Probes", value: 12, format: "number" as const },
  { label: "Probes Run (7d)", value: 156, change: 23.1, format: "number" as const },
  { label: "Avg Stability", value: 0.82, format: "score" as const },
  { label: "Levoit Present Rate", value: 67, format: "percent" as const },
  { label: "Anomalies Detected", value: 3, format: "number" as const },
];

export default function ProbeRunnerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Probe Runner"
        description="Rufus probe execution system — turn black box into repeatable, measurable experiments"
        tabs={getTabsForPath("/rufus-geo/probe-runner")}
      />

      <KpiRow metrics={PROBE_KPIS} />

      {/* Active probes list */}
      <ChartContainer title="Active Probe Configurations" span="full">
        <div className="space-y-2 text-sm">
          {[
            { query: "Best air purifier for pet hair and odor", cluster: "A1-pets", schedule: "6h", samples: 4, status: "running" as const },
            { query: "Is Levoit good for wildfire smoke?", cluster: "A2-wildfire", schedule: "6h", samples: 4, status: "running" as const },
            { query: "Levoit vs Coway for allergies", cluster: "A2-comparison", schedule: "12h", samples: 3, status: "running" as const },
            { query: "Quiet air purifier for bedroom", cluster: "A1-noise", schedule: "6h", samples: 4, status: "running" as const },
            { query: "Levoit Core 300 filter replacement cost", cluster: "A3-cost", schedule: "24h", samples: 2, status: "paused" as const },
          ].map((p) => (
            <div key={p.query} className="flex items-center gap-4 rounded border border-gray-100 px-4 py-3">
              <StatusBadge variant={p.status === "running" ? "success" : "warning"}>
                {p.status}
              </StatusBadge>
              <div className="flex-1">
                <div className="font-medium text-gray-700">{p.query}</div>
                <div className="text-xs text-gray-400">
                  Cluster: {p.cluster} &middot; Every {p.schedule} &middot; {p.samples} samples/run
                </div>
              </div>
              <button className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50">
                View Results
              </button>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Results visualization */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Probe Result Timeline"
          subtitle="Levoit presence and rank across probe runs"
        >
          <ProbeResultScatter />
        </ChartContainer>

        <ChartContainer
          title="Claim Citation Frequency"
          subtitle="Which Levoit claims are most cited by Rufus"
        >
          <ClaimCitationBar />
        </ChartContainer>
      </div>
    </div>
  );
}
