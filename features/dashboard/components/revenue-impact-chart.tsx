"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { exceptionLabel } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from "recharts";
import {
  AXIS_DEFAULTS,
  ChartLegend,
  ChartTooltip,
  type TooltipRenderProps } from "@/components/charts/chart-primitives";
import type { RevenueImpactBucket } from "@/src/domain/types";
import { formatMoney, formatNumber } from "@/src/lib/format";

const AT_RISK_COLOR = "var(--color-chart-4)";
const RECOVERED_COLOR = "var(--color-chart-6)";

interface Row extends RevenueImpactBucket {
  label: string;
}

function renderTooltip(
  props: TooltipRenderProps<Row>,
): React.ReactElement | null {
  if (!props.active || !props.payload?.length) return null;
  const row = props.payload[0]?.payload;
  if (!row) return null;

  const recoveryRate = (row.recovered / (row.atRisk + row.recovered)) * 100;

  return (
    <ChartTooltip
      title={row.label}
      subtitle={`${formatNumber(row.caseCount)} cases`}
      data={[
        {
          label: "Still at risk",
          value: formatMoney(row.atRisk, undefined, { forceCompact: true }),
          swatch: AT_RISK_COLOR,
        },
        {
          label: "Recovered",
          value: formatMoney(row.recovered, undefined, { forceCompact: true }),
          swatch: RECOVERED_COLOR,
        },
      ]}
      footnote={`Recovery rate ${recoveryRate.toFixed(0)}%`}
    />
  );
}

/**
 * Revenue at risk by exception type, split into at-risk and recovered.
 *
 * Stacked rather than grouped: the question the panel answers is how much of
 * each type's exposure has been recovered, which is a share of one total, not
 * two independent quantities.
 */
export function RevenueImpactChart({ data }: { data: RevenueImpactBucket[] }) {
  const labels = useLabels();
  const { t } = useTranslation();
  const rows = React.useMemo<Row[]>(
    () =>
      data.map((bucket) => ({
        ...bucket,
        label: exceptionLabel(bucket.exceptionType, labels),
      })),
    [data, labels],
  );

  const totalAtRisk = data.reduce((sum, d) => sum + d.atRisk, 0);
  const totalRecovered = data.reduce((sum, d) => sum + d.recovered, 0);

  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            {
              label: t("dashboard.stillAtRisk"),
              color: AT_RISK_COLOR,
              value: formatMoney(totalAtRisk, undefined, { forceCompact: true }),
            },
            {
              label: t("dashboard.recoveredAfterExecution"),
              color: RECOVERED_COLOR,
              value: formatMoney(totalRecovered, undefined, { forceCompact: true }),
            },
          ]}
        />
      </div>

      <div className="h-[248px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            barGap={2}
            margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid
              stroke="var(--color-chart-grid)"
              horizontal={false}
              strokeDasharray="0"
            />
            <XAxis
              type="number"
              {...AXIS_DEFAULTS}
              tickMargin={6}
              tickFormatter={(value: number) =>
                formatMoney(value, undefined, { forceCompact: true })
              }
            />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS_DEFAULTS}
              width={126}
              tickMargin={6}
            />
            <Tooltip
              content={renderTooltip}
              cursor={{ fill: "var(--color-surface-hover)" }}
            />
            <Bar
              dataKey="atRisk"
              fill={AT_RISK_COLOR}
              radius={[0, 2, 2, 0]}
              barSize={8}
              isAnimationActive={false}
            />
            <Bar
              dataKey="recovered"
              fill={RECOVERED_COLOR}
              radius={[0, 2, 2, 0]}
              barSize={8}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
