"use client";

import ReactECharts from "echarts-for-react";

const BRAND_COLORS: Record<string, string> = {
  Levoit: "#4285F4",
  Dyson: "#EA4335",
  Coway: "#FBBC04",
  Honeywell: "#34A853",
  Blueair: "#9C27B0",
};

/* ── Sentiment Donut (Reddit VOC Overview) ──────────────── */
export function SentimentDonut({ height = 256 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {d}%" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: [
          { value: 65, name: "Positive", itemStyle: { color: "#34A853" } },
          { value: 23, name: "Neutral", itemStyle: { color: "#9CA3AF" } },
          { value: 12, name: "Negative", itemStyle: { color: "#EA4335" } },
        ],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Mention Trends Stacked Area (Reddit VOC Overview) ──── */
export function MentionTrendsArea({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const total = days.map(() => 400 + Math.round(Math.random() * 200));
  const positive = total.map((t) => Math.round(t * (0.6 + Math.random() * 0.1)));
  const negative = total.map((t) => Math.round(t * (0.08 + Math.random() * 0.06)));

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 12, color: "#6B7280" } },
    grid: { top: 10, right: 16, bottom: 40, left: 50 },
    xAxis: {
      type: "category",
      data: days,
      axisLabel: { fontSize: 10, color: "#9CA3AF", formatter: (v: string) => v.slice(5) },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } },
    },
    series: [
      { name: "Total", type: "line", smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 }, itemStyle: { color: "#4285F4" }, symbol: "none", data: total },
      { name: "Positive", type: "line", smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 }, itemStyle: { color: "#34A853" }, symbol: "none", data: positive },
      { name: "Negative", type: "line", smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 }, itemStyle: { color: "#EA4335" }, symbol: "none", data: negative },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Top Pain Points Horizontal Bar (Reddit VOC Overview) ── */
