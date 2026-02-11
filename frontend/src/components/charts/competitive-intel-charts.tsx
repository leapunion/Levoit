"use client";

import ReactECharts from "echarts-for-react";

const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
  Blueair: "#9C27B0",
  Winix: "#FF9800",
};

const BRANDS = Object.keys(BRAND_COLORS);

const AI_PLATFORMS = ["ChatGPT", "Perplexity", "Google AI", "Gemini", "Copilot"];

/* ── Market Share Donut ──────────────────────────────────── */
export function MarketShareDonut({ height = 288 }: { height?: number }) {
  const data = [
    { value: 28, name: "Levoit" },
    { value: 24, name: "Dyson" },
    { value: 16, name: "Coway" },
    { value: 14, name: "Honeywell" },
    { value: 10, name: "Blueair" },
    { value: 8, name: "Winix" },
  ];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c}% ({d}%)" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "42%"],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
      data: data.map((d) => ({ ...d, itemStyle: { color: BRAND_COLORS[d.name] } })),
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Share by Platform Grouped Bar ───────────────────────── */
export function ShareByPlatformGroupedBar({ height = 288 }: { height?: number }) {
  const shareData: Record<string, number[]> = {
    Levoit: [32, 26, 30, 24, 22],
    Dyson: [25, 28, 22, 26, 24],
    Coway: [16, 14, 18, 15, 17],
    Honeywell: [12, 15, 14, 16, 18],
    Blueair: [9, 10, 10, 12, 11],
    Winix: [6, 7, 6, 7, 8],
  };

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 48, left: 80 },
    yAxis: { type: "category", data: AI_PLATFORMS, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    xAxis: { type: "value", max: 40, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: BRANDS.map((brand) => ({
      name: brand,
      type: "bar",
      data: shareData[brand],
      itemStyle: { color: BRAND_COLORS[brand] },
      barWidth: 8,
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Share by Product Category Bar ───────────────────────── */
export function ShareByProductBar({ height = 256 }: { height?: number }) {
  const categories = ["Air Purifiers", "Humidifiers", "Tower Fans", "Air Quality Monitors"];
  const shareData: Record<string, number[]> = {
    Levoit: [30, 35, 22, 18],
    Dyson: [26, 12, 38, 24],
    Coway: [18, 8, 5, 12],
    Honeywell: [14, 20, 18, 28],
    Blueair: [8, 5, 4, 10],
    Winix: [4, 6, 3, 8],
  };

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 48, left: 140 },
    yAxis: { type: "category", data: categories, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    xAxis: { type: "value", max: 50, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: BRANDS.map((brand) => ({
      name: brand,
      type: "bar",
      stack: "total",
      data: shareData[brand],
      itemStyle: { color: BRAND_COLORS[brand] },
      barWidth: 24,
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Brand Radar ─────────────────────────────────────────── */
export function BrandRadar({ height = 320 }: { height?: number }) {
  const dimensions = ["SoA", "Sentiment", "Citations", "Stability", "Coverage"];
  const brandData: Record<string, number[]> = {
    Levoit: [78, 82, 70, 85, 74],
    Dyson: [72, 68, 82, 78, 80],
    Coway: [55, 75, 50, 70, 58],
    Honeywell: [48, 60, 55, 65, 62],
  };

  const option: Record<string, unknown> = {
    tooltip: {},
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    radar: {
      indicator: dimensions.map((d) => ({ name: d, max: 100 })),
      radius: "60%",
      axisName: { color: "#6B7280", fontSize: 11 },
      splitArea: { areaStyle: { color: ["#fff", "#F9FAFB"] } },
      splitLine: { lineStyle: { color: "#E5E7EB" } },
    },
    series: [{
      type: "radar",
      data: Object.entries(brandData).map(([name, values]) => ({
        name,
        value: values,
        lineStyle: { width: name === "Levoit" ? 3 : 1.5 },
        areaStyle: { opacity: name === "Levoit" ? 0.15 : 0.05 },
        itemStyle: { color: BRAND_COLORS[name] },
      })),
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Head-to-Head Bar ────────────────────────────────────── */
export function HeadToHeadBar({ height = 288 }: { height?: number }) {
  const clusters = [
    "Best for allergies",
    "Quiet purifier",
    "Under $100",
    "Pet odor removal",
    "Wildfire smoke",
    "Smart purifier",
    "Baby room",
    "Large room",
  ];
  const levoitWins = [72, 65, 80, 58, 70, 45, 68, 55];
  const competitorWins = levoitWins.map((v) => 100 - v);

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 8, right: 24, bottom: 40, left: 120 },
    yAxis: { type: "category", data: clusters, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "Levoit Wins", type: "bar", stack: "total", data: levoitWins, itemStyle: { color: BRAND_COLORS.Levoit }, barWidth: 18 },
      { name: "Dyson Wins", type: "bar", stack: "total", data: competitorWins, itemStyle: { color: BRAND_COLORS.Dyson }, barWidth: 18 },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Sentiment Comparison Bar ────────────────────────────── */
export function SentimentComparisonBar({ height = 256 }: { height?: number }) {
  const sentimentData: Record<string, { positive: number; neutral: number; negative: number }> = {
    Levoit: { positive: 68, neutral: 22, negative: 10 },
    Dyson: { positive: 55, neutral: 28, negative: 17 },
    Coway: { positive: 62, neutral: 25, negative: 13 },
    Honeywell: { positive: 48, neutral: 32, negative: 20 },
    Blueair: { positive: 58, neutral: 30, negative: 12 },
    Winix: { positive: 52, neutral: 34, negative: 14 },
  };

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 80 },
    xAxis: { type: "category", data: BRANDS, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "Positive", type: "bar", stack: "total", data: BRANDS.map((b) => sentimentData[b].positive), itemStyle: { color: "#34A853" }, barWidth: 28 },
      { name: "Neutral", type: "bar", stack: "total", data: BRANDS.map((b) => sentimentData[b].neutral), itemStyle: { color: "#D1D5DB" }, barWidth: 28 },
      { name: "Negative", type: "bar", stack: "total", data: BRANDS.map((b) => sentimentData[b].negative), itemStyle: { color: "#EA4335" }, barWidth: 28 },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Competitive Rank Trend (30d line) ───────────────────── */
export function CompetitiveRankTrend({ height = 288 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const makeTrend = (base: number, drift: number) =>
    days.map((_, i) => +(base + drift * (i / 30) + (Math.random() - 0.5) * 0.8).toFixed(1));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", inverse: true, min: 1, max: 8, name: "Avg Rank", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "Levoit", base: 2.1, drift: -0.4 },
      { name: "Dyson", base: 2.5, drift: 0.2 },
      { name: "Coway", base: 3.8, drift: 0.1 },
      { name: "Honeywell", base: 4.2, drift: 0.3 },
      { name: "Blueair", base: 5.0, drift: -0.2 },
      { name: "Winix", base: 5.5, drift: 0.5 },
    ].map(({ name, base, drift }) => ({
      name,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: name === "Levoit" ? 3 : 1.5 },
      data: makeTrend(base, drift),
      itemStyle: { color: BRAND_COLORS[name] },
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Mention Volume Trend (area stacked) ─────────────────── */
export function MentionVolumeTrend({ height = 288 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const makeVolume = (base: number, growth: number) =>
    days.map((_, i) => Math.round(base + growth * (i / 30) + (Math.random() - 0.5) * base * 0.2));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 56 },
    xAxis: { type: "category", data: days, boundaryGap: false, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", name: "Mentions", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "Levoit", base: 120, growth: 30 },
      { name: "Dyson", base: 100, growth: 15 },
      { name: "Coway", base: 60, growth: 10 },
      { name: "Honeywell", base: 50, growth: 5 },
      { name: "Blueair", base: 35, growth: 8 },
      { name: "Winix", base: 25, growth: 3 },
    ].map(({ name, base, growth }) => ({
      name,
      type: "line",
      stack: "total",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 0 },
      areaStyle: { opacity: 0.6 },
      data: makeVolume(base, growth),
      itemStyle: { color: BRAND_COLORS[name] },
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Competitive Heatmap (Brand x Query Cluster) ─────────── */
export function CompetitiveHeatmap({ height = 320 }: { height?: number }) {
  const clusters = ["Best for allergies", "Quiet purifier", "Under $100", "Pet odor", "Wildfire smoke", "Smart purifier", "Baby room", "Large room"];
  const data = BRANDS.flatMap((_, bi) =>
    clusters.map((_, ci) => [ci, bi, +(Math.random() * 100).toFixed(0)])
  );

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { data: number[] }) => `${BRANDS[p.data[1]]} × ${clusters[p.data[0]]}<br/>Win Rate: ${p.data[2]}%` },
    grid: { top: 8, right: 80, bottom: 80, left: 80 },
    xAxis: { type: "category", data: clusters, axisLabel: { fontSize: 10, rotate: 35, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "category", data: BRANDS, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    visualMap: { min: 0, max: 100, calculable: false, orient: "vertical", right: 4, top: "center", itemHeight: 160, textStyle: { fontSize: 10, color: "#9CA3AF" }, inRange: { color: ["#FCA5A5", "#FDE68A", "#86EFAC"] } },
    series: [{ type: "heatmap", data, label: { show: true, fontSize: 10, formatter: (p: { data: number[] }) => `${p.data[2]}%` }, itemStyle: { borderWidth: 2, borderColor: "#fff" } }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}
