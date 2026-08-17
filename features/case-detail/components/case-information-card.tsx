"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { exceptionLabel } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { SectionCard } from "@/components/patterns/section-card";
import { DETECTION_SOURCE_META, EXCEPTION_META } from "@/src/config/app-config";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";
import { FieldRow } from "./primitives";

/**
 * The reference facts behind the case — what it is attached to in the
 * operational systems. Read-only by design: these come from the source records,
 * and correcting them means correcting the source, not the case.
 */
export const CaseInformationCard = React.memo(function CaseInformationCard({
  detail,
}: {
  detail: CaseDetailModel;
}) {
  const labels = useLabels();
  const { t } = useTranslation();
  const item = detail.case;
  const info = detail.information;
  const detection = DETECTION_SOURCE_META[item.detectedBy];

  return (
    <SectionCard
      title={t("section.information")}
      subtitle={t("cd.infoSub")}
      icon="Layers"
      flush
      footer={
        <p className="flex items-center gap-1.5 text-2xs text-content-tertiary">
          <Icon name="Lock" size="xs" />
          {t("cd.readOnlyNotice")}
        </p>
      }
    >
      <div className="grid gap-x-6 px-4 py-2 md:grid-cols-2">
        <div className="min-w-0 divide-y divide-line">
          <FieldRow label={t("case.material")} icon="Boxes">
            {item.materialCode ? (
              <>
                <span className="font-mono">{item.materialCode}</span>
                {item.materialDesc ? (
                  <span className="block text-content-secondary">{item.materialDesc}</span>
                ) : null}
              </>
            ) : (
              <span className="text-content-tertiary">{t("cd.notMaterialSpecific")}</span>
            )}
          </FieldRow>

          <FieldRow label={t("case.supplier")} icon="TruckElectric">
            {item.supplierName ? (
              <>
                {item.supplierName}
                {item.supplierCode ? (
                  <span className="ml-1.5 font-mono text-2xs text-content-tertiary">
                    {item.supplierCode}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-content-tertiary">{t("cd.internalCause")}</span>
            )}
          </FieldRow>

          <FieldRow label={t("case.customer")} icon="Users">
            {item.customerName ? (
              <>
                {item.customerName}
                {item.customerTier ? (
                  <span className="ml-1.5 rounded-sm border border-line bg-surface-subtle px-1 py-px text-2xs text-content-secondary">
                    {item.customerTier.replace("_", " ")}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-content-tertiary">{t("cd.noCustomerExposed")}</span>
            )}
          </FieldRow>

          <FieldRow label={t("cd.productionLine")} icon="Factory">
            {info.productionLine}
          </FieldRow>

          <FieldRow label={t("case.plant")} icon="Building2">
            <span className="font-mono">{item.plantCode}</span> · {item.plant.name},{" "}
            {item.plant.country}
          </FieldRow>

          <FieldRow label={t("cd.orderNumber")} icon="FileText">
            <span className="font-mono">{info.orderRef}</span>
            <span className="ml-1.5 text-2xs text-content-tertiary">
              {info.orderType.replace("_", " ").toLowerCase()}
            </span>
          </FieldRow>
        </div>

        <div className="min-w-0 divide-y divide-line">
          <FieldRow label={t("cd.revenueExposure")} icon="DollarSign">
            <MoneyCell
              amount={item.revenueAtRisk}
              currency={item.currency}
              compact={false}
              emphasis="strong"
              className="text-xs"
            />
            <span className="ml-1.5 text-2xs text-content-tertiary">
              confirmed demand at risk
            </span>
          </FieldRow>

          <FieldRow label={t("cd.priorityScore")} icon="Target">
            <span className="font-semibold tabular-nums">{item.priorityScore.toFixed(1)}</span>
            <span className="text-content-tertiary"> / 100</span>
            <span className="mt-1 block text-2xs text-content-tertiary">
              {item.priorityFactors.length} weighted factors · deterministic rule set
            </span>
          </FieldRow>

          <FieldRow label={t("cd.riskCategory")} icon="TriangleAlert">
            {info.riskCategory}
          </FieldRow>

          <FieldRow label={t("col.category")} icon="Tag">
            <span className="flex items-center gap-1.5">
              <Icon
                name={EXCEPTION_META[item.exceptionType].icon}
                size="xs"
                className="text-content-tertiary"
              />
              {exceptionLabel(item.exceptionType, labels)}
            </span>
          </FieldRow>

          <FieldRow label={t("cd.detectionRule")} icon="Zap">
            <span className="font-mono text-2xs">{info.detectionRuleId}</span> ·{" "}
            {info.detectionRuleName}
            <span className="mt-1 block text-2xs text-content-tertiary">
              {t("cd.signal")} <span className="font-mono">{info.signalRef}</span>
            </span>
          </FieldRow>

          <FieldRow label={t("cd.detectionSource")} icon={detection.icon}>
            {detection.label}
            <span className="mt-1 block text-2xs text-content-tertiary">
              {detection.description}
            </span>
          </FieldRow>
        </div>
      </div>

      {detail.supplierIssues.length > 0 ? (
        <div className="border-t border-line bg-surface-subtle px-4 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
            Other cases against {item.supplierName}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {detail.supplierIssues.map((entry) => (
              <li key={entry.caseNo}>
                <Link
                  href={caseHref(entry.caseNo)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm border bg-surface px-2 py-1 text-2xs transition-colors duration-150 hover:border-line-strong",
                    entry.priorityBand === "CRITICAL"
                      ? "border-critical-line"
                      : "border-line",
                  )}
                >
                  <span className="font-mono text-content-secondary">{entry.caseNo}</span>
                  <span className="max-w-40 truncate text-content">{entry.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
});
