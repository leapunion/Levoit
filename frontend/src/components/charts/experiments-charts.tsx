"use client";

import ReactECharts from "echarts-for-react";

const COLORS = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC04",
  green: "#34A853",
  purple: "#9C27B0",
  cyan: "#00BCD4",
  orange: "#FF9800",
};

/* ── Experiment Impact Timeline ──────────────────────── */
export function ExperimentImpactTimeline({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 41 + i);
    return d.toISOString().slice(0, 10);
  });

  // Simulated metric: SoA% with visible lifts during experiment windows
  const soaData = days.map((_, i) => {
    let base = 32 + (Math.random() - 0.5) * 2;
    // Exp 1: days 7-21, small lift
    if (i >= 7 && i < 21) base += (i - 7) * 0.3;
    if (i >= 21) base += 4.2;
    // Exp 2: days 24-35, larger lift
    if (i >= 24 && i < 35) base += (i - 24) * 0.25;
    if (i >= 35) base += 2.8;
    return +base.toFixed(1);
  });

  // Risk mention rate (inverse improvement)
  const riskData = days.map((_, i) => {
    let base = 18 - (Math.random() - 0.5) * 1.5;
    if (i >= 7 && i < 21) base -= (i - 7) * 0.2;
    if (i >= 21) base -= 3;
    if (i >= 24) base -= 1;
    return +Math.max(base, 8).toFixed(1);
  });

  // Experiment period markers (markArea)
  const experiments = [
    { name: "Filter cost risk fix", start: days[7], end: days[20], color: "rgba(66,133,244,0.08)" },
    { name: "A+ table update", start: days[24], end: days[34], color: "rgba(52,168,83,0.08)" },
  ];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: { top: 24, right: 16, bottom: 40, left: 48 },
    xAxis: {
      type: "category",
      data: days,
      axisLabel: { fontSize: 10, rotate: 45, interval: 6, color: "#9CA3AF" },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "SoA %",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: COLORS.blue },
        itemStyle: { color: COLORS.blue },
        data: soaData,
        markArea: {
          silent: true,
          data: experiments.map((e) => [
            {
              name: e.name,
              xAxis: e.start,
              itemStyle: { color: e.color },
              label: { show: true, position: "insideTop", fontSize: 9, color: "#6B7280" },
            },
            { xAxis: e.end },
          ]),
        },
      },
      {
        name: "Risk Mentions %",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: COLORS.red },
        itemStyle: { color: COLORS.red },
        data: riskData,
      },
    ],
  };
  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px` }}
      opts={{ renderer: "svg" }}
    />
  );
}

/* ── Success/Failure Distribution (stacked bar) ──────── */
export function SuccessFailureDistribution({ height = 256 }: { height?: number }) {
  const types = ["Risk Fix", "Reddit Diffusion", "Content Update", "Narrative", "Probe A/B"];
  const success = [3, 1, 4, 1, 2];
  const inconclusive = [1, 2, 1, 1, 0];
  const failed = [0, 1, 0, 0, 1];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: { top: 8, right: 16, bottom: 40, left: 120 },
    xAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    yAxis: {
      type: "category",
      data: types,
      axisLabel: { fontSize: 11, color: "#374151" },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [
      {
        name: "Success",
        type: "bar",
        stack: "total",
        data: success,
        itemStyle: { color: COLORS.green },
        barWidth: 18,
        label: { show: true, position: "inside", fontSize: 10, color: "#fff", formatter: (p: { value: number }) => p.value > 0 ? `${p.value}` : "" },
      },
      {
        name: "Inconclusive",
        type: "bar",
        stack: "total",
        data: inconclusive,
        itemStyle: { color: COLORS.yellow },
        label: { show: true, position: "inside", fontSize: 10, color: "#fff", formatter: (p: { value: number }) => p.value > 0 ? `${p.value}` : "" },
      },
      {
        name: "Failed",
        type: "bar",
        stack: "total",
        data: failed,
        itemStyle: { color: COLORS.red },
        label: { show: true, position: "inside", fontSize: 10, color: "#fff", formatter: (p: { value: number }) => p.value > 0 ? `${p.value}` : "" },
      },
    ],
  };
  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px` }}
      opts={{ renderer: "svg" }}
    />
  );
}
