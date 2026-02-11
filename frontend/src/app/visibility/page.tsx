"use client";

/**
 * AI Visibility Overview — R-FE-01
 *
 * Hero: AI Visibility Score (large number) + change badge
 * Period selector: day / week / month
 * Two columns: Top Performing Queries + Largest Gaps (Action Needed)
 * Data fetched from /scores and /scores/comparison endpoints.
 */

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { KpiRow } from "@/components/ui/kpi-card";
import { VisibilityScoreCard } from "@/components/charts/visibility-score-card";
import { TopQueriesList } from "@/components/charts/top-queries-list";
import { scores } from "@/lib/api";
import type { ComparisonRow, KpiMetric } from "@/lib/types";

export default function VisibilityOverviewPage() {
  const [period, setPeriod] = useState("raw");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aggregated score state
  const [currentScore, setCurrentScore] = useState(0);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [queryCount, setQueryCount] = useState(0);

  // Comparison rows
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Levoit scores (latest, period-filtered)
      const [scoreResult, compResult] = await Promise.all([
        scores.list({ brand: "Levoit", period, page_size: 100 }),
        scores.comparison(),
      ]);

      // Aggregate current score: average across all queries
      const scoreRows = scoreResult.data;
      if (scoreRows.length > 0) {
        const avg =
          scoreRows.reduce((sum, s) => sum + s.visibility_score, 0) /
          scoreRows.length;
        setCurrentScore(Math.round(avg * 10) / 10);

        // Deduce unique queries
        const uniqueQueries = new Set(scoreRows.map((s) => s.query_id));
        setQueryCount(uniqueQueries.size);
      } else {
        setCurrentScore(0);
        setQueryCount(0);
      }

      // Previous score: fetch the previous period's data for delta
      // Simplified: use raw scores as baseline when viewing aggregated
      if (period !== "raw") {
        const prevResult = await scores.list({
          brand: "Levoit",
          period: "raw",
          page_size: 100,
        });
        if (prevResult.data.length > 0) {
          const prevAvg =
            prevResult.data.reduce((sum, s) => sum + s.visibility_score, 0) /
            prevResult.data.length;
          setPreviousScore(Math.round(prevAvg * 10) / 10);
        } else {
          setPreviousScore(null);
        }
      } else {
        setPreviousScore(null);
      }

      setComparison(compResult);
    } catch (e) {
      // API not available — show placeholder data
      setError(e instanceof Error ? e.message : "Failed to fetch data");
      setCurrentScore(0);
      setPreviousScore(null);
      setComparison([]);
      setQueryCount(0);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived: top performing (sorted by Levoit score desc)
  const topPerforming = [...comparison]
    .sort((a, b) => b.levoit_score - a.levoit_score)
    .slice(0, 5);

  // Derived: largest gaps (sorted by competitive_gap asc — most negative first)
  const largestGaps = [...comparison]
    .sort((a, b) => a.competitive_gap - b.competitive_gap)
    .slice(0, 5);

  // KPI strip
  const avgGap =
    comparison.length > 0
      ? comparison.reduce((sum, r) => sum + r.competitive_gap, 0) /
        comparison.length
      : 0;

  const kpis: KpiMetric[] = [
    {
      label: "AI Visibility Score",
      value: currentScore,
      format: "score",
    },
    {
      label: "Queries Monitored",
      value: queryCount,
      format: "number",
    },
    {
      label: "Avg Competitive Gap",
      value: Math.round(avgGap * 10) / 10,
      format: "score",
    },
    {
      label: "Queries Leading",
      value: comparison.filter((r) => r.competitive_gap > 0).length,
      format: "number",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Search Visibility"
        description="Monitor Levoit ranking across ChatGPT, Perplexity, and Google AI Overview"
        tabs={getTabsForPath("/visibility")}
        showTimeRange={false}
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend unavailable — showing empty state. Start the API server to see live data.
        </div>
      )}

      {/* KPI strip */}
      <KpiRow metrics={kpis} />

      {/* Hero: Visibility Score card */}
      <VisibilityScoreCard
        score={currentScore}
        previousScore={previousScore}
        period={period}
        onPeriodChange={setPeriod}
        loading={loading}
      />

      {/* Two columns: top performing + largest gaps */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopQueriesList
          title="Top Performing Queries"
          subtitle="Highest Levoit visibility score"
          items={topPerforming}
          variant="top"
          loading={loading}
        />
        <TopQueriesList
          title="Largest Gaps (Action Needed)"
          subtitle="Queries where competitors rank higher"
          items={largestGaps}
          variant="gap"
          loading={loading}
        />
      </div>
    </div>
  );
}
