/**
 * Reddit VOC — Topic Clusters (R2)
 *
 * Three-layer structure:
 *   1. VOC Atomic Layer (raw mentions + evidence)
 *   2. Topic Layer (use cases + decision dimensions)
 *   3. Risk/Objection Layer (Rufus-relevant risks)
 *
 * Tabs: Topic Tree | Risk Library | Evidence Quality
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { ChartContainer } from "@/components/ui/chart-container";

export default function TopicClustersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Topic Clusters"
        description="VOC → Topic → Risk three-layer structure — maps to Rufus decision signals"
        tabs={getTabsForPath("/reddit-voc/topic-clusters")}
      />

      {/* Topic taxonomy tree */}
      <ChartContainer
        title="Topic Taxonomy"
        subtitle="Hierarchical: Use Case → Decision Dimension → Risk"
        span="full"
      >
        <div className="flex h-96 items-center justify-center text-sm text-gray-400">
          {/* ECharts: Sunburst or Tree diagram
              Level 1: Use Cases (allergies, pets, wildfire, sleep, baby room, small space)
              Level 2: Decision Dimensions (CADR, noise, filter cost, humidity type, maintenance)
              Level 3: Risks ("Is the filter really HEPA?", "Noise at max speed", etc.) */}
          Sunburst: Use Case → Decision Dimension → Risk (sized by mention count)
        </div>
      </ChartContainer>

      {/* Bottom: Topic detail table + Risk severity heatmap */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left 3 cols: Topic list with nested risks */}
        <div className="col-span-3">
          <ChartContainer title="Topic Detail Table" subtitle="Click to expand risks">
            <div className="space-y-2 text-sm text-gray-500">
              {/* Expandable rows: topic → risks → mapped Rufus queries */}
              <div className="rounded border border-gray-100 p-3">
                <div className="font-medium text-gray-900">Allergies & Asthma</div>
                <div className="mt-1 text-xs text-gray-400">
                  487 mentions &middot; Sentiment: 0.78 &middot; 3 risks &middot; Maps to 5 QueryClusters
                </div>
              </div>
              <div className="rounded border border-gray-100 p-3">
                <div className="font-medium text-gray-900">Pet Hair & Odor</div>
                <div className="mt-1 text-xs text-gray-400">
                  312 mentions &middot; Sentiment: 0.65 &middot; 4 risks &middot; Maps to 3 QueryClusters
                </div>
              </div>
              <div className="rounded border border-gray-100 p-3">
                <div className="font-medium text-gray-900">Wildfire Smoke</div>
                <div className="mt-1 text-xs text-gray-400">
                  198 mentions &middot; Sentiment: 0.81 &middot; 2 risks &middot; Maps to 4 QueryClusters
                </div>
              </div>
            </div>
          </ChartContainer>
        </div>

        {/* Right 2 cols: Risk severity heatmap */}
        <div className="col-span-2">
          <ChartContainer
            title="Risk Severity Heatmap"
            subtitle="Topic × Risk — frequency and severity"
          >
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              {/* ECharts: Heatmap — rows=topics, cols=risk dimensions, color=severity */}
              Heatmap: Topic × Risk dimension (red=high, yellow=medium, green=low)
            </div>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
