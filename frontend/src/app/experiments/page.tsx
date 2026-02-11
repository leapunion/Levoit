/**
 * Experiments — Active Experiments (U2)
 *
 * GEO is not metaphysics — everything must be experimentally verifiable
 * Tabs: Running | Completed
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatusBadge } from "@/components/ui/status-badge";

const EXP_KPIS = [
  { label: "Running", value: 3, format: "number" as const },
  { label: "Completed (30d)", value: 7, format: "number" as const },
  { label: "Success Rate", value: 57, format: "percent" as const },
  { label: "Avg Duration", value: "14d", format: "number" as const },
];

export default function ExperimentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiment Center"
        description="GEO experiments — verify that content changes actually move Rufus behavior"
        tabs={getTabsForPath("/experiments")}
        showTimeRange={false}
      />

      <KpiRow metrics={EXP_KPIS} />

      {/* Active experiments */}
      <ChartContainer title="Running Experiments" span="full">
        <div className="space-y-3 text-sm">
          {[
            {
              name: "Filter cost risk fix → Rufus risk surfacing",
              type: "risk_fix",
              hypothesis: "Adding Q&A about filter longevity reduces Rufus 'expensive filter' risk mention by 30%",
              started: "2026-01-28",
              duration: "14d",
              progress: 85,
            },
            {
              name: "Reddit allergy topic → SoA stability",
              type: "reddit_diffusion",
              hypothesis: "Positive allergy discussions on Reddit improve Rufus SoA for 'best purifier for allergies' cluster",
              started: "2026-02-01",
              duration: "28d",
              progress: 35,
            },
            {
              name: "A+ table update → claim match improvement",
              type: "content_update",
              hypothesis: "Updating A+ comparison table improves Rufus claim match score by 15%",
              started: "2026-02-05",
              duration: "7d",
              progress: 60,
            },
          ].map((e) => (
            <div key={e.name} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="info">{e.type}</StatusBadge>
                    <span className="font-medium text-gray-900">{e.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{e.hypothesis}</p>
                </div>
                <span className="text-xs text-gray-400">Started {e.started}</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{e.progress}% ({e.duration} window)</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${e.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Experiment Impact Timeline"
          subtitle="Metric changes before/during/after experiments"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Line with markers — vertical lines = experiment start/end */}
            Line chart with experiment period markers
          </div>
        </ChartContainer>

        <ChartContainer
          title="Success/Failure Distribution"
          subtitle="Experiment outcomes by type"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* ECharts: Stacked bar — experiment type × (success/fail/inconclusive) */}
            Stacked bar: success/fail/inconclusive per experiment type
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
