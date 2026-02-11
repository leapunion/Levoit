"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComparisonRow } from "@/lib/types";

interface ComparisonTableProps {
  rows: ComparisonRow[];
  loading?: boolean;
}

const BRANDS = ["levoit", "dyson", "coway", "honeywell"] as const;

const BRAND_LABELS: Record<string, string> = {
  levoit: "Levoit",
  dyson: "Dyson",
  coway: "Coway",
  honeywell: "Honeywell",
};

function scoreKey(brand: string): keyof ComparisonRow {
  return `${brand}_score` as keyof ComparisonRow;
}

/** Color cell based on score relative to Levoit. */
function cellClass(score: number, levoit: number, isLevoit: boolean): string {
  if (score === 0) return "bg-gray-50 text-gray-400";
  if (isLevoit) {
    return levoit >= score ? "bg-blue-50 text-blue-700" : "bg-blue-50 text-blue-700";
  }
  if (score > levoit) return "bg-red-50 text-red-600";
  if (score === levoit) return "bg-gray-50 text-gray-600";
  return "bg-green-50 text-green-700";
}

function gapClass(gap: number): string {
  if (gap > 0) return "text-green-700 bg-green-50";
  if (gap < 0) return "text-red-600 bg-red-50";
  return "text-gray-500 bg-gray-50";
}

export function ComparisonTable({ rows, loading = false }: ComparisonTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No comparison data available. Run a pipeline to generate scores.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-500">Query</th>
            {BRANDS.map((b) => (
              <th key={b} className="px-4 py-3 text-center font-medium text-gray-500">
                {BRAND_LABELS[b]}
              </th>
            ))}
            <th className="px-4 py-3 text-center font-medium text-gray-500">Gap</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const levoit = row.levoit_score;
            return (
              <tr
                key={row.query_id}
                className="group transition-colors hover:bg-gray-50"
              >
                {/* Query text */}
                <td className="max-w-[240px] truncate px-4 py-3 font-medium text-gray-800">
                  {row.query_text}
                </td>

                {/* Brand score cells */}
                {BRANDS.map((b) => {
                  const score = row[scoreKey(b)] as number;
                  const isLevoit = b === "levoit";
                  return (
                    <td key={b} className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block min-w-[48px] rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                          cellClass(score, levoit, isLevoit),
                        )}
                      >
                        {score === 0 ? "—" : score.toFixed(1)}
                      </span>
                    </td>
                  );
                })}

                {/* Gap */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "inline-block min-w-[56px] rounded-md px-2 py-1 text-xs font-bold tabular-nums",
                      gapClass(row.competitive_gap),
                    )}
                  >
                    {row.competitive_gap > 0 ? "+" : ""}
                    {row.competitive_gap.toFixed(1)}
                  </span>
                </td>

                {/* Arrow link */}
                <td className="px-2 py-3">
                  <Link
                    href={`/visibility/${row.query_id}`}
                    className="text-gray-300 transition-colors group-hover:text-blue-500"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
