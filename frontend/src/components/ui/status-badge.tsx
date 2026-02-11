import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

const styles: Record<Variant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
};

export function StatusBadge({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[variant]
      )}
    >
      {children}
    </span>
  );
}
