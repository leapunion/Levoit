"use client";

import ReactECharts from "echarts-for-react";
import type { RankingResponse } from "@/lib/types";

/** Platform display config */
const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  chatgpt: { label: "ChatGPT", color: "#10B981" },
  perplexity: { label: "Perplexity", color: "#8B5CF6" },
  google_ai: { label: "Google AI", color: "#F59E0B" },
};

/** Brand colors (Google VI) */
const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
};

interface PlatformBreakdownProps {
  rankings: RankingResponse[];
  brands: string[];
  height?: number;
  onBarClick?: (ranking: RankingResponse) => void;
}

export function PlatformBreakdown({
  rankings,
  brands,
  height = 350,
  onBarClick,
}: PlatformBreakdownProps) {
  if (rankings.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        No ranking data available for this query.
      </div>
    );
  }

  // Group: platform → brand → rank
  const platforms = Object.keys(PLATFORM_CONFIG);
  const platformLabels = platforms.map((p) => PLATFORM_CONFIG[p].label);

  const option: Record<string, unknown> = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: Array<{ seriesName: string; value: number; axisValueLabel: string }>) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const platform = params[0].axisValueLabel;
        const lines = params
          .filter((p) => p.value > 0)
          .map(
            (p) => `<span style="color:${BRAND_COLORS[p.seriesName] ?? "#666"}">●</span> ${p.seriesName}: <b>#${p.value}</b>`,
          );
        if (lines.length === 0) return `<b>${platform}</b><br/>No data`;
        return `<b>${platform}</b><br/>${lines.join("<br/>")}`;
      },
    },
    legend: {
      data: brands,
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 50,
      left: 20,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: platformLabels,
      axisLabel: { fontSize: 12, color: "#6B7280" },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      inverse: true,
      min: 0,
      max: 6,
      interval: 1,
      axisLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        formatter: (v: number) => (v === 0 ? "N/A" : `#${v}`),
      },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } },
    },
    series: brands.map((brand) => ({
      name: brand,
      type: "bar",
      barGap: "10%",
      itemStyle: {
        color: BRAND_COLORS[brand] ?? "#607D8B",
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: { itemStyle: { opacity: 0.8 } },
      data: platforms.map((platform) => {
        const r = rankings.find(
          (rk) => rk.platform === platform && rk.brand === brand,
        );
        return r ? r.rank_position : 0;
      }),
    })),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: "100%" }}
      opts={{ renderer: "svg" }}
      onEvents={
        onBarClick
          ? {
              click: (params: { seriesName: string; dataIndex: number }) => {
                const brand = params.seriesName;
                const platform = platforms[params.dataIndex];
                const ranking = rankings.find(
                  (r) => r.platform === platform && r.brand === brand,
                );
                if (ranking) onBarClick(ranking);
              },
            }
          : undefined
      }
    />
  );
}
