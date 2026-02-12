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

/* ── Content Flow Sankey ─────────────────────────────── */
export function ContentFlowSankey({ height = 360 }: { height?: number }) {
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
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.45 },
        label: { fontSize: 11, color: "#374151" },
        data: [
          { name: "VOC Topics", itemStyle: { color: COLORS.blue } },
          { name: "FAQ Extraction", itemStyle: { color: COLORS.cyan } },
          { name: "Topic Analysis", itemStyle: { color: COLORS.yellow } },
          { name: "Content Generation", itemStyle: { color: COLORS.orange } },
          { name: "Published", itemStyle: { color: COLORS.green } },
          { name: "In Review", itemStyle: { color: COLORS.purple } },
          { name: "Draft", itemStyle: { color: "#607D8B" } },
        ],
        links: [
          { source: "VOC Topics", target: "FAQ Extraction", value: 248 },
          { source: "VOC Topics", target: "Topic Analysis", value: 186 },
          { source: "FAQ Extraction", target: "Content Generation", value: 210 },
          { source: "Topic Analysis", target: "Content Generation", value: 156 },
          { source: "Content Generation", target: "Published", value: 232 },
          { source: "Content Generation", target: "In Review", value: 78 },
          { source: "Content Generation", target: "Draft", value: 56 },
        ],
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

