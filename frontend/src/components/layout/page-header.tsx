"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar } from "lucide-react";
import { TIME_RANGES, type TimeRange, type NavRouteTab } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  tabs?: NavRouteTab[];
  /** show intent layer toggle (A1/A2/A3) */
  showIntentFilter?: boolean;
  /** show time range selector */
  showTimeRange?: boolean;
}

/* ── Time range pills ────────────────────────────────────── */
function TimeRangeSelector({ selected = "30d" }: { selected?: TimeRange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
      <Calendar size={14} className="ml-2 text-gray-400" />
      {TIME_RANGES.map((r) => (
        <button
          key={r}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            r === selected
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/* ── Intent layer toggle (A1/A2/A3) ─────────────────────── */
function IntentFilter() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
      <span className="ml-2 text-xs text-gray-400">Intent:</span>
      {[
        { id: "all", label: "All", color: "" },
        { id: "A1", label: "A1", color: "bg-blue-500" },
        { id: "A2", label: "A2", color: "bg-yellow-500" },
        { id: "A3", label: "A3", color: "bg-green-500" },
      ].map((l) => (
        <button
          key={l.id}
          className={cn(
            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            l.id === "all"
              ? "bg-gray-100 text-gray-700"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          {l.color && <span className={cn("h-2 w-2 rounded-full", l.color)} />}
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ── Page header (exported) ──────────────────────────────── */
export function PageHeader({
  title,
  description,
  tabs,
  showIntentFilter = false,
  showTimeRange = true,
}: PageHeaderProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {showIntentFilter && <IntentFilter />}
          {showTimeRange && <TimeRangeSelector />}
        </div>
      </div>

      {/* Tab bar */}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-0 border-b border-gray-200">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
