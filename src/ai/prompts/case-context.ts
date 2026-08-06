import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatHours, formatMoney } from "@/src/lib/format";
import type { SessionOverlay } from "../types";

/**
 * Layer 3: this case, right now.
 *
 * Rendered from the data layer on the server, never from anything the browser
 * sent, and bounded by the context budget. Every line is a value the model is
 * allowed to quote back verbatim.
 */

const shortDate = (value: string): string =>
  new Date(value).toISOString().slice(0, 16).replace("T", " ");

export function buildCaseContext(
  detail: CaseDetailModel,
  overlay: SessionOverlay | null = null,
): string {
  const item = detail.case;
  const lines: string[] = [];

  const hoursToDue = (new Date(item.dueAt).getTime() - DEMO_NOW.getTime()) / 3_600_000;

  lines.push(`# Case ${item.caseNo}`);
  lines.push(`Title: ${item.title}`);
  lines.push(`Description: ${item.description}`);
  lines.push(
    `Status: ${item.status} | Priority: ${item.priorityBand} (score ${item.priorityScore.toFixed(
      1,
    )}/100) | Escalation level: ${item.escalationLevel}`,
  );
  lines.push(
    `Plant: ${item.plantCode} — ${item.plant.name}, ${item.plant.country} | Production line: ${detail.information.productionLine}`,
  );
  lines.push(`Category: ${detail.exceptionLabel} | Risk category: ${detail.information.riskCategory}`);
  lines.push(
    `Owner: ${item.owner ? `${item.owner.name} (${item.owner.jobTitle})` : "Unassigned"} | Reviewer: ${
      detail.reviewer.name
    } (${detail.reviewer.jobTitle})`,
  );
  lines.push(
    `Material: ${item.materialCode ?? "n/a"} ${item.materialDesc ?? ""} | Supplier: ${
      item.supplierName ?? "n/a"
    } | Customer: ${item.customerName ?? "n/a"}${
      item.customerTier ? ` (${item.customerTier.replace("_", " ")})` : ""
    }`,
  );
  lines.push(`Order reference: ${detail.information.orderRef} (${detail.information.orderType})`);
  lines.push(
    `Revenue at risk: ${formatMoney(item.revenueAtRisk, item.currency)} | Recurrence: ${
      item.recurrenceCount
    } detection(s) | Detected by: ${item.detectedBy}`,
  );
  lines.push(
    `Opened: ${shortDate(item.openedAt)} | Due: ${shortDate(item.dueAt)} (${
      hoursToDue < 0
        ? `${formatHours(Math.abs(hoursToDue))} past SLA`
        : `${formatHours(hoursToDue)} remaining`
    }) | Last detected: ${shortDate(item.lastDetectedAt)}`,
  );
  lines.push(`Current time for all relative calculations: ${shortDate(DEMO_NOW.toISOString())} UTC`);

  lines.push("");
  lines.push("## Priority score breakdown (deterministic rule set)");
  for (const factor of item.priorityFactors) {
    lines.push(`- ${factor.factor}: ${factor.raw} → +${factor.weighted.toFixed(1)} points`);
  }
  lines.push(
    `Total ${item.priorityScore.toFixed(1)} → band ${item.priorityBand}. Bands: CRITICAL ≥75, HIGH ≥55, MEDIUM ≥32, LOW below 32.`,
  );

  lines.push("");
  lines.push("## Measured KPI");
  lines.push(
    `${item.kpiKey}: baseline ${item.baselineValue}, target ${item.targetValue}, measured over ${item.measurementWindowDays} days.`,
  );

  lines.push("");
  lines.push("## Detection");
  lines.push(
    `${detail.information.detectionRuleId} — ${detail.information.detectionRuleName}. ${detail.information.detectionRuleDetail}`,
  );
  lines.push(`Signal reference: ${detail.information.signalRef}`);

  lines.push("");
  lines.push("## Analysis recorded on the case");
  lines.push(`Root cause (${detail.summary.rootCauseConfidence}): ${detail.summary.rootCause}`);
  lines.push(`Operational impact: ${detail.summary.operationalImpact}`);
  lines.push(`Customer impact: ${detail.summary.customerImpact}`);

  lines.push("");
  lines.push(`## Corrective actions (${detail.actions.length})`);
  if (detail.actions.length === 0) {
    lines.push("None created yet.");
  } else {
    for (const action of detail.actions) {
      lines.push(
        `- [${action.status}, ${action.completionPct}%] ${action.title} — owner ${
          detail.assignableUsers.find((u) => u.id === action.ownerId)?.name ?? action.ownerId
        }, due ${shortDate(action.dueAt)}. ${action.description} Notes: ${action.notes}`,
      );
    }
  }

  lines.push("");
  lines.push(`## Evidence (${detail.evidence.length})`);
  for (const file of detail.evidence) {
    lines.push(
      `- ${file.fileName} (${file.kind}) uploaded ${shortDate(file.uploadedAt)} by ${
        file.uploadedByName
      }: ${file.description}`,
    );
  }

  lines.push("");
  lines.push(`## Timeline (${detail.timeline.length} events)`);
  for (const event of detail.timeline) {
    lines.push(`- ${shortDate(event.at)} · ${event.actorName}: ${event.title}. ${event.detail}`);
  }

  lines.push("");
  lines.push("## Verification");
  if (!detail.verification) {
    lines.push("Not yet requested.");
  } else {
    lines.push(
      `Requested ${shortDate(detail.verification.requestedAt)} by ${
        detail.verification.requestedByName
      }; reviewer ${detail.verification.reviewerName}. Decision: ${
        detail.verification.decision ?? "PENDING"
      }${detail.verification.decidedAt ? ` on ${shortDate(detail.verification.decidedAt)}` : ""}. ${
        detail.verification.comment || detail.verification.notes
      }`,
    );
  }

  lines.push("");
  lines.push(`## Audit history (${detail.audit.length} entries, newest first)`);
  for (const entry of detail.audit.slice(0, 30)) {
    const change = entry.field
      ? ` [${entry.field}: ${entry.fromValue ?? "—"} -> ${entry.toValue ?? "—"}]`
      : "";
    lines.push(
      `- ${shortDate(entry.at)} · ${entry.actorName} · ${entry.action}${change} (source: ${entry.source})`,
    );
  }
  if (detail.audit.length > 30) {
    lines.push(`- … ${detail.audit.length - 30} older entries not shown.`);
  }

  lines.push("");
  lines.push(`## Discussion (${detail.comments.length} comments)`);
  for (const comment of detail.comments) {
    lines.push(`- ${shortDate(comment.at)} ${comment.authorName}: ${comment.body}`);
  }

  if (detail.supplierIssues.length > 0) {
    lines.push("");
    lines.push(`## Other cases against ${item.supplierName}`);
    for (const entry of detail.supplierIssues) {
      lines.push(
        `- ${entry.caseNo} [${entry.status}, ${entry.priorityBand}] ${entry.title} — ${formatMoney(
          entry.revenueAtRisk,
          item.currency,
        )} at ${entry.plantCode}`,
      );
    }
  }

  if (detail.related.length > 0) {
    lines.push("");
    lines.push("## Related cases");
    for (const entry of detail.related) {
      lines.push(
        `- ${entry.caseNo} [${entry.status}, ${entry.priorityBand}] ${entry.title} (${entry.relation}) — ${formatMoney(
          entry.revenueAtRisk,
          item.currency,
        )} at ${entry.plantCode}`,
      );
    }
  }

  lines.push("");
  lines.push(
    `## Execution health: ${detail.health.score}/100 (${detail.health.band.replace("_", " ")})`,
  );
  for (const driver of detail.health.drivers) {
    lines.push(`- ${driver.positive ? "+" : "-"} ${driver.label}: ${driver.detail}`);
  }

  if (overlay && Object.keys(overlay).length > 0) {
    const named = (id: string | null | undefined) =>
      id ? (detail.assignableUsers.find((user) => user.id === id)?.name ?? id) : "unassigned";

    lines.push("");
    lines.push("## Unsaved changes made in the current session");
    lines.push(
      "The person you are talking to has made these changes on screen. They are not yet written to the operational store, but they are true right now and override the values above.",
    );
    if (overlay.status) lines.push(`- Status is now ${overlay.status}`);
    if (overlay.ownerId !== undefined) lines.push(`- Owner is now ${named(overlay.ownerId)}`);
    if (overlay.reviewerId) lines.push(`- Reviewer is now ${named(overlay.reviewerId)}`);
    if (overlay.priorityBand) {
      lines.push(`- Priority band overridden to ${overlay.priorityBand}`);
    }
    if (overlay.actionsTotal !== undefined && overlay.actionsDone !== undefined) {
      lines.push(
        `- Corrective plan is ${overlay.actionsDone} of ${overlay.actionsTotal} actions complete`,
      );
    }
    if (overlay.evidenceCount !== undefined) {
      lines.push(`- ${overlay.evidenceCount} evidence files are attached`);
    }
    if (overlay.verificationDecision) {
      lines.push(`- Verification decision recorded: ${overlay.verificationDecision}`);
    }
  }

  return lines.join("\n");
}
