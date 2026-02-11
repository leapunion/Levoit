import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiMetric } from "@/lib/types";

interface KpiCardProps {
  metric: KpiMetric;
}

export function KpiCard({ metric }: KpiCardProps) {
  const { label, value, change, icon, format } = metric;

  const displayValue =
    format === "percent" ? `${value}%` : format === "score" ? value : value.toLocaleString();

  const changeColor =
    change === undefined || change === 0
      ? "text-gray-400"
      : change > 0
        ? "text-emerald-600"
        : "text-red-500";

  const ChangeIcon =
    change === undefined || change === 0
      ? Minus
      : change > 0
        ? TrendingUp
        : TrendingDown;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{displayValue}</span>
        {change !== undefined && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", changeColor)}>
            <ChangeIcon size={12} />
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ── KPI row: renders a horizontal strip of cards ────────── */
export function KpiRow({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-4">
      {metrics.map((m) => (
        <KpiCard key={m.label} metric={m} />
      ))}
    </div>
  );
}