/* ── Content Velocity Line (30d area) ────────────────── */
export function ContentVelocityLine({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });
  const daily = days.map((_, i) => {
    const isWeekend = new Date(days[i]).getDay() % 6 === 0;
    return Math.round(
      (isWeekend ? 6 : 12) + Math.random() * 5 + i * 0.08
    );
  });

  const option: Record<string, unknown> = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${v} pieces`,
    },
    grid: { top: 24, right: 16, bottom: 32, left: 48 },
    xAxis: {
      type: "category",
      data: days,
      axisLabel: {
        fontSize: 10,
        rotate: 45,
        interval: 4,
        color: "#9CA3AF",
      },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "Content Produced",
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2.5, color: COLORS.blue },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(66,133,244,0.18)" },
              { offset: 1, color: "rgba(66,133,244,0)" },
            ],
          },
        },
        data: daily,
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

/* ── Content Type Donut (double-ring pie) ────────────── */
export function ContentTypeDonut({ height = 320 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: { trigger: "item", formatter: "{a}<br/>{b}: {c} ({d}%)" },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    series: [
      {
        name: "Content Type",
        type: "pie",
        radius: ["30%", "50%"],
        label: { show: false },
        data: [
          { value: 38, name: "Blog Posts", itemStyle: { color: COLORS.blue } },
          { value: 28, name: "FAQ Pages", itemStyle: { color: COLORS.red } },
          {
            value: 18,
            name: "Buying Guides",
            itemStyle: { color: COLORS.yellow },
          },
          {
            value: 12,
            name: "Comparisons",
            itemStyle: { color: COLORS.green },
          },
          { value: 4, name: "How-to", itemStyle: { color: COLORS.purple } },
        ],
      },
      {
        name: "Status",
        type: "pie",
        radius: ["58%", "72%"],
        label: {
          position: "outside",
          formatter: "{b}\n{d}%",
          fontSize: 11,
          color: "#374151",
        },
        data: [
          {
            value: 68,
            name: "Published",
            itemStyle: { color: COLORS.green },
          },
          {
            value: 14,
            name: "In Review",
            itemStyle: { color: COLORS.yellow },
          },
          { value: 12, name: "Draft", itemStyle: { color: COLORS.blue } },
          { value: 6, name: "Archived", itemStyle: { color: "#607D8B" } },
        ],
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

/* ── Content Status Bar (stacked horizontal) ─────────── */
export function ContentStatusBar({ height = 288 }: { height?: number }) {
  const types = [
    "Blog Posts",
    "FAQ Pages",
    "Buying Guides",
    "Comparisons",
    "How-to",
  ];
  const published = [285, 210, 142, 98, 32];
  const review = [42, 35, 22, 18, 8];
  const draft = [38, 28, 16, 12, 6];
  const archived = [22, 15, 10, 8, 4];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: { top: 8, right: 40, bottom: 40, left: 110 },
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
        name: "Published",
        type: "bar",
        stack: "total",
        data: published,
        itemStyle: { color: COLORS.green },
        barWidth: 18,
      },
      {
        name: "In Review",
        type: "bar",
        stack: "total",
        data: review,
        itemStyle: { color: COLORS.yellow },
      },
      {
        name: "Draft",
        type: "bar",
        stack: "total",
        data: draft,
        itemStyle: { color: COLORS.blue },
      },
      {
        name: "Archived",
        type: "bar",
        stack: "total",
        data: archived,
        itemStyle: { color: "#607D8B" },
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

/* ── Topic Coverage Treemap ──────────────────────────── */
export function TopicCoverageTreemap({ height = 288 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: {
      formatter: (p: { name: string; value: number }) =>
        `${p.name}: ${p.value} pieces`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: "{b}\n{c}",
          fontSize: 12,
          color: "#fff",
        },
        levels: [
          {
            itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 },
          },
          {
            itemStyle: { borderColor: "#fff", borderWidth: 1, gapWidth: 1 },
          },
        ],
        data: [
          {
            name: "Air Quality",
            value: 420,
            itemStyle: { color: COLORS.blue },
            children: [
              { name: "Allergies", value: 165, itemStyle: { color: "#5B9BF5" } },
              { name: "Pet Odors", value: 135, itemStyle: { color: "#7BABF7" } },
              { name: "Smoke", value: 120, itemStyle: { color: "#9CBDF9" } },
            ],
          },
          {
            name: "Humidification",
            value: 385,
            itemStyle: { color: COLORS.green },
            children: [
              { name: "Bedroom", value: 180, itemStyle: { color: "#57C178" } },
              { name: "Baby Room", value: 120, itemStyle: { color: "#7DD49A" } },
              { name: "Dry Skin", value: 85, itemStyle: { color: "#A3E3B8" } },
            ],
          },
          {
            name: "Noise Levels",
            value: 245,
            itemStyle: { color: COLORS.yellow },
            children: [
              { name: "Sleep Mode", value: 140, itemStyle: { color: "#FCC934" } },
              { name: "dB Comparison", value: 105, itemStyle: { color: "#FDD663" } },
            ],
          },
          {
            name: "Smart Features",
            value: 198,
            itemStyle: { color: COLORS.purple },
            children: [
              { name: "App Control", value: 110, itemStyle: { color: "#B254C8" } },
              { name: "Alexa/Google", value: 88, itemStyle: { color: "#C87BDA" } },
            ],
          },
        ],
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

/* ── Quality Distribution Histogram (grouped bar) ────── */
export function QualityDistributionHistogram({
  height = 288,
}: {
  height?: number;
}) {
  const ranges = ["0–20", "21–40", "41–60", "61–80", "81–100"];

  const option: Record<string, unknown> = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: { top: 16, right: 16, bottom: 40, left: 48 },
    xAxis: {
      type: "category",
      data: ranges,
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      name: "Content count",
      nameTextStyle: { fontSize: 10, color: "#9CA3AF" },
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "SEO Score",
        type: "bar",
        data: [8, 22, 68, 285, 865],
        itemStyle: { color: COLORS.blue, borderRadius: [3, 3, 0, 0] },
        barWidth: 14,
      },
      {
        name: "Readability",
        type: "bar",
        data: [5, 18, 82, 342, 801],
        itemStyle: { color: COLORS.green, borderRadius: [3, 3, 0, 0] },
        barWidth: 14,
      },
      {
        name: "Keyword Coverage",
        type: "bar",
        data: [12, 35, 96, 312, 793],
        itemStyle: { color: COLORS.yellow, borderRadius: [3, 3, 0, 0] },
        barWidth: 14,
      },
      {
        name: "AI Citation Ready",
        type: "bar",
        data: [18, 42, 128, 398, 662],
        itemStyle: { color: COLORS.purple, borderRadius: [3, 3, 0, 0] },
        barWidth: 14,
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

/* ── Citation Rate Trend (multi-line, 30d) ───────────── */
export function CitationRateTrend({ height = 256 }: { height?: number }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return d.toISOString().slice(0, 10);
  });

  const seed = (base: number, growth: number) =>
    days.map((_, i) =>
      +(base + i * growth + (Math.random() - 0.5) * 1.5).toFixed(1)
    );

  const option: Record<string, unknown> = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (v: number) => `${v}%`,
    },
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
      axisLabel: {
        fontSize: 10,
        rotate: 45,
        interval: 4,
        color: "#9CA3AF",
      },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: "{value}%", fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "Buying Guides",
        type: "line",
        smooth: true,
        symbol: "none",
        data: seed(18, 0.2),
        lineStyle: { width: 2, color: COLORS.blue },
        itemStyle: { color: COLORS.blue },
      },
      {
        name: "FAQ Pages",
        type: "line",
        smooth: true,
        symbol: "none",
        data: seed(12, 0.15),
        lineStyle: { width: 2, color: COLORS.green },
        itemStyle: { color: COLORS.green },
      },
      {
        name: "Blog Posts",
        type: "line",
        smooth: true,
        symbol: "none",
        data: seed(8, 0.1),
        lineStyle: { width: 2, color: COLORS.yellow },
        itemStyle: { color: COLORS.yellow },
      },
      {
        name: "Comparisons",
        type: "line",
        smooth: true,
        symbol: "none",
        data: seed(14, 0.12),
        lineStyle: { width: 2, color: COLORS.red },
        itemStyle: { color: COLORS.red },
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

/* ── Performance by Type Bubble (scatter) ────────────── */
export function PerformanceByTypeBubble({
  height = 320,
}: {
  height?: number;
}) {
  const types = [
    {
      name: "Buying Guides",
      citations: 820,
      traffic: 14200,
      conversion: 4.2,
      color: COLORS.blue,
    },
    {
      name: "FAQ Pages",
      citations: 640,
      traffic: 11800,
      conversion: 3.1,
      color: COLORS.green,
    },
    {
      name: "Blog Posts",
      citations: 480,
      traffic: 9600,
      conversion: 2.4,
      color: COLORS.yellow,
    },
    {
      name: "Comparisons",
      citations: 560,
      traffic: 8200,
      conversion: 5.1,
      color: COLORS.red,
    },
    {
      name: "How-to",
      citations: 347,
      traffic: 4400,
      conversion: 1.8,
      color: COLORS.purple,
    },
  ];

  const option: Record<string, unknown> = {
    tooltip: {
      formatter: (p: { data: number[]; seriesName: string }) =>
        `${p.seriesName}<br/>Citations: ${p.data[0]}<br/>Traffic: ${p.data[1].toLocaleString()}<br/>Conversion: ${p.data[2]}%`,
    },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      textStyle: { fontSize: 12, color: "#6B7280" },
    },
    grid: { top: 24, right: 16, bottom: 48, left: 64 },
    xAxis: {
      name: "AI Citations",
      nameLocation: "center",
      nameGap: 30,
      nameTextStyle: { fontSize: 11, color: "#6B7280" },
      axisLabel: { fontSize: 10, color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    yAxis: {
      name: "Traffic",
      nameTextStyle: { fontSize: 11, color: "#6B7280" },
      axisLabel: {
        formatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
        fontSize: 10,
        color: "#9CA3AF",
      },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: types.map((t) => ({
      name: t.name,
      type: "scatter",
      symbolSize: t.conversion * 14,
      data: [[t.citations, t.traffic, t.conversion]],
      itemStyle: { color: t.color, opacity: 0.85 },
    })),
  };
  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px` }}
      opts={{ renderer: "svg" }}
    />
  );
}

