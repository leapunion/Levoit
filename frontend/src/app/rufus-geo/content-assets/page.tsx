/**
 * Rufus GEO — Content Assets (A4)
 *
 * Amazon content asset → Rufus citation mapping
 * Tabs: Asset Map | Claim Coverage | Risk Counters
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { AssetTypeBar, AssetClaimSankey } from "@/components/charts/rufus-charts";

const ASSET_KPIS = [
  { label: "ASINs Tracked", value: 12, format: "number" as const },
  { label: "Content Assets", value: 156, format: "number" as const },
  { label: "Claims Mapped", value: 89, format: "number" as const },
  { label: "Rufus-Cited Assets", value: 43, format: "percent" as const },
  { label: "Risk Counters Active", value: 23, format: "number" as const },
];

export default function ContentAssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Assets"
        description="Amazon content inventory mapped to Rufus citations — Listing, A+, Q&A, Reviews"
        tabs={getTabsForPath("/rufus-geo/content-assets")}
      />

      <KpiRow metrics={ASSET_KPIS} />

      {/* Asset type breakdown + Rufus citation map */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Asset Type Distribution"
          subtitle="Content inventory by type and Rufus citation status"
        >
          <AssetTypeBar />
        </ChartContainer>

        <ChartContainer
          title="Asset → Claim → Topic Flow"
          subtitle="How content assets connect to claims and topics"
        >
          <AssetClaimSankey />
        </ChartContainer>
      </div>

      {/* Risk counter-content mapping */}
      <ChartContainer
        title="Risk → Counter-Content Mapping"
        subtitle="Each Reddit risk needs an Amazon content response"
        span="full"
      >
        <div className="space-y-2 text-sm">
          {[
            { risk: "Filter replacement is expensive", counter: "Q&A: Filter lasts 6-8 months, $15.99", status: "covered" },
            { risk: "Noise level at max speed", counter: "A+ Table: 24dB sleep mode comparison", status: "covered" },
            { risk: "Does it really remove VOC?", counter: "MISSING — no A+ or Q&A content", status: "missing" },
            { risk: "Ultrasonic humidifier white dust", counter: "Bullet #4 mentions mineral-free", status: "partial" },
          ].map((r) => (
            <div key={r.risk} className="flex items-center gap-4 rounded border border-gray-100 px-4 py-3">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                r.status === "covered" ? "bg-green-100 text-green-700" :
                r.status === "partial" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>{r.status.toUpperCase()}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-700">{r.risk}</div>
                <div className="text-xs text-gray-400">{r.counter}</div>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
}
