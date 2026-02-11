/**
 * GEO Decision Cockpit — Executive Overview (U3)
 *
 * Three persona views: CEO / Operations / Content
 * Combines Reddit VOC + Rufus GEO + Bridge metrics
 */
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KpiRow } from "@/components/ui/kpi-card";
import { ChartContainer } from "@/components/ui/chart-container";

const TABS = [
  { label: "CEO View", href: "/" },
  { label: "Operations View", href: "/?view=ops" },
  { label: "Content View", href: "/?view=content" },
];

/* ── KPI sets per view ─────────────────────────────────── */
const CEO_KPIS = [
  { label: "Reddit SoD (Levoit)", value: 34.2, change: 2.8, format: "percent" as const },
  { label: "Rufus SoA (Levoit)", value: 41.5, change: -1.3, format: "percent" as const },
  { label: "Avg Sentiment", value: 0.72, change: 3.2, format: "score" as const },
  { label: "Risk Library", value: 47, change: 5, format: "number" as const },
  { label: "Topic→Query Coverage", value: 68, change: 4.1, format: "percent" as const },
  { label: "Action Items", value: 12, format: "number" as const },
];

const OPS_KPIS = [
  { label: "Probes Run (7d)", value: 156, change: 23.1, format: "number" as const },
  { label: "Probe Success Rate", value: 94.2, format: "percent" as const },
  { label: "Data Freshness", value: 98, format: "percent" as const },
  { label: "Pipeline Errors (7d)", value: 2, change: -3, format: "number" as const },
  { label: "Avg Probe Latency", value: "1.8s", format: "number" as const },
  { label: "Active Alerts", value: 3, format: "number" as const },
];

const CONTENT_KPIS = [
  { label: "Content Assets", value: 156, change: 8, format: "number" as const },
  { label: "Rufus-Cited Rate", value: 43, change: 5.4, format: "percent" as const },
  { label: "Claim Match Score", value: 73, change: 5.4, format: "percent" as const },
  { label: "Risks w/ Counter", value: 23, format: "number" as const },
  { label: "Risks Missing", value: 12, change: -2, format: "number" as const },
  { label: "Translation Queue", value: 15, format: "number" as const },
];

/* ── View-specific content ─────────────────────────────── */
function CeoView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer title="Reddit VOC Health" subtitle="Share of Discussion × Sentiment by Topic">
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Bubble chart: SoD × Sentiment × Volume per Topic
          </div>
        </ChartContainer>
        <ChartContainer title="Rufus Share of Answer" subtitle="Levoit appearance rate across Query Clusters">
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Bar chart: SoA% per Cluster (A1 blue / A2 yellow / A3 green)
          </div>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ChartContainer title="Topic → Query Bridge" subtitle="Reddit Topics mapped to Rufus Query Clusters">
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            Sankey: Reddit Topic → QueryCluster flow
          </div>
        </ChartContainer>
        <ChartContainer title="Risk Counter-Content Status" subtitle="Risks with Amazon content coverage">
          <div className="flex h-56 items-center justify-center text-sm text-gray-400">
            Donut: 23 covered, 12 partial, 12 missing
          </div>
        </ChartContainer>
        <ChartContainer title="This Week's Actions" subtitle="Priority-ranked items to fix">
          <div className="flex h-56 flex-col gap-2 overflow-y-auto text-sm text-gray-400">
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">
              CRITICAL: &quot;Filter replacement cost&quot; risk — no Q&amp;A counter
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
              HIGH: &quot;Noise level accuracy&quot; — A+ table outdated
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
              MEDIUM: &quot;VOC removal&quot; topic — Rufus not citing Core 600S
            </div>
          </div>
        </ChartContainer>
      </div>

      <ChartContainer title="Competitive Landscape" subtitle="Levoit vs Dyson vs Coway vs Honeywell — Reddit SoD + Rufus SoA" span="full">
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          Grouped bar: 4 brands × 2 metrics (SoD + SoA)
        </div>
      </ChartContainer>
    </>
  );
}

