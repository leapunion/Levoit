"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { navigation, isNavGroup, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/* ── Brand pill (top of sidebar) ─────────────────────────── */
function BrandPill() {
  return (
    <div className="flex items-center gap-2 px-3 py-4 border-b border-gray-100">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
        L
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">Levoit</span>
        <span className="text-[10px] text-gray-400">GEO Platform</span>
      </div>
    </div>
  );
}

/* ── Single nav item ─────────────────────────────────────── */
function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        depth > 0 && "ml-4 text-[13px]",
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {Icon && <Icon size={18} className={isActive ? "text-blue-600" : "text-gray-400"} />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/* ── Sidebar (exported) ──────────────────────────────────── */
export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <BrandPill />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navigation.map((item) => {
          const navItem: NavItem = isNavGroup(item)
            ? { label: item.label, href: item.href, icon: item.icon }
            : item;
          return <NavLink key={navItem.href} item={navItem} />;
        })}
      </nav>

      {/* Bottom: platform version */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Zap size={12} />
          <span>BGF.ai &middot; Levoit GEO v0.1</span>
        </div>
      </div>
    </aside>
  );
}
