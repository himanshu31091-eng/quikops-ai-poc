import { DeltaBadge } from "@/components/patterns/delta-badge";
import { Icon } from "@/components/patterns/icon";
import type { ExecutionMetrics } from "@/src/domain/types";
import { formatHours, formatPercent } from "@/src/lib/format";

/**
 * The four execution figures beneath the KPI row.
 *
 * Each carries a hint naming its definition ("case open to verified"), because
 * a metric strip without definitions is where two people start quoting the
 * same number to mean different things. The figures come from
 * `src/domain/portfolio-metrics`, which is the only place they are computed.
 */
interface Metric {
  icon: string;
  label: string;
  value: string;
  delta?: { value: number; unit: "pts" | "%" | "abs"; higherIsBetter: boolean };
  hint: string;
}

export function ExecutionMetricsStrip({ metrics }: { metrics: ExecutionMetrics }) {
  const items: Metric[] = [
    {
      icon: "Clock",
      label: "Mean time to resolve",
      value: formatHours(metrics.mttrHours),
      delta: { value: metrics.mttrDeltaPct, unit: "%", higherIsBetter: false },
      hint: "Case open to verified",
    },
    {
      icon: "Target",
      label: "SLA adherence",
      value: formatPercent(metrics.slaAdherencePct),
      delta: { value: metrics.slaAdherenceDeltaPts, unit: "pts", higherIsBetter: true },
      hint: "Resolved within band target",
    },
    {
      icon: "ShieldCheck",
      label: "Verification pass rate",
      value: formatPercent(metrics.verificationPassRatePct),
      hint: "Approved on first submission",
    },
    {
      icon: "RefreshCw",
      label: "Recurrence rate",
      value: formatPercent(metrics.recurrenceRatePct),
      hint: "Reopened within 30 days",
    },
    {
      icon: "Activity",
      label: "Throughput this week",
      value: `${metrics.casesClosedThisWeek} / ${metrics.casesOpenedThisWeek}`,
      hint: "Closed vs opened",
    },
  ];

  return (
    <dl className="grid min-w-0 grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3 first:pl-4 lg:px-5">
          <dt className="flex items-center gap-1.5 text-2xs font-medium text-content-tertiary">
            <Icon name={item.icon} size="xs" />
            {item.label}
          </dt>
          <dd className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums leading-6 tracking-[-0.016em] text-content">
              {item.value}
            </span>
            {item.delta ? (
              <DeltaBadge
                value={item.delta.value}
                unit={item.delta.unit}
                higherIsBetter={item.delta.higherIsBetter}
                size="sm"
              />
            ) : null}
          </dd>
          <p className="mt-0.5 text-2xs text-content-tertiary">{item.hint}</p>
        </div>
      ))}
    </dl>
  );
}
