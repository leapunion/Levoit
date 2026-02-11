/**
 * Experiments — Templates
 *
 * Reusable experiment blueprints for common GEO hypotheses
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatusBadge } from "@/components/ui/status-badge";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiment Templates"
        description="Reusable blueprints — quickly launch experiments from proven patterns"
        tabs={getTabsForPath("/experiments/templates")}
        showTimeRange={false}
      />

      <ChartContainer title="Available Templates" span="full">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            {
              name: "Risk Fix → Rufus Response",
              type: "risk_fix",
              description: "Test whether adding Q&A or A+ content addressing a specific Reddit risk reduces Rufus negative mentions",
              defaultDuration: "14d",
              metrics: ["Risk mention frequency", "Claim match score"],
              uses: 5,
            },
            {
              name: "Reddit Seeding → SoA Lift",
              type: "reddit_diffusion",
              description: "Test whether positive Reddit discussion seeding improves Rufus Share of Answer for related query clusters",
              defaultDuration: "28d",
              metrics: ["SoA%", "Appearance stability"],
              uses: 3,
            },
            {
              name: "Content Update → Citation Rate",
              type: "content_update",
              description: "Test whether updating Amazon listing content (bullets, A+, Q&A) increases Rufus citation frequency",
              defaultDuration: "7d",
              metrics: ["Citation count", "Claim match score"],
              uses: 4,
            },
            {
              name: "Competitor Framing → Comparator Set",
              type: "narrative",
              description: "Test whether content positioning changes how Rufus frames Levoit relative to specific competitors",
              defaultDuration: "21d",
              metrics: ["Comparator set frequency", "Win rate vs competitor"],
              uses: 1,
            },
            {
              name: "ASIN Claim Density → Presence Rate",
              type: "content_update",
              description: "Test whether increasing structured claim density in listing content improves Levoit presence rate in Rufus",
              defaultDuration: "14d",
              metrics: ["Presence rate", "Rank position"],
              uses: 2,
            },
            {
              name: "Cross-Channel Amplification",
              type: "reddit_diffusion",
              description: "Test whether coordinated Reddit + Amazon content updates produce compounding SoA improvements",
              defaultDuration: "28d",
              metrics: ["SoA%", "Reddit SoD%", "Claim match"],
              uses: 0,
            },
          ].map((t) => (
            <div key={t.name} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="info">{t.type}</StatusBadge>
                <span className="font-medium text-gray-900">{t.name}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{t.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span>Duration: {t.defaultDuration}</span>
                <span>Used {t.uses}×</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.metrics.map((m) => (
                  <span key={m} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{m}</span>
                ))}
              </div>
              <button className="mt-3 w-full rounded border border-blue-200 bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">
                Launch Experiment
              </button>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
}
