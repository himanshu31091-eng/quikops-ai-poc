import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import { DETECTION_SOURCE_META } from "@/src/config/app-config";
import type { CaseListItem } from "@/src/domain/types";

/**
 * How this case reached QuikOps.
 *
 * The single most-asked question in a client walkthrough is "where does this
 * come from?", and the honest answer is that it comes from systems the client
 * already owns. This renders that chain as one read: the system of record, the
 * row inside it, the signal, the rule that judged the signal worth acting on,
 * and the case that resulted.
 *
 * Every value is a field already on the case — nothing here is narrated. The
 * chain deliberately stops at the case: what happens next is the rest of the
 * screen, and claiming the lineage extends into the outcome would imply the
 * platform decided the outcome.
 */
interface DataLineageCardProps {
  item: CaseListItem;
  detectionRule: string;
  signalRef: string;
  ownerName: string;
}

interface Step {
  label: string;
  value: string;
  detail?: string;
  icon: string;
}

export function DataLineageCard({
  item,
  detectionRule,
  signalRef,
  ownerName,
}: DataLineageCardProps) {
  const detection = DETECTION_SOURCE_META[item.detectedBy];

  const steps: Step[] = [
    {
      label: "System of record",
      value: item.sourceSystem,
      detail: "Owned and operated by Perma Construction Aids. QuikOps reads it; it does not replace it.",
      icon: "PlugZap",
    },
    {
      label: "Source record",
      value: item.sourceRecord,
      detail: item.materialCode ? `Material ${item.materialCode}` : undefined,
      icon: "FileText",
    },
    {
      label: "Operational signal",
      value: signalRef,
      detail: detection.description,
      icon: "Activity",
    },
    {
      label: "Business rule",
      value: detectionRule,
      detail: "The rule that judged this signal worth raising as a case.",
      icon: "ShieldCheck",
    },
    {
      label: "QuikOps case",
      value: item.caseNo,
      detail: `${item.plant.name} · ${item.priorityBand.toLowerCase()} priority`,
      icon: "Rows3",
    },
    {
      label: "Owner",
      value: ownerName,
      detail: "Accountable for the corrective action below.",
      icon: "UserCog",
    },
  ];

  return (
    <SectionCard
      title="How this case reached QuikOps"
      subtitle="The signal originates in an existing business system. QuikOps converts it into an owned, tracked case."
      icon="Link2"
    >
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li key={step.label} className="flex gap-3">
            {/* The rail is the chain: a connector below every step but the last. */}
            <div className="flex shrink-0 flex-col items-center">
              <span className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-subtle text-content-secondary">
                <Icon name={step.icon} size="sm" />
              </span>
              {index < steps.length - 1 ? (
                <span className="h-full min-h-6 w-px flex-1 bg-line" />
              ) : null}
            </div>

            <div className={index < steps.length - 1 ? "min-w-0 flex-1 pb-4" : "min-w-0 flex-1"}>
              <p className="text-2xs font-semibold uppercase tracking-wider text-content-tertiary">
                {step.label}
              </p>
              <p className="mt-0.5 break-words text-sm font-medium text-content">{step.value}</p>
              {step.detail ? (
                <p className="mt-0.5 text-2xs leading-relaxed text-content-tertiary">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
