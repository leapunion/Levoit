/**
 * Reddit VOC — VOC-GEO Bridge (R4)
 *
 * The critical link: Reddit Topics → Rufus Query Clusters
 * Content translation rules, priority queue
 *
 * Tabs: Topic → Query Mapping | Content Translation | Priority Queue
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { BridgeSankey, PriorityScatter } from "@/components/charts/voc-charts";

const BRIDGE_KPIS = [
  { label: "Topics Mapped", value: 68, change: 4.1, format: "percent" as const },
  { label: "Unmapped Topics", value: 8, format: "number" as const },
  { label: "Risks with Counters", value: 23, format: "number" as const },
  { label: "Risks Missing Counter", value: 12, format: "number" as const },
  { label: "Translation Queue", value: 15, format: "number" as const },
];

export default function VocGeoBridgePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="VOC-GEO Bridge"
        description="Reddit Topics → Rufus Query Cluster mapping — content translation and priority"
        tabs={getTabsForPath("/reddit-voc/voc-geo-bridge")}
        showIntentFilter
      />

      <KpiRow metrics={BRIDGE_KPIS} />

      {/* Sankey: Reddit Topics → Query Clusters */}
      <ChartContainer
        title="Topic → QueryCluster Flow"
        subtitle="How Reddit discussions map to Amazon Rufus question types"
        span="full"
      >
        <BridgeSankey />
      </ChartContainer>

      {/* Content translation status + priority queue */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Content Translation Status"
          subtitle="Reddit Risk → Amazon Asset coverage"
        >
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {/* Table: Risk | Reddit Source | Target Asset Type | Status (done/partial/missing) */}
            Table: Risk → Target Amazon Asset → Translation Status
          </div>
        </ChartContainer>

        <ChartContainer
          title="Priority Score Matrix"
          subtitle="Which topics to fix first (frequency × severity × Rufus impact)"
        >
          <PriorityScatter />
        </ChartContainer>
      </div>
    </div>
  );
}
