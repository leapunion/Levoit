/**
 * Levoit GEO Platform — Navigation Configuration
 *
 * Maps to prompt structure:
 *   Part 1 (R1-R4): Reddit VOC
 *   Part 2 (A1-A4): Rufus GEO
 *   Part 3 (U1-U3): Unified Platform (Overview + Experiments)
 */

import {
  LayoutDashboard,
  Eye,
  MessageSquareText,
  Globe,
  FlaskConical,
  TrendingUp,
  Swords,
  type LucideIcon,
} from "lucide-react";

export interface NavTab {
  label: string;
  slug: string;
}

export interface NavRouteTab {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  tabs?: NavTab[];
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  href: string;
  items: NavItem[];
  /** collapsed in sidebar by default */
  defaultOpen?: boolean;
}

// ── Time range options (shared across all pages) ──────────────
export const TIME_RANGES = ["7d", "14d", "30d", "90d", "Custom"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

// ── Intent layers (A1/A2/A3 audience segmentation) ────────────
export const INTENT_LAYERS = [
  { id: "A1", label: "Research / Comparison", color: "#4285F4" },
  { id: "A2", label: "Evaluation / Best-for-me", color: "#FBBC04" },
  { id: "A3", label: "Purchase / Risk-confirm", color: "#34A853" },
] as const;

// ── Sidebar navigation structure ──────────────────────────────
export const navigation: (NavItem | NavGroup)[] = [
  // ── U3: Executive Dashboard ──
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  } satisfies NavItem,

  // ── AI Search Visibility ──
  {
    label: "AI Visibility",
    icon: Eye,
    href: "/visibility",
    defaultOpen: true,
    items: [
      {
        label: "Overview",
        href: "/visibility",
      },
      {
        label: "Ranking Trends",
        href: "/visibility/trends",
      },
      {
        label: "Comparison",
        href: "/visibility/comparison",
      },
    ],
  } satisfies NavGroup,

  // ── Part 1: Reddit VOC (R1-R4) ──
  {
    label: "Reddit VOC",
    icon: MessageSquareText,
    href: "/reddit-voc",
    defaultOpen: true,
    items: [
      {
        label: "Executive Overview",
        href: "/reddit-voc",
        tabs: [
          { label: "Overview", slug: "" },
          { label: "By Topic", slug: "by-topic" },
          { label: "By Subreddit", slug: "by-subreddit" },
          { label: "By Author Trust", slug: "by-author" },
        ],
      },
      {
        label: "Topic Clusters",
        href: "/reddit-voc/topic-clusters",
        badge: "R2",
        tabs: [
          { label: "Topic Tree", slug: "" },
          { label: "Risk Library", slug: "risks" },
          { label: "Evidence Quality", slug: "evidence" },
        ],
      },
      {
        label: "Competitors",
        href: "/reddit-voc/competitors",
        badge: "R3",
        tabs: [
          { label: "Share of Discussion", slug: "" },
          { label: "Co-mention Graph", slug: "co-mention" },
          { label: "Sentiment Comparison", slug: "sentiment" },
        ],
      },
      {
        label: "Data Sources",
        href: "/reddit-voc/data-sources",
        badge: "R1",
        tabs: [
          { label: "Subreddits", slug: "" },
          { label: "Collection Status", slug: "status" },
          { label: "Quality Filters", slug: "filters" },
        ],
      },
      {
        label: "VOC-GEO Bridge",
        href: "/reddit-voc/voc-geo-bridge",
        badge: "R4",
        tabs: [
          { label: "Topic → Query Mapping", slug: "" },
          { label: "Content Translation", slug: "translation" },
          { label: "Priority Queue", slug: "priority" },
        ],
      },
    ],
  } satisfies NavGroup,

  // ── Part 2: Amazon Rufus GEO (A1-A4) ──
  {
    label: "Rufus GEO",
    icon: Globe,
    href: "/rufus-geo",
    defaultOpen: true,
    items: [
      {
        label: "Share of Answer",
        href: "/rufus-geo/share-of-answer",
        badge: "A2",
        tabs: [
          { label: "Overview", slug: "" },
          { label: "By QueryCluster", slug: "by-cluster" },
          { label: "Stability Tracking", slug: "stability" },
        ],
      },
      {
        label: "Query Clusters",
        href: "/rufus-geo/query-clusters",
        badge: "A1",
        tabs: [
          { label: "Cluster Map", slug: "" },
          { label: "Intent Layers", slug: "intents" },
          { label: "Coverage Gaps", slug: "coverage" },
        ],
      },
      {
        label: "Probe Runner",
        href: "/rufus-geo/probe-runner",
        badge: "A3",
        tabs: [
          { label: "Active Probes", slug: "" },
          { label: "Results", slug: "results" },
          { label: "History", slug: "history" },
        ],
      },
      {
        label: "Content Assets",
        href: "/rufus-geo/content-assets",
        badge: "A4",
        tabs: [
          { label: "Asset Map", slug: "" },
          { label: "Claim Coverage", slug: "claims" },
          { label: "Risk Counters", slug: "risk-counters" },
        ],
      },
      {
        label: "Narrative Analysis",
        href: "/rufus-geo/narrative",
        tabs: [
          { label: "Claim Match", slug: "" },
          { label: "Comparator Sets", slug: "comparators" },
          { label: "Risk Surfacing", slug: "risk-surfacing" },
        ],
      },
    ],
  } satisfies NavGroup,

  // ── Part 3: Experiments (U2) ──
  {
    label: "Experiments",
    icon: FlaskConical,
    href: "/experiments",
    items: [
      {
        label: "Active Experiments",
        href: "/experiments",
        tabs: [
          { label: "Running", slug: "" },
          { label: "Completed", slug: "completed" },
        ],
      },
      { label: "Results", href: "/experiments/results" },
      { label: "Templates", href: "/experiments/templates" },
    ],
  } satisfies NavGroup,

  // ── Attribution Analytics ──
  {
    label: "Attribution",
    icon: TrendingUp,
    href: "/attribution",
    items: [
      { label: "Conversion Funnel", href: "/attribution/funnel" },
      { label: "Revenue Impact", href: "/attribution/revenue" },
      { label: "Model Comparison", href: "/attribution/models" },
    ],
  } satisfies NavGroup,

  // ── Competitive Intel ──
  {
    label: "Competitive Intel",
    icon: Swords,
    href: "/competitive-intel",
    items: [
      { label: "Market Share", href: "/competitive-intel/market-share" },
      { label: "Brand Comparison", href: "/competitive-intel/comparison" },
      { label: "Trend Analysis", href: "/competitive-intel/trends" },
    ],
  } satisfies NavGroup,
];

// ── Helper: check if an item is a group ───────────────────────
export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

// ── Helper: get route-based tabs for a pathname ───────────────
export function getTabsForPath(pathname: string): NavRouteTab[] {
  for (const entry of navigation) {
    if (!isNavGroup(entry)) continue;
    // Check if pathname belongs to this group
    const belongsToGroup =
      pathname === entry.href || pathname.startsWith(entry.href + "/");
    if (belongsToGroup) {
      return entry.items.map((item) => ({
        label: item.label,
        href: item.href,
      }));
    }
  }
  return [];
}
