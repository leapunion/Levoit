"use client";

import ReactECharts from "echarts-for-react";

const PLATFORM_COLORS: Record<string, string> = {
  ChatGPT: "#4285F4",
  Perplexity: "#EA4335",
  "Google AI": "#FBBC04",
  "Rufus": "#34A853",
  Gemini: "#9C27B0",
  Copilot: "#00BCD4",
};

const PRODUCT_COLORS = [
  "#4285F4", "#EA4335", "#FBBC04", "#34A853", "#9C27B0", "#00BCD4", "#FF9800",
];

/* ── Attribution Funnel ──────────────────────────────── */
export function AttributionFunnel({ height = 320 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [{
      type: "funnel",
      left: "10%",
      width: "80%",
      top: 16,
      bottom: 40,
      sort: "descending",
      gap: 4,
      label: { show: true, position: "inside", formatter: "{b}\n{c}", fontSize: 13, color: "#fff" },
      data: [
        { value: 124500, name: "AI Impressions", itemStyle: { color: "#4285F4" } },
        { value: 18200, name: "Clicks", itemStyle: { color: "#00BCD4" } },
        { value: 9400, name: "Sessions", itemStyle: { color: "#FBBC04" } },
        { value: 1860, name: "Add to Cart", itemStyle: { color: "#FF9800" } },
        { value: 742, name: "Purchases", itemStyle: { color: "#34A853" } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Platform Conversion Bar (horizontal) ────────────── */
export function PlatformConversionBar({ height = 256 }: { height?: number }) {
  const platforms = [
    { name: "Google AI", rate: 4.8 },
    { name: "ChatGPT", rate: 3.9 },
    { name: "Perplexity", rate: 3.5 },
    { name: "Rufus", rate: 2.8 },
    { name: "Gemini", rate: 2.1 },
    { name: "Copilot", rate: 1.6 },
  ].sort((a, b) => a.rate - b.rate);

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}%` },
    grid: { top: 8, right: 40, bottom: 8, left: 100 },
    xAxis: { type: "value", max: 6, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    yAxis: { type: "category", data: platforms.map((p) => p.name), axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    series: [{
      type: "bar",
      data: platforms.map((p) => ({
        value: p.rate,
        itemStyle: { color: PLATFORM_COLORS[p.name] || "#607D8B", borderRadius: [0, 4, 4, 0] },
      })),
      barWidth: 18,
      label: { show: true, position: "right", formatter: "{c}%", fontSize: 10, color: "#6B7280" },
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Conversion Trend Line (30d) ─────────────────────── */
export function ConversionTrendLine({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const rate = days.map((_, i) => +(2.8 + i * 0.04 + (Math.random() - 0.5) * 0.6).toFixed(2));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v}%` },
    grid: { top: 24, right: 16, bottom: 32, left: 48 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [{
      name: "Conversion Rate",
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2.5, color: "#4285F4" },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(66,133,244,0.15)" }, { offset: 1, color: "rgba(66,133,244,0)" }] } },
      data: rate,
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Revenue by Channel Bar ──────────────────────────── */
export function RevenueByChannelBar({ height = 256 }: { height?: number }) {
  const channels = [
    { name: "ChatGPT", revenue: 28400 },
    { name: "Google AI", revenue: 22100 },
    { name: "Perplexity", revenue: 15600 },
    { name: "Rufus", revenue: 12800 },
    { name: "Gemini", revenue: 8200 },
    { name: "Copilot", revenue: 4900 },
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: $${p.value.toLocaleString()}` },
    grid: { top: 16, right: 16, bottom: 32, left: 48 },
    xAxis: { type: "category", data: channels.map((c) => c.name), axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`, fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [{
      type: "bar",
      data: channels.map((c) => ({
        value: c.revenue,
        itemStyle: { color: PLATFORM_COLORS[c.name] || "#607D8B", borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: 32,
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Product Revenue Treemap ─────────────────────────── */
export function ProductRevenueTreemap({ height = 256 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: $${p.value.toLocaleString()}` },
    series: [{
      type: "treemap",
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: { show: true, formatter: "{b}\n${c}", fontSize: 12, color: "#fff" },
      data: [
        { name: "Core 300", value: 24800, itemStyle: { color: PRODUCT_COLORS[0] } },
        { name: "Core 400S", value: 18200, itemStyle: { color: PRODUCT_COLORS[1] } },
        { name: "Core 600S", value: 14500, itemStyle: { color: PRODUCT_COLORS[2] } },
        { name: "Vital 200S", value: 11200, itemStyle: { color: PRODUCT_COLORS[3] } },
        { name: "EverestAir", value: 8900, itemStyle: { color: PRODUCT_COLORS[4] } },
        { name: "Classic 300S", value: 7400, itemStyle: { color: PRODUCT_COLORS[5] } },
        { name: "LV600S", value: 5200, itemStyle: { color: PRODUCT_COLORS[6] } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Revenue Trend Area (cumulative) ─────────────────── */
export function RevenueTrendArea({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  let cumulative = 0;
  const revenue = days.map((_, i) => {
    cumulative += 2800 + Math.floor(Math.random() * 1200) + i * 40;
    return cumulative;
  });

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `$${v.toLocaleString()}` },
    grid: { top: 24, right: 16, bottom: 32, left: 64 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`, fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [{
      name: "Cumulative Revenue",
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2.5, color: "#34A853" },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(52,168,83,0.2)" }, { offset: 1, color: "rgba(52,168,83,0)" }] } },
      data: revenue,
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Model Comparison Bar (grouped) ──────────────────── */
export function ModelComparisonBar({ height = 288 }: { height?: number }) {
  const channels = ["ChatGPT", "Google AI", "Perplexity", "Rufus", "Gemini", "Copilot"];
  const firstTouch = [32, 24, 18, 12, 9, 5];
  const lastTouch = [22, 28, 16, 18, 10, 6];
  const linear = [27, 26, 17, 15, 10, 5];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 80 },
    xAxis: { type: "value", max: 40, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    yAxis: { type: "category", data: channels, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    series: [
      { name: "First-touch", type: "bar", data: firstTouch, itemStyle: { color: "#4285F4" }, barWidth: 8 },
      { name: "Last-touch", type: "bar", data: lastTouch, itemStyle: { color: "#EA4335" }, barWidth: 8 },
      { name: "Linear", type: "bar", data: linear, itemStyle: { color: "#FBBC04" }, barWidth: 8 },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Channel Weight Radar ────────────────────────────── */
export function ChannelWeightRadar({ height = 288 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: {},
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    radar: {
      indicator: [
        { name: "ChatGPT", max: 40 },
        { name: "Google AI", max: 40 },
        { name: "Perplexity", max: 40 },
        { name: "Rufus", max: 40 },
        { name: "Gemini", max: 40 },
        { name: "Copilot", max: 40 },
      ],
      radius: "60%",
      axisName: { color: "#374151", fontSize: 11 },
      splitArea: { areaStyle: { color: ["#fff", "#F9FAFB"] } },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [{
      type: "radar",
      data: [
        { name: "First-touch", value: [32, 24, 18, 12, 9, 5], lineStyle: { color: "#4285F4" }, itemStyle: { color: "#4285F4" }, areaStyle: { color: "rgba(66,133,244,0.1)" } },
        { name: "Last-touch", value: [22, 28, 16, 18, 10, 6], lineStyle: { color: "#EA4335" }, itemStyle: { color: "#EA4335" }, areaStyle: { color: "rgba(234,67,53,0.1)" } },
        { name: "Linear", value: [27, 26, 17, 15, 10, 5], lineStyle: { color: "#FBBC04" }, itemStyle: { color: "#FBBC04" }, areaStyle: { color: "rgba(251,188,4,0.1)" } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Model Sensitivity Line (multi-series) ───────────── */
export function ModelSensitivityLine({ height = 256 }: { height?: number }) {
  const windows = ["7d", "14d", "30d", "60d", "90d"];
  const firstTouch = [28, 30, 32, 34, 35];
  const lastTouch = [24, 23, 22, 20, 19];
  const linear = [26, 27, 27, 27, 27];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 24, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: windows, name: "Lookback Window", nameLocation: "center", nameGap: 30, nameTextStyle: { fontSize: 11, color: "#6B7280" }, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "First-touch", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: firstTouch, lineStyle: { width: 2, color: "#4285F4" }, itemStyle: { color: "#4285F4" } },
      { name: "Last-touch", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: lastTouch, lineStyle: { width: 2, color: "#EA4335" }, itemStyle: { color: "#EA4335" } },
      { name: "Linear", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: linear, lineStyle: { width: 2, color: "#FBBC04" }, itemStyle: { color: "#FBBC04" } },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}
