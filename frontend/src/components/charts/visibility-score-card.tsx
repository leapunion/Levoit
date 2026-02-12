"use client";

import ReactECharts from "echarts-for-react";

interface VisibilityScoreCardProps {
  score: number;
  loading?: boolean;
}

export function VisibilityScoreCard({
  score,
  loading = false,
}: VisibilityScoreCardProps) {
  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-white">
        <div className="h-40 w-40 animate-pulse rounded-full bg-gray-100" />
      </div>
    );
  }

  const option: Record<string, unknown> = {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "88%",
        splitNumber: 10,
        // Colored arc: red → yellow → green
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.3, "#EA4335"],
              [0.6, "#FBBC04"],
              [1, "#34A853"],
            ],
          },
        },
        // Small ticks
        axisTick: {
          distance: -14,
          length: 6,
          lineStyle: { color: "auto", width: 1.5 },
        },
        // Major split lines
        splitLine: {
          distance: -18,
          length: 14,
          lineStyle: { color: "auto", width: 2.5 },
        },
        // Scale labels: 0, 20, 40 ... 100
        axisLabel: {
          distance: 24,
          fontSize: 12,
          color: "#6B7280",
          fontWeight: "500",
        },
        // Needle pointer
        pointer: {
          icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
          length: "60%",
          width: 8,
          offsetCenter: [0, "-5%"],
          itemStyle: {
            color: "auto",
            shadowColor: "rgba(0,0,0,0.25)",
            shadowBlur: 6,
            shadowOffsetY: 2,
          },
        },
        // Center pin
        anchor: {
          show: true,
          showAbove: true,
          size: 14,
          itemStyle: {
            borderWidth: 3,
            borderColor: "#6B7280",
            color: "#fff",
            shadowColor: "rgba(0,0,0,0.15)",
            shadowBlur: 4,
          },
        },
        // Title below value
        title: {
          show: true,
          offsetCenter: [0, "72%"],
          fontSize: 13,
          color: "#6B7280",
          fontWeight: "normal",
        },
        // Large center value
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "45%"],
          fontSize: 36,
          fontWeight: "bold",
          color: "#111827",
          formatter: (v: number) => v.toFixed(1),
        },
        data: [{ value: score, name: "AI Visibility Score" }],
      },
    ],
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <ReactECharts
        option={option}
        style={{ height: "300px" }}
        opts={{ renderer: "svg" }}
      />
    </div>
  );
}
