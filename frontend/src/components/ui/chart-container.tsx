import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  /** "half" = 50% width, "full" = 100% width, "third" = 33% */
  span?: "half" | "full" | "third";
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  subtitle,
  span = "half",
  action,
  children,
  className,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5",
        span === "full" && "col-span-full",
        span === "third" && "col-span-1",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
