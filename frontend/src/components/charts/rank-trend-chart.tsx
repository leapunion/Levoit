"use client";

import ReactECharts from "echarts-for-react";
import type { TrendPoint } from "@/lib/types";

/** Google VI brand colors per spec */
const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
};

const DEFAULT_COLOR = "#607D8B";

interface RankTrendChartProps {
  data: TrendPoint[];
  brands: string[];
  height?: number;
}

export function RankTrendChart({
  data,
  brands,
  height = 400,
}: RankTrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        No trend data available. Run a pipeline to generate data.
      </div>
    );
  }

  const option: Record<string, unknown> = {
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ seriesName: string; value: [string, number]; color: string }>) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const date = new Date(params[0].value[0]).toLocaleDateString();
        const lines = params.map((p) => {
          const rank = p.value[1];
          const display = rank === 0 ? "N/A" : `#${rank.toFixed(1)}`;
          return `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${display}</b>`;
        });
        return `<b>${date}</b><br/>${lines.join("<br/>")}`;
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
      left: 50,
      containLabel: false,
    },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 11,
        color: "#9CA3AF",
      },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
      splitLine: { show: false },
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
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2.5 },
      itemStyle: { color: BRAND_COLORS[brand] ?? DEFAULT_COLOR },
      emphasis: { focus: "series" },
      data: data
        .filter((t) => t.brand === brand)
        .map((t) => [t.timestamp, Math.round(t.avg_rank * 10) / 10]),
    })),
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
