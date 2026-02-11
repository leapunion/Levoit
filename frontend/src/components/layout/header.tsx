"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Sparkles } from "lucide-react";
import { navigation, isNavGroup } from "@/lib/navigation";

/* ── Breadcrumb builder ──────────────────────────────────── */
function useBreadcrumbs() {
  const pathname = usePathname();
  const crumbs: { label: string; href: string }[] = [
    { label: "Levoit", href: "/" },
  ];

  for (const item of navigation) {
    if (isNavGroup(item)) {
      if (pathname.startsWith(item.href)) {
        crumbs.push({ label: item.label, href: item.href });
        for (const child of item.items) {
          if (pathname.startsWith(child.href) && child.href !== item.href) {
            crumbs.push({ label: child.label, href: child.href });
          }
        }
      }
    } else if (pathname === item.href && item.href !== "/") {
      crumbs.push({ label: item.label, href: item.href });
    }
  }

  return crumbs;
}

/* ── Header (exported) ───────────────────────────────────── */
export function Header() {
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">&rsaquo;</span>}
            {i === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {c.label}
              </span>
            ) : (
              <span className={i === crumbs.length - 1 ? "text-gray-900 font-medium" : "text-gray-500"}>
                {c.label}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Right: AI Copilot + notifications + avatar */}
      <div className="flex items-center gap-3">
        {/* AI search bar */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Ask AI Copilot..."
            className="w-44 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
          />
          <Sparkles size={14} className="text-blue-500" />
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
          <Bell size={18} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            3
          </span>
        </button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          D
        </div>
      </div>
    </header>
  );
}
