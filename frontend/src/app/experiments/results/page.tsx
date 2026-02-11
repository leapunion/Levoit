/**
 * Experiments — Results
 *
 * Completed experiment outcomes with before/after metrics
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatusBadge } from "@/components/ui/status-badge";

const RESULTS_KPIS = [
  { label: "Completed (30d)", value: 7, format: "number" as const },
  { label: "Success", value: 4, format: "number" as const },
  { label: "Inconclusive", value: 2, format: "number" as const },
  { label: "Failed", value: 1, format: "number" as const },
  { label: "Avg Lift", value: 12.3, format: "percent" as const },
];

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiment Results"
        description="Completed experiment outcomes — what worked and what didn't"
        tabs={getTabsForPath("/experiments/results")}
        showTimeRange={false}
      />

      <KpiRow metrics={RESULTS_KPIS} />

      <ChartContainer title="Completed Experiments" span="full">
        <div className="space-y-3 text-sm">
          {[
            {
              name: "Q&A noise level → Rufus noise risk reduction",
              type: "risk_fix",
              hypothesis: "Adding Q&A about 24dB sleep mode reduces Rufus noise risk mentions by 25%",
              result: "success" as const,
              lift: "+31% reduction in noise risk mentions",
              completed: "2026-02-03",
            },
            {
              name: "A+ HEPA comparison → claim match boost",
              type: "content_update",
              hypothesis: "Updating A+ HEPA comparison table improves claim match score by 10%",
              result: "success" as const,
              lift: "+14% claim match improvement",
              completed: "2026-01-30",
            },
            {
              name: "Reddit pet hair seeding → SoA for pet queries",
              type: "reddit_diffusion",
              hypothesis: "Positive pet hair discussions boost SoA for 'best purifier for pets' by 15%",
              result: "inconclusive" as const,
              lift: "+4% SoA (below significance threshold)",
              completed: "2026-01-27",
            },
            {
              name: "Bullet point rewrite → Rufus citation rate",
              type: "content_update",
              hypothesis: "Rewriting bullet points with structured claims increases citation rate by 20%",
              result: "success" as const,
              lift: "+22% citation rate increase",
              completed: "2026-01-22",
            },
            {
              name: "Reddit VOC removal topic → Core 600S mention",
              type: "reddit_diffusion",
              hypothesis: "Seeding VOC removal discussions will get Rufus to cite Core 600S",
              result: "failed" as const,
              lift: "No measurable change in Core 600S mentions",
              completed: "2026-01-18",
            },
          ].map((e) => (
            <div key={e.name} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={
                      e.result === "success" ? "success" :
                      e.result === "failed" ? "danger" : "warning"
                    }>{e.result}</StatusBadge>
                    <StatusBadge variant="info">{e.type}</StatusBadge>
                    <span className="font-medium text-gray-900">{e.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{e.hypothesis}</p>
                </div>
                <span className="text-xs text-gray-400">{e.completed}</span>
              </div>
              <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Result: {e.lift}
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
}
