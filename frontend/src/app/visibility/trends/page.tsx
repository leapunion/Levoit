"use client";

/**
 * Ranking Trends page — R-FE-02
 *
 * ECharts line chart: X=time, Y=rank (inverted, 1 at top).
 * One line per brand. Query selector + time range selector.
 * Data from /rankings/trends endpoint.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { ChartContainer } from "@/components/ui/chart-container";
import { RankTrendChart } from "@/components/charts/rank-trend-chart";
import { queries, rankings } from "@/lib/api";
import { MOCK_QUERIES, MOCK_TRENDS } from "@/lib/mock/visibility";
import type { TrendPoint, VisQueryResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

type Granularity = "daily" | "weekly" | "monthly";

function TrendsContent() {
  const searchParams = useSearchParams();
  const initialQueryId = searchParams.get("query_id");

  const [queryList, setQueryList] = useState<VisQueryResponse[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(
    initialQueryId ? Number(initialQueryId) : null,
  );
  const [rangeDays, setRangeDays] = useState(30);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch query list on mount
  useEffect(() => {
    queries
      .list({ is_active: true, page_size: 100 })
      .then((res) => {
        setQueryList(res.data);
        if (!selectedQueryId && res.data.length > 0) {
          setSelectedQueryId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fallback to mock queries
        setQueryList(MOCK_QUERIES);
        if (!selectedQueryId && MOCK_QUERIES.length > 0) {
          setSelectedQueryId(MOCK_QUERIES[0].id);
        }
        setError("Backend unavailable — showing demo data");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch trends when query / range / granularity changes
  const fetchTrends = useCallback(async () => {
    if (!selectedQueryId) return;
    setLoading(true);
    setError(null);

    try {
      const from = new Date();
      from.setDate(from.getDate() - rangeDays);

      const data = await rankings.trends({
        query_id: selectedQueryId,
        from: from.toISOString(),
        granularity,
      });

      setTrendData(data);

      const uniqueBrands = [...new Set(data.map((d) => d.brand))];
      uniqueBrands.sort((a, b) => {
        if (a === "Levoit") return -1;
        if (b === "Levoit") return 1;
        return a.localeCompare(b);
      });
      setBrands(uniqueBrands);
    } catch {
      // Fallback to mock trend data
      const mockData = MOCK_TRENDS[selectedQueryId] ?? [];
      setTrendData(mockData);
      const uniqueBrands = [...new Set(mockData.map((d) => d.brand))];
      uniqueBrands.sort((a, b) => {
        if (a === "Levoit") return -1;
        if (b === "Levoit") return 1;
        return a.localeCompare(b);
      });
      setBrands(uniqueBrands);
      if (!error) setError("Backend unavailable — showing demo data");
    } finally {
      setLoading(false);
    }
  }, [selectedQueryId, rangeDays, granularity]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const selectedQuery = queryList.find((q) => q.id === selectedQueryId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking Trends"
        description="Track brand ranking changes over time across AI search platforms"
        tabs={getTabsForPath("/visibility")}
        showTimeRange={false}
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Controls row: query selector + time range + granularity */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Query selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <span className="max-w-[240px] truncate">
              {selectedQuery?.query_text ?? "Select a query…"}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                "text-gray-400 transition-transform",
                dropdownOpen && "rotate-180",
              )}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {queryList.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">
                  No queries available
                </div>
              ) : (
                queryList.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQueryId(q.id);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-blue-50",
                      q.id === selectedQueryId
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-700",
                    )}
                  >
                    <span className="truncate">{q.query_text}</span>
                    <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                      {q.priority}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Time range pills */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                rangeDays === r.days
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-100",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Granularity selector */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          {(["daily", "weekly", "monthly"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                granularity === g
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:bg-gray-100",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ChartContainer
        title={
          selectedQuery
            ? `"${selectedQuery.query_text}"`
            : "Ranking Trend"
        }
        subtitle={`${rangeDays}-day ${granularity} trend — rank 1 at top, N/A at bottom`}
        span="full"
      >
        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : (
          <RankTrendChart data={trendData} brands={brands} height={400} />
        )}
      </ChartContainer>
    </div>
  );
}

export default function TrendsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      }
    >
      <TrendsContent />
    </Suspense>
  );
}