function OpsView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer title="Pipeline Health" subtitle="Data collection and processing status">
          <div className="space-y-2 text-sm">
            {[
              { name: "Reddit VOC Collection", status: "healthy", lastRun: "12 min ago", nextRun: "3h 48min" },
              { name: "AI Search Ranking", status: "healthy", lastRun: "2h ago", nextRun: "4h" },
              { name: "Citation Scan", status: "healthy", lastRun: "6h ago", nextRun: "18h" },
              { name: "Competitor Monitor", status: "warning", lastRun: "26h ago", nextRun: "overdue" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.status === "healthy" ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="text-gray-700">{p.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Last: {p.lastRun} · Next: {p.nextRun}
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>
        <ChartContainer title="Probe Execution" subtitle="Probe runs and success rate over 7 days">
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Bar + Line: daily probe count (bar) + success rate (line)
          </div>
        </ChartContainer>
      </div>

      <ChartContainer title="System Alerts" subtitle="Active issues requiring attention" span="full">
        <div className="space-y-2 text-sm">
          {[
            { severity: "warning", message: "Competitor Monitor pipeline overdue by 2 hours", time: "26 min ago" },
            { severity: "info", message: "Reddit API rate limit at 78% — approaching threshold", time: "1h ago" },
            { severity: "info", message: "3 probes returned inconsistent results — review recommended", time: "3h ago" },
          ].map((a, i) => (
            <div key={i} className={`rounded-lg border px-4 py-3 ${
              a.severity === "warning" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-blue-100 bg-blue-50 text-blue-700"
            }`}>
              <div className="flex items-center justify-between">
                <span>{a.message}</span>
                <span className="text-xs opacity-60">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </>
  );
}

function ContentView() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ChartContainer title="Content Coverage" subtitle="Amazon content assets by type and Rufus citation status">
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Stacked bar: asset type × cited/not-cited
          </div>
        </ChartContainer>
        <ChartContainer title="Claim Match Trend" subtitle="How accurately Rufus cites Levoit claims over time">
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            Line chart: claim match score trend (30d)
          </div>
        </ChartContainer>
      </div>

      <ChartContainer title="Risk → Counter-Content Gaps" subtitle="Reddit risks that need Amazon content responses" span="full">
        <div className="space-y-2 text-sm">
          {[
            { risk: "Does it really remove VOCs?", priority: "critical", action: "Create Q&A addressing VOC removal with test data" },
            { risk: "Smaller room coverage than advertised", priority: "high", action: "Update A+ table with room size test results" },
            { risk: "WiFi setup is unreliable", priority: "high", action: "Add Q&A with step-by-step WiFi troubleshooting" },
            { risk: "Ultrasonic humidifier white dust", priority: "medium", action: "Update bullet points with mineral-free technology details" },
          ].map((r) => (
            <div key={r.risk} className="flex items-center gap-4 rounded border border-gray-100 px-4 py-3">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                r.priority === "critical" ? "bg-red-100 text-red-700" :
                r.priority === "high" ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }`}>{r.priority.toUpperCase()}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-700">{r.risk}</div>
                <div className="text-xs text-gray-400">{r.action}</div>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </>
  );
}

/* ── Page inner (uses useSearchParams) ──────────────────── */
function OverviewInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  const kpis = view === "ops" ? OPS_KPIS : view === "content" ? CONTENT_KPIS : CEO_KPIS;
  const description = view === "ops"
    ? "Pipeline health, probe execution, and system alerts"
    : view === "content"
    ? "Content assets, claim accuracy, and risk counter-content gaps"
    : "Reddit VOC + Amazon Rufus GEO unified view — what to fix this week";

  return (
    <div className="space-y-6">
      <PageHeader
        title="GEO Decision Cockpit"
        description={description}
        tabs={TABS}
        showIntentFilter={!view}
      />

      <KpiRow metrics={kpis} />

      {!view && <CeoView />}
      {view === "ops" && <OpsView />}
      {view === "content" && <ContentView />}
    </div>
  );
}

/* ── Page (exported with Suspense boundary) ─────────────── */
export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewInner />
    </Suspense>
  );
}
