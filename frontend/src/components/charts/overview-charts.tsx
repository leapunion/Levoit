"use client";

import ReactECharts from "echarts-for-react";

const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
};

/* ── VOC Health Bubble (CEO View) ─────────────────────── */
export function VocHealthBubble({ height = 256 }: { height?: number }) {
  const topics = [
    { name: "Allergies", sod: 38, sentiment: 0.82, mentions: 3200 },
    { name: "Pet Hair", sod: 28, sentiment: 0.75, mentions: 2400 },
    { name: "Noise Level", sod: 22, sentiment: 0.45, mentions: 1800 },
    { name: "Filter Cost", sod: 18, sentiment: 0.35, mentions: 1500 },
    { name: "Wildfire Smoke", sod: 15, sentiment: 0.78, mentions: 1200 },
    { name: "VOC Removal", sod: 12, sentiment: 0.62, mentions: 900 },
    { name: "Smart Features", sod: 10, sentiment: 0.68, mentions: 700 },
    { name: "Baby Room", sod: 8, sentiment: 0.88, mentions: 600 },
  ];

  const option: Record<string, unknown> = {
    tooltip: {
      formatter: (p: { data: number[]; seriesName: string }) =>
        `${topics[p.data[3]]?.name}<br/>SoD: ${p.data[0]}%<br/>Sentiment: ${p.data[1]}<br/>Mentions: ${p.data[2]}`,
    },
    grid: { top: 16, right: 24, bottom: 32, left: 48 },
    xAxis: {
      name: "Share of Discussion %",
      nameLocation: "center",
      nameGap: 24,
      nameTextStyle: { fontSize: 10, color: "#9CA3AF" },
      axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    yAxis: {
      name: "Sentiment",
      nameLocation: "center",
      nameGap: 32,
      nameTextStyle: { fontSize: 10, color: "#9CA3AF" },
      min: 0.2,
      max: 1.0,
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [{
      type: "scatter",
      symbolSize: (data: number[]) => Math.sqrt(data[2]) * 0.8,
      data: topics.map((t, i) => [t.sod, t.sentiment, t.mentions, i]),
      label: { show: true, formatter: (p: { data: number[] }) => topics[p.data[3]]?.name ?? "", fontSize: 10, position: "top", color: "#374151" },
      itemStyle: { color: (p: { data: number[] }) => p.data[1] > 0.6 ? "#4285F4" : p.data[1] > 0.4 ? "#FBBC04" : "#EA4335", opacity: 0.75 },
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Risk Counter-Content Status Donut (CEO View) ─────── */
export function RiskStatusDonut({ height = 224 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [{
      type: "pie",
      radius: ["42%", "68%"],
      center: ["50%", "42%"],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
      data: [
        { value: 23, name: "Covered", itemStyle: { color: "#34A853" } },
        { value: 12, name: "Partial", itemStyle: { color: "#FBBC04" } },
        { value: 12, name: "Missing", itemStyle: { color: "#EA4335" } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Competitive Landscape Grouped Bar (CEO View) ─────── */
export function CompetitiveLandscapeBar({ height = 256 }: { height?: number }) {
  const brands = Object.keys(BRAND_COLORS);
  const sod = [34.2, 28.5, 15.8, 12.3];
  const soa = [41.5, 32.1, 22.4, 18.7];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 90 },
    yAxis: { type: "category", data: brands, axisLabel: { fontSize: 12, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    xAxis: { type: "value", axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      {
        name: "Reddit SoD",
        type: "bar",
        data: sod.map((v, i) => ({ value: v, itemStyle: { color: Object.values(BRAND_COLORS)[i], opacity: 0.6 } })),
        barWidth: 14,
      },
      {
        name: "Rufus SoA",
        type: "bar",
        data: soa.map((v, i) => ({ value: v, itemStyle: { color: Object.values(BRAND_COLORS)[i] } })),
        barWidth: 14,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}
