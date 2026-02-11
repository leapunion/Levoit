"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComparisonRow } from "@/lib/types";

interface TopQueriesListProps {
  title: string;
  subtitle: string;
  items: ComparisonRow[];
  variant: "top" | "gap";
  loading?: boolean;
}

export function TopQueriesList({
  title,
  subtitle,
  items,
  variant,
  loading = false,
}: TopQueriesListProps) {
  const isTop = variant === "top";

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-gray-50 px-2 py-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
              <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-400">
            No data available
          </div>
        ) : (
          items.slice(0, 5).map((row, i) => (
            <Link
              key={row.query_id}
              href={`/visibility/trends?query_id=${row.query_id}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                isTop
                  ? "hover:bg-green-50"
                  : "hover:bg-red-50",
              )}
            >
              {/* Rank badge */}
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  isTop
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                {i + 1}
              </span>

              {/* Query text */}
              <span className="flex-1 truncate text-sm text-gray-700 group-hover:text-gray-900">
                {row.query_text}
              </span>

              {/* Score / gap value */}
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isTop ? "text-emerald-600" : "text-red-600",
                )}
              >
                {isTop
                  ? row.levoit_score.toFixed(1)
                  : (row.competitive_gap >= 0 ? "+" : "") +
                    row.competitive_gap.toFixed(1)}
              </span>

              {/* Arrow */}
              <ArrowUpRight
                size={14}
                className="text-gray-300 transition-colors group-hover:text-gray-500"
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
