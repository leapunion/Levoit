"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilityScoreCardProps {
  score: number;
  previousScore: number | null;
  period: string;
  onPeriodChange: (period: string) => void;
  loading?: boolean;
}

const PERIODS = [
  { label: "Day", value: "daily" },
  { label: "Week", value: "weekly" },
  { label: "Month", value: "monthly" },
];

export function VisibilityScoreCard({
  score,
  previousScore,
  period,
  onPeriodChange,
  loading = false,
}: VisibilityScoreCardProps) {
  const delta =
    previousScore != null && previousScore > 0
      ? ((score - previousScore) / previousScore) * 100
      : null;

  const DeltaIcon =
    delta == null || delta === 0
      ? Minus
      : delta > 0
        ? TrendingUp
        : TrendingDown;

  const deltaColor =
    delta == null || delta === 0
      ? "text-gray-400"
      : delta > 0
        ? "text-emerald-600"
        : "text-red-500";

  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-8 py-8">
      {/* Period selector */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Score */}
      {loading ? (
        <div className="flex h-24 items-center">
          <div className="h-16 w-32 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : (
        <>
          <span className="text-7xl font-bold tabular-nums text-brand-blue">
            {score.toFixed(1)}
          </span>
          <span className="mt-1 text-sm text-gray-400">
            AI Visibility Score
          </span>
        </>
      )}

      {/* Delta badge */}
      {delta != null && !loading && (
        <div
          className={cn(
            "mt-4 flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
            delta > 0
              ? "bg-emerald-50 text-emerald-700"
              : delta < 0
                ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-500",
          )}
        >
          <DeltaIcon size={14} />
          <span>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}% vs prev {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}
          </span>
        </div>
      )}
    </div>
  );
}