/* ── Content ROI Waterfall ───────────────────────────── */
export function ContentROIWaterfall({ height = 320 }: { height?: number }) {
  const option: Record<string, unknown> = {
    tooltip: {
      formatter: (p: { name: string; value: number }) => {
        const v = p.value;
        return `${p.name}: ${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString()}K`;
      },
    },
    grid: { top: 24, right: 16, bottom: 32, left: 64 },
    xAxis: {
      type: "category",
      data: [
        "Baseline",
        "Production\nCost",
        "Distribution",
        "AI Citations",
        "Conversions",
        "Total ROI",
      ],
      axisLabel: { fontSize: 10, color: "#374151", interval: 0 },
      axisLine: { lineStyle: { color: "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => `$${v}K`,
        fontSize: 10,
        color: "#9CA3AF",
      },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "Placeholder",
        type: "bar",
        stack: "waterfall",
        itemStyle: { borderColor: "transparent", color: "transparent" },
        emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } },
        data: [0, 0, 0, 0, 0, 0],
      },
      {
        name: "Value",
        type: "bar",
        stack: "waterfall",
        barWidth: 36,
        label: {
          show: true,
          position: "top",
          formatter: (p: { dataIndex: number; value: number }) => {
            if (p.dataIndex === 0) return `$${p.value}K`;
            if (p.dataIndex === 5) return `$${p.value}K`;
            return `${p.value >= 0 ? "+" : ""}$${p.value}K`;
          },
          fontSize: 11,
          color: "#374151",
        },
        data: [
          { value: 0, itemStyle: { color: "#9CA3AF", borderRadius: [4, 4, 0, 0] } },
          { value: -48, itemStyle: { color: COLORS.red, borderRadius: [4, 4, 0, 0] } },
          { value: 24, itemStyle: { color: COLORS.cyan, borderRadius: [4, 4, 0, 0] } },
          { value: 87, itemStyle: { color: COLORS.blue, borderRadius: [4, 4, 0, 0] } },
          { value: 119, itemStyle: { color: COLORS.green, borderRadius: [4, 4, 0, 0] } },
          { value: 182, itemStyle: { color: COLORS.green, borderRadius: [4, 4, 0, 0] } },
        ],
      },
    ],
  };

  // Calculate the "invisible" placeholder bars for waterfall effect
  // Baseline=0, after Production=-48, after Distribution=-24, after Citations=63, after Conversions=182
  const placeholders = [0, 0, -48, -24, 63, 0];
  (
    (option.series as Record<string, unknown>[])[0] as Record<string, unknown>
  ).data = placeholders.map((v) => (v < 0 ? 0 : v));

  // Adjust negative placeholder: for Production Cost, placeholder = 0, bar goes -48 (shown below 0)
  // For waterfall: placeholder stacks from bottom, value stacks on top
  // Recalculate properly:
  // Baseline: placeholder=0, value=0
  // Production Cost: running = -48, placeholder=0, value=-48 → but ECharts stacks, so we need absolute positions
  // Simpler approach: use absolute positioning
  const running = [0, -48, -24, 63, 182];
  const placeholderData = [0, 0, 0, 0, 0, 0];
  const valueData = [
    { value: 0, itemStyle: { color: "#9CA3AF", borderRadius: [4, 4, 0, 0] } },
    {
      value: 48,
      itemStyle: { color: COLORS.red, borderRadius: [0, 0, 4, 4] },
    },
    {
      value: 24,
      itemStyle: { color: COLORS.cyan, borderRadius: [4, 4, 0, 0] },
    },
    {
      value: 87,
      itemStyle: { color: COLORS.blue, borderRadius: [4, 4, 0, 0] },
    },
    {
      value: 119,
      itemStyle: { color: COLORS.green, borderRadius: [4, 4, 0, 0] },
    },
    {
      value: 182,
      itemStyle: { color: COLORS.green, borderRadius: [4, 4, 0, 0] },
    },
  ];

  // Placeholder heights (bottom of each bar):
  // Baseline: 0
  // Production Cost: -48 to 0 → placeholder=0, value=48 drawn downward... ECharts doesn't natively support negative stacking well.
  // Simpler: use positive stacking with placeholder offsets
  placeholderData[0] = 0; // Baseline starts at 0
  placeholderData[1] = 0; // Cost: bar from 0 down to -48... skip, draw from 0
  placeholderData[2] = 0; // Distribution: running was -48, now -24 → placeholder = 0, not visible below 0
  placeholderData[3] = 0; // AI Citations: running was -24, bar of 87 → placeholder = 0 (still starts near 0)
  placeholderData[4] = 63; // Conversions: running was 63, bar of 119
  placeholderData[5] = 0; // Total

  ((option.series as Record<string, unknown>[])[0] as Record<string, unknown>).data = placeholderData;
  ((option.series as Record<string, unknown>[])[1] as Record<string, unknown>).data = valueData;

  // Override labels for clarity
  ((option.series as Record<string, unknown>[])[1] as Record<string, unknown>).label = {
    show: true,
    position: "top",
    formatter: (p: { dataIndex: number }) => {
      const labels = ["$0K", "-$48K", "+$24K", "+$87K", "+$119K", "$182K"];
      return labels[p.dataIndex];
    },
    fontSize: 11,
    fontWeight: "bold" as const,
    color: "#374151",
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px` }}
      opts={{ renderer: "svg" }}
    />
  );
}
