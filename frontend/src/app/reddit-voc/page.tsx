/**
 * Reddit VOC — Executive Overview (R3 metrics)
 *
 * Tabs: Overview | By Topic | By Subreddit | By Author Trust
 * Core KPIs: Total Mentions, Avg Sentiment, Topics Covered,
 *            Competitor Mentions, Positive Ratio, Negative Ratio
 */
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";
import { SentimentDonut, MentionTrendsArea, PainPointsBar, SodByTopicBar, EvidenceTreemap } from "@/components/charts/voc-charts";

const REDDIT_KPIS = [
  { label: "Total Mentions", value: 15509, change: 12.5, format: "number" as const },
  { label: "Avg Sentiment", value: 0.72, change: 3.2, format: "score" as const },
  { label: "Topics Covered", value: 20, format: "number" as const },
  { label: "Competitor Mentions", value: 4823, format: "number" as const },
  { label: "Positive Ratio", value: 65.0, format: "percent" as const },
  { label: "Negative Ratio", value: 12.0, format: "percent" as const },
];

export default function RedditVocPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reddit VOC Analytics"
        description="Voice of Customer insights from Reddit — topics, risks, and competitive signals"
        tabs={getTabsForPath("/reddit-voc")}
      />

      {/* KPI strip */}
      <KpiRow metrics={REDDIT_KPIS} />

      {/* Row 1: Sentiment donut + Mention trends */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer title="Sentiment Distribution">
          <SentimentDonut />
        </ChartContainer>

        <ChartContainer title="Mention Trends">
          <MentionTrendsArea />
        </ChartContainer>
      </div>

      {/* Row 2: Top Pain Points (Risk Library preview) */}
      <ChartContainer title="Top Pain Points (Risks)" span="full">
        <PainPointsBar />
      </ChartContainer>

      {/* Row 3: SoD by Topic + Evidence Quality */}
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer
          title="Share of Discussion by Topic"
          subtitle="Levoit vs competitors — which topics do we own?"
        >
          <SodByTopicBar />
        </ChartContainer>

        <ChartContainer
          title="Evidence Quality Distribution"
          subtitle="Tested / Long-term / Hearsay / Speculation"
        >
          <EvidenceTreemap />
        </ChartContainer>
      </div>
    </div>
  );
}