export function PainPointsBar({ height = 192 }: { height?: number }) {
  const data = [
    { name: "Filter replacement cost", value: 312 },
    { name: "Noise at max speed", value: 267 },
    { name: "White dust (ultrasonic)", value: 198 },
    { name: "VOC removal efficacy", value: 176 },
    { name: "App connectivity", value: 154 },
    { name: "Humidity accuracy", value: 132 },
    { name: "Filter availability", value: 118 },
    { name: "Auto mode sensitivity", value: 95 },
  ].reverse();

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { top: 8, right: 40, bottom: 8, left: 160 },
    xAxis: { type: "value", axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } } },
    yAxis: { type: "category", data: data.map((d) => d.name), axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        type: "bar",
        data: data.map((d) => d.value),
        barWidth: 16,
        itemStyle: { color: "#EA4335", borderRadius: [0, 4, 4, 0] },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── SoD by Topic Stacked Bar (Reddit VOC Overview) ─────── */
export function SodByTopicBar({ height = 256 }: { height?: number }) {
  const topics = ["Allergies", "Pet Hair", "Wildfire", "Noise", "Filter Cost", "Smart Home"];
  const brands = ["Levoit", "Dyson", "Coway", "Honeywell", "Blueair"];
  const mockData: Record<string, number[]> = {
    Levoit: [38, 42, 45, 30, 35, 28],
    Dyson: [28, 20, 15, 32, 18, 35],
    Coway: [18, 15, 12, 20, 22, 15],
    Honeywell: [10, 12, 18, 12, 15, 12],
    Blueair: [6, 11, 10, 6, 10, 10],
  };

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 11, color: "#6B7280" } },
    grid: { top: 10, right: 16, bottom: 40, left: 100 },
    xAxis: { type: "value", max: 100, axisLabel: { fontSize: 10, color: "#9CA3AF", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } } },
    yAxis: { type: "category", data: topics, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { show: false }, axisTick: { show: false } },
    series: brands.map((brand) => ({
      name: brand,
      type: "bar",
      stack: "total",
      barWidth: 20,
      itemStyle: { color: BRAND_COLORS[brand] },
      data: mockData[brand],
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Evidence Quality Treemap (Reddit VOC Overview) ─────── */
export function EvidenceTreemap({ height = 256 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { formatter: "{b}: {c} mentions" },
    series: [
      {
        type: "treemap",
        roam: false,
        width: "100%",
        height: "90%",
        label: { show: true, fontSize: 11, color: "#fff" },
        breadcrumb: { show: false },
        data: [
          {
            name: "Tested (verified)",
            value: 420,
            itemStyle: { color: "#34A853" },
            children: [
              { name: "HEPA testing", value: 180 },
              { name: "Noise measurement", value: 140 },
              { name: "CADR verified", value: 100 },
            ],
          },
          {
            name: "Long-term use",
            value: 310,
            itemStyle: { color: "#4285F4" },
            children: [
              { name: "6+ months", value: 180 },
              { name: "Filter longevity", value: 130 },
            ],
          },
          {
            name: "Hearsay",
            value: 180,
            itemStyle: { color: "#FBBC04" },
            children: [
              { name: "Friend rec", value: 100 },
              { name: "Online review", value: 80 },
            ],
          },
          {
            name: "Speculation",
            value: 90,
            itemStyle: { color: "#EA4335" },
            children: [
              { name: "Unverified claims", value: 50 },
              { name: "Assumptions", value: 40 },
            ],
          },
        ],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Topic Taxonomy Sunburst (Topic Clusters) ───────────── */
export function TopicSunburst({ height = 384 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{b}: {c} mentions" },
    series: [
      {
        type: "sunburst",
        radius: ["12%", "90%"],
        sort: undefined,
        emphasis: { focus: "ancestor" },
        label: { fontSize: 10, minAngle: 15 },
        levels: [
          {},
          { r0: "12%", r: "40%", label: { fontSize: 12, fontWeight: "bold" }, itemStyle: { borderWidth: 2, borderColor: "#fff" } },
          { r0: "40%", r: "65%", label: { fontSize: 10 }, itemStyle: { borderWidth: 1, borderColor: "#fff" } },
          { r0: "65%", r: "90%", label: { fontSize: 9, position: "outside" }, itemStyle: { borderWidth: 1, borderColor: "#fff" } },
        ],
        data: [
          {
            name: "Allergies",
            value: 487,
            itemStyle: { color: "#4285F4" },
            children: [
              { name: "CADR", value: 180, children: [{ name: "HEPA rating doubt", value: 80 }, { name: "Room size", value: 100 }] },
              { name: "Noise", value: 150, children: [{ name: "Sleep mode noise", value: 90 }, { name: "Max speed", value: 60 }] },
              { name: "Filter Cost", value: 157, children: [{ name: "Replacement freq", value: 97 }, { name: "Price", value: 60 }] },
            ],
          },
          {
            name: "Pet Hair",
            value: 312,
            itemStyle: { color: "#FBBC04" },
            children: [
              { name: "Odor", value: 140, children: [{ name: "Activated carbon", value: 80 }, { name: "Lasting effect", value: 60 }] },
              { name: "Hair capture", value: 172, children: [{ name: "Pre-filter", value: 100 }, { name: "Maintenance", value: 72 }] },
            ],
          },
          {
            name: "Wildfire",
            value: 198,
            itemStyle: { color: "#EA4335" },
            children: [
              { name: "Smoke CADR", value: 120, children: [{ name: "AQI handling", value: 70 }, { name: "Coverage", value: 50 }] },
              { name: "VOC removal", value: 78, children: [{ name: "Chemical filter", value: 48 }, { name: "Efficacy doubt", value: 30 }] },
            ],
          },
          {
            name: "Sleep",
            value: 165,
            itemStyle: { color: "#34A853" },
            children: [
              { name: "Noise dB", value: 95, children: [{ name: "24dB claim", value: 55 }, { name: "Fan vibration", value: 40 }] },
              { name: "Light", value: 70, children: [{ name: "Display off", value: 40 }, { name: "LED indicator", value: 30 }] },
            ],
          },
        ],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Risk Severity Heatmap (Topic Clusters) ─────────────── */
export function RiskHeatmap({ height = 256 }: { height?: number }) {
  const topics = ["Allergies", "Pet Hair", "Wildfire", "Sleep", "Small Space", "Baby Room"];
  const risks = ["HEPA doubt", "Noise", "Filter cost", "VOC efficacy", "App issues"];
  const values = [
    [0, 0, 85], [0, 1, 60], [0, 2, 90], [0, 3, 30], [0, 4, 45],
    [1, 0, 40], [1, 1, 35], [1, 2, 70], [1, 3, 20], [1, 4, 50],
    [2, 0, 65], [2, 1, 25], [2, 2, 40], [2, 3, 95], [2, 4, 15],
    [3, 0, 20], [3, 1, 92], [3, 2, 55], [3, 3, 10], [3, 4, 30],
    [4, 0, 50], [4, 1, 78], [4, 2, 45], [4, 3, 15], [4, 4, 60],
    [5, 0, 55], [5, 1, 40], [5, 2, 35], [5, 3, 10], [5, 4, 25],
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { value: number[] }) => `${topics[p.value[0]]} × ${risks[p.value[1]]}: ${p.value[2]}` },
    grid: { top: 8, right: 16, bottom: 40, left: 90 },
    xAxis: { type: "category", data: risks, axisLabel: { fontSize: 10, color: "#374151", rotate: 20 }, axisLine: { show: false } },
    yAxis: { type: "category", data: topics, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { show: false } },
    visualMap: { min: 0, max: 100, show: false, inRange: { color: ["#34A853", "#FBBC04", "#EA4335"] } },
    series: [{ type: "heatmap", data: values, label: { show: true, fontSize: 10, color: "#fff" }, itemStyle: { borderColor: "#fff", borderWidth: 2 } }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── SoD Trends Stacked Area (Competitors) ──────────────── */
export function SodTrendsArea({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const base: Record<string, number> = { Levoit: 34, Dyson: 28, Coway: 18, Honeywell: 13, Blueair: 7 };

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, icon: "circle", itemWidth: 10, textStyle: { fontSize: 11, color: "#6B7280" } },
    grid: { top: 10, right: 16, bottom: 40, left: 50 },
    xAxis: { type: "category", data: days, axisLabel: { fontSize: 10, color: "#9CA3AF", formatter: (v: string) => v.slice(5) }, axisLine: { lineStyle: { color: "#E5E7EB" } } },
    yAxis: { type: "value", axisLabel: { fontSize: 10, color: "#9CA3AF", formatter: "{value}%" }, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } } },
    series: Object.entries(base).map(([brand, b]) => ({
      name: brand,
      type: "line",
      smooth: true,
      symbol: "none",
      areaStyle: { opacity: 0.1 },
      lineStyle: { width: 2 },
      itemStyle: { color: BRAND_COLORS[brand] },
      data: days.map(() => +(b + (Math.random() - 0.5) * 6).toFixed(1)),
    })),
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Co-mention Network Graph (Competitors) ─────────────── */
export function ComentionGraph({ height = 256 }: { height?: number }) {
  const nodes = [
    { name: "Levoit", symbolSize: 50, itemStyle: { color: "#4285F4" } },
    { name: "Dyson", symbolSize: 42, itemStyle: { color: "#EA4335" } },
    { name: "Coway", symbolSize: 35, itemStyle: { color: "#FBBC04" } },
    { name: "Honeywell", symbolSize: 30, itemStyle: { color: "#34A853" } },
    { name: "Blueair", symbolSize: 22, itemStyle: { color: "#9C27B0" } },
    { name: "Winix", symbolSize: 18, itemStyle: { color: "#00BCD4" } },
  ];
  const links = [
    { source: "Levoit", target: "Dyson", value: 342 },
    { source: "Levoit", target: "Coway", value: 218 },
    { source: "Levoit", target: "Honeywell", value: 156 },
    { source: "Dyson", target: "Coway", value: 134 },
    { source: "Levoit", target: "Blueair", value: 98 },
    { source: "Dyson", target: "Honeywell", value: 87 },
    { source: "Coway", target: "Winix", value: 76 },
    { source: "Levoit", target: "Winix", value: 65 },
    { source: "Blueair", target: "Coway", value: 54 },
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { dataType: string; data: { source?: string; target?: string; value?: number; name?: string } }) => p.dataType === "edge" ? `${p.data.source} ↔ ${p.data.target}: ${p.data.value} co-mentions` : p.data.name ?? "" },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        label: { show: true, fontSize: 11, color: "#374151" },
        force: { repulsion: 300, edgeLength: [80, 160] },
        lineStyle: { color: "#D1D5DB", curveness: 0.1 },
        emphasis: { focus: "adjacency", lineStyle: { width: 4 } },
        data: nodes,
        links: links.map((l) => ({ ...l, lineStyle: { width: Math.max(1, l.value / 80) } })),
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Topic × Brand Heatmap (Competitors) ────────────────── */
export function TopicBrandHeatmap({ height = 256 }: { height?: number }) {
  const brands = ["Levoit", "Dyson", "Coway", "Honeywell", "Blueair"];
  const topics = ["Allergies", "Pet Hair", "Wildfire", "Noise", "Filter Cost", "Smart Home"];
  const values = [
    [0, 0, 38], [1, 0, 28], [2, 0, 18], [3, 0, 10], [4, 0, 6],
    [0, 1, 42], [1, 1, 20], [2, 1, 15], [3, 1, 12], [4, 1, 11],
    [0, 2, 45], [1, 2, 15], [2, 2, 12], [3, 2, 18], [4, 2, 10],
    [0, 3, 30], [1, 3, 32], [2, 3, 20], [3, 3, 12], [4, 3, 6],
    [0, 4, 35], [1, 4, 18], [2, 4, 22], [3, 4, 15], [4, 4, 10],
    [0, 5, 28], [1, 5, 35], [2, 5, 15], [3, 5, 12], [4, 5, 10],
  ];

  const option: Record<string, unknown> = {
    tooltip: { formatter: (p: { value: number[] }) => `${brands[p.value[0]]} × ${topics[p.value[1]]}: ${p.value[2]}%` },
    grid: { top: 8, right: 16, bottom: 40, left: 90 },
    xAxis: { type: "category", data: brands, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { show: false }, position: "top" },
    yAxis: { type: "category", data: topics, axisLabel: { fontSize: 11, color: "#374151" }, axisLine: { show: false } },
    visualMap: { min: 0, max: 50, show: false, inRange: { color: ["#EFF6FF", "#3B82F6", "#1E3A8A"] } },
    series: [{ type: "heatmap", data: values, label: { show: true, fontSize: 10, formatter: (p: { value: number[] }) => `${p.value[2]}%` }, itemStyle: { borderColor: "#fff", borderWidth: 2 } }],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Collection Health Gauge (Data Sources) ─────────────── */
export function CollectionGauge({ height = 256 }: { height?: number }) {
  const option: Record<string, unknown> = {
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        pointer: { show: true, length: "60%", width: 6, itemStyle: { color: "#4285F4" } },
        axisLine: { lineStyle: { width: 20, color: [[0.6, "#EA4335"], [0.8, "#FBBC04"], [1, "#34A853"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { fontSize: 10, color: "#9CA3AF", distance: 25 },
        detail: { valueAnimation: true, formatter: "{value}%", fontSize: 28, color: "#374151", offsetCenter: [0, "60%"] },
        title: { offsetCenter: [0, "80%"], fontSize: 13, color: "#6B7280" },
        data: [{ value: 92, name: "Health Score" }],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Topic → QueryCluster Sankey (VOC-GEO Bridge) ──────── */
export function BridgeSankey({ height = 320 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [
      {
        type: "sankey",
        layout: "none",
        emphasis: { focus: "adjacency" },
        nodeAlign: "justify",
        nodeGap: 14,
        nodeWidth: 20,
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.4 },
        label: { fontSize: 11, color: "#374151" },
        data: [
          { name: "Allergies", itemStyle: { color: "#4285F4" } },
          { name: "Pet Hair", itemStyle: { color: "#FBBC04" } },
          { name: "Wildfire", itemStyle: { color: "#EA4335" } },
          { name: "Noise", itemStyle: { color: "#34A853" } },
          { name: "Filter Cost", itemStyle: { color: "#9C27B0" } },
          { name: "Best for allergies", itemStyle: { color: "#4285F4" } },
          { name: "Levoit vs Dyson", itemStyle: { color: "#607D8B" } },
          { name: "Quiet purifier", itemStyle: { color: "#34A853" } },
          { name: "Pet odor removal", itemStyle: { color: "#FBBC04" } },
          { name: "Wildfire smoke", itemStyle: { color: "#EA4335" } },
          { name: "Filter cost value", itemStyle: { color: "#9C27B0" } },
          { name: "Best under $100", itemStyle: { color: "#FF9800" } },
        ],
        links: [
          { source: "Allergies", target: "Best for allergies", value: 85 },
          { source: "Allergies", target: "Levoit vs Dyson", value: 40 },
          { source: "Pet Hair", target: "Pet odor removal", value: 72 },
          { source: "Pet Hair", target: "Levoit vs Dyson", value: 30 },
          { source: "Wildfire", target: "Wildfire smoke", value: 65 },
          { source: "Wildfire", target: "Best for allergies", value: 20 },
          { source: "Noise", target: "Quiet purifier", value: 90 },
          { source: "Noise", target: "Best under $100", value: 25 },
          { source: "Filter Cost", target: "Filter cost value", value: 60 },
          { source: "Filter Cost", target: "Best under $100", value: 55 },
        ],
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}

/* ── Priority Score Scatter (VOC-GEO Bridge) ────────────── */
export function PriorityScatter({ height = 256 }: { height?: number }) {
  const data = [
    { name: "Filter cost", freq: 312, impact: 78, severity: 90 },
    { name: "Noise level", freq: 267, impact: 65, severity: 75 },
    { name: "VOC removal", freq: 176, impact: 85, severity: 95 },
    { name: "White dust", freq: 198, impact: 45, severity: 60 },
    { name: "App issues", freq: 154, impact: 30, severity: 40 },
    { name: "HEPA doubt", freq: 142, impact: 72, severity: 80 },
    { name: "Humidity accuracy", freq: 132, impact: 38, severity: 50 },
    { name: "Auto mode", freq: 95, impact: 25, severity: 35 },
  ];

  const option: Record<string, unknown> = {
    tooltip: {
      formatter: (p: { data: number[]; name: string }) =>
        `<b>${data[p.data[3]].name}</b><br/>Reddit freq: ${p.data[0]}<br/>Rufus impact: ${p.data[1]}%<br/>Severity: ${p.data[2]}`,
    },
    grid: { top: 16, right: 16, bottom: 40, left: 50 },
    xAxis: { name: "Reddit Frequency", nameLocation: "center", nameGap: 28, nameTextStyle: { fontSize: 11, color: "#6B7280" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } } },
    yAxis: { name: "Rufus Impact %", nameLocation: "center", nameGap: 35, nameTextStyle: { fontSize: 11, color: "#6B7280" }, axisLabel: { fontSize: 10, color: "#9CA3AF" }, splitLine: { lineStyle: { color: "#F3F4F6", type: "dashed" } } },
    series: [
      {
        type: "scatter",
        symbolSize: (val: number[]) => Math.max(12, val[2] / 3),
        label: { show: true, formatter: (p: { data: number[] }) => data[p.data[3]].name, fontSize: 9, position: "top", color: "#374151" },
        itemStyle: { color: "#4285F4", opacity: 0.7 },
        data: data.map((d, i) => [d.freq, d.impact, d.severity, i]),
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: `${height}px` }} opts={{ renderer: "svg" }} />;
}
