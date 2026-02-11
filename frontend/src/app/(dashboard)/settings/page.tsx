/**
 * Settings Page
 *
 * Platform configuration: API keys, probe schedules, notification preferences
 */
import { PageHeader } from "@/components/layout/page-header";
import { ChartContainer } from "@/components/ui/chart-container";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform configuration and preferences"
      />

      <div className="grid grid-cols-2 gap-4">
        <ChartContainer title="API Configuration">
          <div className="space-y-4 text-sm">
            {[
              { label: "Anthropic API Key", value: "sk-ant-•••••••kX9m", status: "active" },
              { label: "Reddit API (OAuth)", value: "client_id: •••••d4f", status: "active" },
              { label: "Amazon SP-API", value: "Not configured", status: "inactive" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded border border-gray-100 px-4 py-3">
                <div>
                  <div className="font-medium text-gray-700">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.value}</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  item.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                }`}>{item.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer title="Probe Schedules">
          <div className="space-y-4 text-sm">
            {[
              { label: "AI Search Ranking", interval: "Every 6 hours", next: "2026-02-10 18:00" },
              { label: "Citation Scan", interval: "Daily at 02:00", next: "2026-02-11 02:00" },
              { label: "Competitor Monitor", interval: "Daily at 04:00", next: "2026-02-11 04:00" },
              { label: "Reddit VOC Collection", interval: "Every 4 hours", next: "2026-02-10 16:00" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded border border-gray-100 px-4 py-3">
                <div>
                  <div className="font-medium text-gray-700">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.interval}</div>
                </div>
                <span className="text-xs text-gray-400">Next: {item.next}</span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      <ChartContainer title="Notification Preferences" span="full">
        <div className="space-y-3 text-sm">
          {[
            { label: "SoA drops below 30%", channel: "Email + Slack", enabled: true },
            { label: "New risk detected in Reddit", channel: "Slack", enabled: true },
            { label: "Probe anomaly detected", channel: "Email", enabled: true },
            { label: "Weekly digest report", channel: "Email", enabled: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded border border-gray-100 px-4 py-3">
              <div>
                <div className="font-medium text-gray-700">{item.label}</div>
                <div className="text-xs text-gray-400">{item.channel}</div>
              </div>
              <div className={`h-5 w-9 rounded-full ${item.enabled ? "bg-blue-500" : "bg-gray-200"} relative transition-colors`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
}
