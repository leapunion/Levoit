"use client";

import ReactECharts from "echarts-for-react";

const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
  Blueair: "#9C27B0",
};

const INTENT_COLORS = { A1: "#4285F4", A2: "#FBBC04", A3: "#34A853" };

/* ── SoA Trend Line (Share of Answer) ─────────────────── */
export function SoaTrendLine({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const makeTrend = (base: number, drift: number) =>
    days.map((_, i) => +(base + drift * (i / 30) + (Math.random() - 0.5) * 3).toFixed(1));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v}%` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: Object.entries(BRAND_COLORS).slice(0, 4).map(([name, color]) => ({
      name,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: name === "Levoit" ? 3 : 1.5 },
      data: makeTrend(name === "Levoit" ? 41 : name === "Dyson" ? 35 : name === "Coway" ? 28 : 18, name === "Levoit" ? -1.3 : 1),
      itemStyle: { color },
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Stability Heatmap (Share of Answer) ──────────────── */
export function StabilityHeatmap({ height = 256 }: { height?: number }) {
  const clusters = ["Best for allergies", "Levoit vs Dyson", "Pet odor removal", "Quiet purifier", "Under $100", "Wildfire smoke"];
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return d.toISOString().slice(5, 10);
  });
  const data = clusters.flatMap((_, ci) =>
    days.map((_, di) => [di, ci, +(0.5 + Math.random() * 0.5).toFixed(2)])
  );

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { data: number[] }) => `${clusters[p.data[1]]}<br/>${days[p.data[0]]}: ${p.data[2]}` },
    grid: { top: 8, right: 16, bottom: 32, left: 120 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "category", data: clusters, axisLabel: { fontSize: 10, color: "#6B7280" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    visualMap: { min: 0.5, max: 1, calculable: false, orient: "horizontal", left: "center", bottom: 4, itemWidth: 12, itemHeight: 80, textStyle: { fontSize: 10, color: "#9CA3AF" }, inRange: { color: ["#FCA5A5", "#FDE68A", "#86EFAC"] } },
    series: [{ type: "heatmap", data, label: { show: false }, itemStyle: { borderWidth: 2, borderColor: "#fff" } }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── SoA by Query Cluster Bar (Share of Answer) ───────── */
export function SoaByClusterBar({ height = 256 }: { height?: number }) {
  const clusters = [
    { name: "Best for allergies", soa: 62, intent: "A1" },
    { name: "Quiet purifier bedroom", soa: 55, intent: "A1" },
    { name: "Levoit vs Coway", soa: 48, intent: "A2" },
    { name: "Wildfire smoke", soa: 71, intent: "A2" },
    { name: "Pet odor removal", soa: 44, intent: "A1" },
    { name: "Under $100", soa: 38, intent: "A3" },
    { name: "Smart purifier", soa: 29, intent: "A1" },
    { name: "Levoit vs Dyson", soa: 35, intent: "A2" },
    { name: "Baby room purifier", soa: 52, intent: "A1" },
    { name: "Filter replacement", soa: 22, intent: "A3" },
  ].sort((a, b) => b.soa - a.soa);

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}%` },
    grid: { top: 8, right: 24, bottom: 8, left: 140 },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    yAxis: { type: "category", data: clusters.map((c) => c.name), axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    series: [{
      type: "bar",
      data: clusters.map((c) => ({ value: c.soa, itemStyle: { color: INTENT_COLORS[c.intent as keyof typeof INTENT_COLORS] } })),
      barWidth: 16,
      markLine: { silent: true, symbol: "none", lineStyle: { color: "#EF4444", type: "dashed" }, data: [{ xAxis: 50, label: { formatter: "Parity", fontSize: 10 } }] },
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Intent Funnel (Query Clusters) ───────────────────── */
export function IntentFunnel({ height = 288 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c} clusters" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [{
      type: "funnel",
      left: "15%",
      width: "70%",
      top: 16,
      bottom: 40,
      sort: "none",
      gap: 4,
      label: { show: true, position: "inside", formatter: "{b}\n{c}", fontSize: 13, color: "#fff" },
      data: [
        { value: 18, name: "A1 Research", itemStyle: { color: INTENT_COLORS.A1 } },
        { value: 20, name: "A2 Evaluation", itemStyle: { color: INTENT_COLORS.A2 } },
        { value: 10, name: "A3 Purchase", itemStyle: { color: INTENT_COLORS.A3 } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Probe Result Scatter (Probe Runner) ──────────────── */
export function ProbeResultScatter({ height = 256 }: { height?: number }) {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + Math.floor(i / 4));
    d.setHours(6 * (i % 4));
    return d.toISOString().slice(0, 16).replace("T", " ");
  });
  const present = hours.map((t, i) => ({ value: [t, Math.floor(Math.random() * 3) + 1], present: Math.random() > 0.25, idx: i }));

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { data: { value: [string, number]; present: boolean } }) => `${p.data.value[0]}<br/>Rank: ${p.data.value[1]}<br/>${p.data.present ? "✓ Present" : "✗ Absent"}` },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 16, right: 16, bottom: 40, left: 48 },
    xAxis: { type: "category", data: hours, axisLabel: { fontSize: 9, rotate: 45, interval: 3, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", inverse: true, min: 1, max: 5, name: "Rank", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [
      { name: "Present", type: "scatter", symbolSize: 14, data: present.filter((p) => p.present).map((p) => ({ value: p.value, present: true })), itemStyle: { color: "#34A853" } },
      { name: "Absent", type: "scatter", symbolSize: 14, symbol: "diamond", data: present.filter((p) => !p.present).map((p) => ({ value: p.value, present: false })), itemStyle: { color: "#EA4335" } },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Claim Citation Bar (Probe Runner) ────────────────── */
export function ClaimCitationBar({ height = 256 }: { height?: number }) {
  const claims = [
    { name: "True HEPA H13", count: 34 },
    { name: "3-stage filtration", count: 28 },
    { name: "QuietKEAP tech", count: 19 },
    { name: "24dB sleep mode", count: 17 },
    { name: "Covers 1095 sq ft", count: 14 },
    { name: "Smart WiFi control", count: 11 },
    { name: "Filter lasts 6-8 mo", count: 9 },
    { name: "Energy Star certified", count: 7 },
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value} citations` },
    grid: { top: 8, right: 24, bottom: 8, left: 130 },
    xAxis: { type: "value", axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    yAxis: { type: "category", data: claims.map((c) => c.name).reverse(), axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    series: [{
      type: "bar",
      data: claims.map((c) => c.count).reverse(),
      barWidth: 16,
      itemStyle: { color: "#4285F4", borderRadius: [0, 4, 4, 0] },
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Asset Type Stacked Bar (Content Assets) ──────────── */
export function AssetTypeBar({ height = 256 }: { height?: number }) {
  const types = ["Listing Title", "Bullet Points", "A+ Table", "A+ Compare", "Q&A", "Review Cluster"];
  const cited = [8, 12, 6, 4, 9, 4];
  const notCited = [4, 18, 10, 8, 45, 28];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 8, right: 16, bottom: 40, left: 100 },
    xAxis: { type: "value", axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    yAxis: { type: "category", data: types, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    series: [
      { name: "Rufus-Cited", type: "bar", stack: "total", data: cited, itemStyle: { color: "#34A853" }, barWidth: 18 },
      { name: "Not Cited", type: "bar", stack: "total", data: notCited, itemStyle: { color: "#E5E7EB" }, barWidth: 18 },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Asset → Claim → Topic Sankey (Content Assets) ────── */
export function AssetClaimSankey({ height = 256 }: { height?: number }) {
  const nodes = [
    { name: "Bullet Points" }, { name: "A+ Table" }, { name: "Q&A" }, { name: "Review Cluster" },
    { name: "True HEPA" }, { name: "Quiet 24dB" }, { name: "3-Stage Filter" }, { name: "Smart WiFi" },
    { name: "Allergies" }, { name: "Noise" }, { name: "Filter Cost" }, { name: "Pet Hair" },
  ];
  const links = [
    { source: "Bullet Points", target: "True HEPA", value: 12 },
    { source: "Bullet Points", target: "3-Stage Filter", value: 8 },
    { source: "A+ Table", target: "Quiet 24dB", value: 10 },
    { source: "A+ Table", target: "True HEPA", value: 6 },
    { source: "Q&A", target: "3-Stage Filter", value: 9 },
    { source: "Q&A", target: "Smart WiFi", value: 5 },
    { source: "Review Cluster", target: "Quiet 24dB", value: 7 },
    { source: "True HEPA", target: "Allergies", value: 14 },
    { source: "True HEPA", target: "Pet Hair", value: 4 },
    { source: "Quiet 24dB", target: "Noise", value: 15 },
    { source: "3-Stage Filter", target: "Allergies", value: 6 },
    { source: "3-Stage Filter", target: "Filter Cost", value: 11 },
    { source: "Smart WiFi", target: "Noise", value: 3 },
    { source: "Smart WiFi", target: "Allergies", value: 2 },
  ];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [{
      type: "sankey",
      layout: "none",
      emphasis: { focus: "adjacency" },
      nodeAlign: "justify",
      nodeGap: 10,
      nodeWidth: 18,
      lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.4 },
      data: nodes,
      links,
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Claim Match Donut (Narrative Analysis) ───────────── */
export function ClaimMatchDonut({ height = 256 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
      data: [
        { value: 31, name: "Correct", itemStyle: { color: "#34A853" } },
        { value: 8, name: "Partially Correct", itemStyle: { color: "#FBBC04" } },
        { value: 3, name: "Incorrect", itemStyle: { color: "#EA4335" } },
        { value: 1, name: "Outdated", itemStyle: { color: "#9CA3AF" } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Comparator Network Graph (Narrative Analysis) ────── */
export function ComparatorGraph({ height = 256 }: { height?: number }) {
  const nodes = [
    { name: "Levoit", symbolSize: 50, itemStyle: { color: BRAND_COLORS.Levoit }, x: 300, y: 200 },
    { name: "Dyson", symbolSize: 38, itemStyle: { color: BRAND_COLORS.Dyson }, x: 150, y: 80 },
    { name: "Coway", symbolSize: 34, itemStyle: { color: BRAND_COLORS.Coway }, x: 450, y: 80 },
    { name: "Honeywell", symbolSize: 28, itemStyle: { color: BRAND_COLORS.Honeywell }, x: 150, y: 320 },
    { name: "Blueair", symbolSize: 24, itemStyle: { color: BRAND_COLORS.Blueair }, x: 450, y: 320 },
    { name: "Winix", symbolSize: 20, itemStyle: { color: "#FF9800" }, x: 300, y: 380 },
  ];
  const links = [
    { source: "Levoit", target: "Dyson", value: 42, lineStyle: { width: 4 } },
    { source: "Levoit", target: "Coway", value: 31, lineStyle: { width: 3 } },
    { source: "Levoit", target: "Honeywell", value: 18, lineStyle: { width: 2 } },
    { source: "Levoit", target: "Blueair", value: 12, lineStyle: { width: 1.5 } },
    { source: "Levoit", target: "Winix", value: 8, lineStyle: { width: 1 } },
    { source: "Dyson", target: "Coway", value: 14, lineStyle: { width: 1.5 } },
    { source: "Honeywell", target: "Winix", value: 6, lineStyle: { width: 1 } },
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { dataType: string; data: { name?: string; source?: string; target?: string; value?: number } }) => p.dataType === "node" ? p.data.name : `${p.data.source} ↔ ${p.data.target}: ${p.data.value} co-appearances` },
    series: [{
      type: "graph",
      layout: "none",
      roam: false,
      label: { show: true, fontSize: 11, color: "#374151" },
      edgeSymbol: ["none", "none"],
      lineStyle: { color: "#D1D5DB", curveness: 0.1 },
      emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
      data: nodes,
      links,
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Risk Surfacing Table (Narrative Analysis) ────────── */
export function RiskSurfacingTable() {
  const risks = [
    { statement: "Filter replacement is expensive", freq: 34, source: "Reddit", counter: "covered" },
    { statement: "Noise level at max speed is loud", freq: 28, source: "Review", counter: "covered" },
    { statement: "Doesn't truly remove VOCs", freq: 22, source: "Reddit", counter: "missing" },
    { statement: "Ultrasonic white dust", freq: 18, source: "Reddit", counter: "partial" },
    { statement: "WiFi setup is unreliable", freq: 15, source: "Review", counter: "partial" },
    { statement: "Smaller room coverage than advertised", freq: 11, source: "Unknown", counter: "missing" },
  ];
  const statusColor = { covered: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", missing: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-1.5 text-sm">
      <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-1.5 text-xs font-medium uppercase text-gray-400">
        <span>Risk Statement</span><span>Freq</span><span>Source</span><span>Counter</span>
      </div>
      {risks.map((r) => (
        <div key={r.statement} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 rounded border border-gray-100 px-3 py-2.5 items-center">
          <span className="text-gray-700">{r.statement}</span>
          <span className="text-gray-500">{r.freq}×</span>
          <span className="text-xs text-gray-400">{r.source}</span>
          <span className={`rounded px-2 py-0.5 text-center text-[10px] font-bold ${statusColor[r.counter as keyof typeof statusColor]}`}>{r.counter.toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Probe Execution Bar+Line (Overview Ops View) ─────── */
export function ProbeExecutionChart({ height = 256 }: { height?: number }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const probeCount = [22, 24, 20, 26, 25, 18, 21];
  const successRate = [95.5, 91.7, 100, 92.3, 96.0, 94.4, 95.2];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 24, right: 48, bottom: 40, left: 48 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 11, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: [
      { type: "value", name: "Probes", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
      { type: "value", name: "Rate %", min: 80, max: 100, nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { show: false } },
    ],
    series: [
      { name: "Probe Runs", type: "bar", data: probeCount, barWidth: 24, itemStyle: { color: "#4285F4", borderRadius: [4, 4, 0, 0] } },
      { name: "Success Rate", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 6, lineStyle: { width: 2, color: "#34A853" }, itemStyle: { color: "#34A853" }, data: successRate },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Claim Match Trend Line (Overview Content View) ───── */
export function ClaimMatchTrendLine({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const score = days.map((_, i) => +(65 + i * 0.3 + (Math.random() - 0.5) * 4).toFixed(1));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v}%` },
    grid: { top: 24, right: 16, bottom: 32, left: 48 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, rotate: 45, interval: 4, color: "#9CA3AF" }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", min: 50, max: 100, axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    series: [{
      name: "Claim Match",
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2.5, color: "#4285F4" },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(66,133,244,0.2)" }, { offset: 1, color: "rgba(66,133,244,0)" }] } },
      data: score,
      markLine: { silent: true, symbol: "none", lineStyle: { color: "#34A853", type: "dashed" }, data: [{ yAxis: 73, label: { formatter: "Current: 73%", fontSize: 10 } }] },
    }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Coverage Gap Table (Query Clusters) ──────────────── */
export function CoverageGapTable() {
  const gaps = [
    { topic: "Humidifier warm vs cool mist", volume: 2840, suggested: "Mist type comparison", action: "Create cluster" },
    { topic: "Air purifier ozone emission", volume: 1920, suggested: "Safety concerns", action: "Create cluster" },
    { topic: "HEPA vs ionic purifier", volume: 1560, suggested: "Technology comparison", action: "Map to A1-tech" },
    { topic: "Smart home integration quality", volume: 1200, suggested: "Smart features", action: "Create cluster" },
    { topic: "Air purifier for cigar smoke", volume: 980, suggested: "Smoke removal", action: "Map to A1-smoke" },
  ];

  return (
    <div className="space-y-1.5 text-sm">
      <div className="grid grid-cols-[1fr_80px_140px_120px] gap-2 px-3 py-1.5 text-xs font-medium uppercase text-gray-400">
        <span>Reddit Topic</span><span>Mentions</span><span>Suggested Cluster</span><span>Action</span>
      </div>
      {gaps.map((g) => (
        <div key={g.topic} className="grid grid-cols-[1fr_80px_140px_120px] gap-2 rounded border border-gray-100 px-3 py-2.5 items-center">
          <span className="text-gray-700">{g.topic}</span>
          <span className="text-gray-500">{g.volume.toLocaleString()}</span>
          <span className="text-xs text-gray-500">{g.suggested}</span>
          <button className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">{g.action}</button>
        </div>
      ))}
    </div>
  );
}
