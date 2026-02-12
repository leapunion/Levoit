/**
 * Content Factory — Content Library
 *
 * Core question: "What content do we have and how well does it cover our topics?"
 * Charts: ContentStatusBar + TopicCoverageTreemap + QualityDistributionHistogram
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  ContentStatusBar,
  TopicCoverageTreemap,
  QualityDistributionHistogram,
} from "@/components/charts/content-factory-charts";

const LIBRARY_KPIS = [
  { label: "Total Content", value: 1248, change: 18.3, format: "number" as const },
  { label: "Published", value: 856, change: 22.4, format: "number" as const },
  { label: "Avg Quality Score", value: 87, change: 3.2, format: "score" as const },
  { label: "Topic Coverage", value: 78, change: 12.1, format: "percent" as const },
  { label: "AI-Ready Content", value: 72, change: 8.5, format: "percent" as const },
];

export default function ContentLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Library"
        description="Browse and manage generated content inventory"
        tabs={getTabsForPath("/content-factory/library")}
      />

      <KpiRow metrics={LIBRARY_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Content Inventory by Status"
          subtitle="Stacked breakdown of content types × publication status"
        >
          <ContentStatusBar />
        </ChartContainer>

        <ChartContainer
          title="Topic Coverage"
          subtitle="Hierarchical view of content topics and sub-topics"
        >
          <TopicCoverageTreemap />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Quality Score Distribution"
        subtitle="Content count across quality metric score ranges"
        span="full"
      >
        <QualityDistributionHistogram />
      </ChartContainer>
    </div>
  );
}
