/**
 * Reddit VOC — Data Sources (R1)
 *
 * Subreddit coverage, collection status, quality filters
 * Tabs: Subreddits | Collection Status | Quality Filters
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { CollectionGauge } from "@/components/charts/voc-charts";

const DATA_KPIS = [
  { label: "Active Subreddits", value: 32, format: "number" as const },
  { label: "Posts Collected (30d)", value: 24891, change: 8.3, format: "number" as const },
  { label: "Comments Collected (30d)", value: 187432, change: 11.2, format: "number" as const },
  { label: "Noise Filtered", value: 14.2, format: "percent" as const },
  { label: "Unique Authors", value: 8934, format: "number" as const },
];

export default function DataSourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        description="Reddit data collection scope, frequency, and quality filters"
        tabs={getTabsForPath("/reddit-voc/data-sources")}
      />

      <KpiRow metrics={DATA_KPIS} />

      {/* Subreddit table + collection timeline */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ChartContainer title="Subreddit Coverage" subtitle="30+ subreddits monitored">
            <div className="space-y-1.5 text-sm text-gray-500">
              {[
                { name: "r/AirPurifiers", posts: 3421, status: "active" },
                { name: "r/Humidifiers", posts: 1892, status: "active" },
                { name: "r/Allergies", posts: 1234, status: "active" },
                { name: "r/Asthma", posts: 987, status: "active" },
                { name: "r/HomeImprovement", posts: 2341, status: "active" },
                { name: "r/BuyItForLife", posts: 876, status: "active" },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
                  <span className="font-medium text-gray-700">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.posts.toLocaleString()} posts</span>
                </div>
              ))}
            </div>
          </ChartContainer>
        </div>

        <ChartContainer title="Collection Health">
          <CollectionGauge />
        </ChartContainer>
      </div>
    </div>
  );
}
