"use client";

/**
 * Platform Breakdown page — R-FE-04 + R-FE-05
 *
 * Per-platform ranking for a selected query.
 * Bar chart: 3 bars (ChatGPT/Perplexity/Google AI) per brand.
 * Click bar → snippet modal with highlighted brand mention.
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart-container";
import { PlatformBreakdown } from "@/components/charts/platform-breakdown";
import { SnippetModal } from "@/components/charts/snippet-modal";
import { queries, rankings } from "@/lib/api";
import { MOCK_QUERIES, MOCK_RANKINGS } from "@/lib/mock/visibility";
import type { RankingResponse, VisQueryResponse } from "@/lib/types";

interface Props {
  params: Promise<{ queryId: string }>;
}

export default function PlatformBreakdownPage({ params }: Props) {
  const { queryId } = use(params);
  const qid = Number(queryId);

  const [query, setQuery] = useState<VisQueryResponse | null>(null);
  const [rankingData, setRankingData] = useState<RankingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRanking, setSelectedRanking] = useState<RankingResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, r] = await Promise.all([
        queries.get(qid),
        rankings.latest(qid),
      ]);
      setQuery(q);
      setRankingData(r);
    } catch {
      // Fallback to mock data
      const mockQuery = MOCK_QUERIES.find((q) => q.id === qid) ?? MOCK_QUERIES[0];
      const mockRankings = MOCK_RANKINGS[qid] ?? MOCK_RANKINGS[1] ?? [];
      setQuery(mockQuery);
      setRankingData(mockRankings);
      setError("Backend unavailable — showing demo data");
    } finally {
      setLoading(false);
    }
  }, [qid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const brands = query?.brands ?? [];

  return (
    <div className="space-y-6">
      {/* Back link + title */}
      <div>
        <Link
          href="/visibility/comparison"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft size={14} />
          Back to Comparison
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {query ? `"${query.query_text}"` : "Platform Breakdown"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-platform ranking — click a bar to view the AI response snippet
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Platform breakdown chart */}
      <ChartContainer
        title="Ranking by Platform"
        subtitle="Rank position per brand on each AI platform (1 = best)"
        span="full"
      >
        {loading ? (
          <div className="flex h-[350px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : (
          <PlatformBreakdown
            rankings={rankingData}
            brands={brands}
            height={350}
            onBarClick={setSelectedRanking}
          />
        )}
      </ChartContainer>

      {/* Rankings detail table */}
      {!loading && rankingData.length > 0 && (
        <ChartContainer title="Latest Rankings" subtitle="Most recent scrape per platform + brand" span="full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Platform</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Brand</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Rank</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Snippet</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Scraped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankingData.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRanking(r)}
                    className="cursor-pointer transition-colors hover:bg-blue-50"
                  >
                    <td className="px-4 py-2 capitalize text-gray-700">{r.platform.replace("_", " ")}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{r.brand}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block min-w-[32px] rounded px-2 py-0.5 text-xs font-bold ${
                        r.rank_position === 0
                          ? "bg-gray-100 text-gray-400"
                          : r.rank_position <= 2
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        {r.rank_position === 0 ? "N/A" : `#${r.rank_position}`}
                      </span>
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-2 text-gray-500">
                      {r.snippet ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-gray-400">
                      {new Date(r.scraped_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}

      {/* Snippet modal */}
      {selectedRanking && (
        <SnippetModal
          ranking={selectedRanking}
          onClose={() => setSelectedRanking(null)}
        />
      )}
    </div>
  );
}
