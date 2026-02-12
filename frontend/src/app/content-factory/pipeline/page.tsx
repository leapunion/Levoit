/**
 * Content Factory — Content Pipeline
 *
 * Reddit content seeding experiment results:
 * Classic 160 vs Classic 300S — survival rate, engagement, strategy insights
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  RedditContentSankey,
  ProductComparisonBar,
  ContentSurvivalDonut,
} from "@/components/charts/content-factory-charts";

const PIPELINE_KPIS = [
  { label: "Total Posts", value: 42, format: "number" as const },
  { label: "Survival Rate", value: 78.6, format: "percent" as const },
  { label: "Total Comments", value: 694, format: "number" as const },
  { label: "Total Upvotes", value: 840, format: "number" as const },
  { label: "Avg Engagement/Post", value: 46.5, format: "number" as const },
];

export default function ContentPipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Pipeline"
        description="Reddit content seeding experiment — Classic 160 vs Classic 300S performance analysis"
        tabs={getTabsForPath("/content-factory/pipeline")}
      />

      <KpiRow metrics={PIPELINE_KPIS} />

      {/* Sankey: full content flow */}
      <ChartContainer
        title="Reddit Content Seeding Flow"
        subtitle="Posts → Product → Survival Status → Engagement (Comments + Upvotes)"
        span="full"
      >
        <RedditContentSankey />
      </ChartContainer>

      {/* Product comparison + Survival donut */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Product Performance Comparison"
          subtitle="Classic 160 vs Classic 300S — all key metrics"
        >
          <ProductComparisonBar />
        </ChartContainer>

        <ChartContainer
          title="Post Survival Rate by Product"
          subtitle="Classic 300S 89% vs Classic 160 60%"
        >
          <ContentSurvivalDonut />
        </ChartContainer>
      </div>

      {/* Key findings */}
      <ChartContainer
        title="Key Findings"
        subtitle="Content strategy insights from Reddit seeding experiment"
        span="full"
      >
        <div className="space-y-3 text-sm">
          {/* Data table */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500">Metric</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-orange-600">Classic 160</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-cyan-600">Classic 300S</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">Total Posts</td>
                  <td className="px-4 py-2 text-gray-600">15</td>
                  <td className="px-4 py-2 text-gray-600">27</td>
                  <td className="px-4 py-2 font-medium text-gray-700">42</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">Survived</td>
                  <td className="px-4 py-2 text-gray-600">9 (60%)</td>
                  <td className="px-4 py-2 text-gray-600">24 (89%)</td>
                  <td className="px-4 py-2 font-medium text-gray-700">33 (78.6%)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">Removed</td>
                  <td className="px-4 py-2 text-red-600">6 (40%)</td>
                  <td className="px-4 py-2 text-gray-600">3 (11%)</td>
                  <td className="px-4 py-2 text-gray-600">9 (21.4%)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">Total Comments</td>
                  <td className="px-4 py-2 text-gray-600">110</td>
                  <td className="px-4 py-2 text-gray-600">584</td>
                  <td className="px-4 py-2 font-medium text-gray-700">694</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">Total Upvotes</td>
                  <td className="px-4 py-2 text-gray-600">42</td>
                  <td className="px-4 py-2 text-gray-600">798</td>
                  <td className="px-4 py-2 font-medium text-gray-700">840</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">Avg Comments / Surviving Post</td>
                  <td className="px-4 py-2 text-gray-600">12.2</td>
                  <td className="px-4 py-2 font-semibold text-cyan-600">24.3</td>
                  <td className="px-4 py-2 text-gray-600">21.0</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">Avg Upvotes / Surviving Post</td>
                  <td className="px-4 py-2 text-gray-600">4.7</td>
                  <td className="px-4 py-2 font-semibold text-cyan-600">33.3</td>
                  <td className="px-4 py-2 text-gray-600">25.5</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Strategy insights */}
          <div className="space-y-2 pt-2">
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="danger">Classic 160 Issue</StatusBadge>
                <span className="font-medium text-red-800">
                  Brand-vs-Brand titles triggered moderator removal
                </span>
              </div>
              <p className="mt-1 text-xs text-red-600">
                Early posts used direct comparison titles like &quot;Levoit Classic 160 vs Dyson humidifier&quot;,
                resulting in multiple HomeImprovement posts removed by moderators. Survival rate: only 60%.
              </p>
            </div>

            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="success">Classic 300S Strategy</StatusBadge>
                <span className="font-medium text-green-800">
                  Scenario-driven, pain-point titles dramatically outperformed
                </span>
              </div>
              <p className="mt-1 text-xs text-green-600">
                Pivoted to scenario-based titles like &quot;Dry mouth while sleeping is the one thing
                destroying my sleep&quot; — survival rate jumped to 89%, with 7x more upvotes and 5x more
                comments per surviving post compared to Classic 160.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusBadge variant="info">Recommendation</StatusBadge>
                <span className="font-medium text-blue-800">
                  All future Reddit seeding should follow the Classic 300S playbook
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-600">
                Avoid brand-vs-brand titles. Use pain-point / scenario framing that naturally leads to
                product discovery. This approach achieves 89% survival rate and significantly higher
                community engagement.
              </p>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}
