/**
 * Attribution — Model Comparison
 *
 * Core question: "How do different attribution models value each channel?"
 * Charts: Model Comparison Bar + Channel Weight Radar + Sensitivity Line
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  ModelComparisonBar,
  ChannelWeightRadar,
  ModelSensitivityLine,
} from "@/components/charts/attribution-charts";

const MODEL_KPIS = [
  { label: "Model Variance", value: 8.3, format: "percent" as const },
  { label: "Top Channel (First-touch)", value: "ChatGPT", format: "score" as const },
  { label: "Top Channel (Last-touch)", value: "Google AI", format: "score" as const },
  { label: "Data Points", value: 18420, format: "number" as const },
  { label: "Confidence Score", value: 0.87, format: "score" as const },
];

export default function ModelComparisonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Comparison"
        description="Compare attribution models to understand channel contribution"
        tabs={getTabsForPath("/attribution/models")}
      />

      <KpiRow metrics={MODEL_KPIS} />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Attribution by Model"
          subtitle="First-touch vs last-touch vs linear attribution"
        >
          <ModelComparisonBar />
        </ChartContainer>

        <ChartContainer
          title="Channel Weight Distribution"
          subtitle="How each model distributes credit across channels"
        >
          <ChannelWeightRadar />
        </ChartContainer>
      </div>

      <ChartContainer
        title="Model Sensitivity Analysis"
        subtitle="How attribution values change with different lookback windows"
        span="full"
      >
        <ModelSensitivityLine />
      </ChartContainer>
    </div>
  );
}
