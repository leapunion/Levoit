"use client";

/**
 * Competitor Comparison page — R-FE-03
 *
 * Table: rows=queries, columns=Levoit/Dyson/Coway/Honeywell/Gap
 * Color coded: green (Levoit leads), red (competitor leads), gray (not found)
 * Click row → navigate to platform breakdown /visibility/[queryId]
 */

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getTabsForPath } from "@/lib/navigation";
import { ComparisonTable } from "@/components/charts/comparison-table";
import { scores } from "@/lib/api";
import { MOCK_COMPARISON } from "@/lib/mock/visibility";
import type { ComparisonRow } from "@/lib/types";

export default function ComparisonPage() {
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scores.comparison();
      setRows(data);
    } catch {
      // Fallback to mock data
      setRows(MOCK_COMPARISON);
      setError("Backend unavailable — showing demo data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary stats
  const leading = rows.filter((r) => r.competitive_gap > 0).length;
  const trailing = rows.filter((r) => r.competitive_gap < 0).length;
  const tied = rows.filter((r) => r.competitive_gap === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Comparison"
        description="Levoit vs Dyson vs Coway vs Honeywell — visibility score per query"
        tabs={getTabsForPath("/visibility")}
        showTimeRange={false}
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Summary strip */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {rows.length} queries monitored
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
            {leading} leading
          </span>
          <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-600">
            {trailing} trailing
          </span>
          {tied > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-500">
              {tied} tied
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <ComparisonTable rows={rows} loading={loading} />
      </div>
    </div>
  );
}
