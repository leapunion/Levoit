/**
 * Content Factory — Content Pipeline
 *
 * Core question: "How efficiently does VOC input flow into published content?"
 * Charts: ContentFlowSankey + ContentVelocityLine + ContentTypeDonut
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  ContentFlowSankey,
  ContentVelocityLine,
  ContentTypeDonut,
} from "@/components/charts/content-factory-charts";

const PIPELINE_KPIS = [
  { label: "Content Generated", value: 342, change: 28.5, format: "number" as const },
  { label: "Avg Time to Publish", value: "4.2d", format: "score" as const },
  { label: "Queue Size", value: 47, change: -12.3, format: "number" as const },
  { label: "Generation Success", value: 94, change: 2.1, format: "percent" as const },
  { label: "AI Citation Rate", value: 18, change: 5.7, format: "percent" as const },
];

export default function ContentPipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Pipeline"
        description="Overview of content generation workflow from VOC input to content output"
        tabs={getTabsForPath("/content-factory/pipeline")}
      />

      <KpiRow metrics={PIPELINE_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Content Flow"
          subtitle="VOC Topics → FAQ Extraction → Topic Analysis → Content Output"
        >
          <ContentFlowSankey />
        </ChartContainer>

        <ChartContainer
          title="Content Velocity (30d)"
          subtitle="Daily content production rate with weekday/weekend variation"
        >
          <ContentVelocityLine />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Content Type & Status Distribution"
        subtitle="Inner ring: content types — Outer ring: publication status"
        span="full"
      >
        <ContentTypeDonut />
      </ChartContainer>
    </div>
  );
}
