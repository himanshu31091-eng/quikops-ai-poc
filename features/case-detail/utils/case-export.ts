import { format } from "date-fns";
import {
  AUDIT_SOURCE_LABEL,
  CASE_STATUS_META,
  DETECTION_SOURCE_META,
  PRIORITY_META,
} from "@/src/config/app-config";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { formatMoney } from "@/src/lib/format";
import type { CaseSessionState } from "../types";

/**
 * Case export. Produces the handover document a manager actually sends — the
 * record as it stands right now, including anything changed in this session,
 * not a snapshot of what the server last returned.
 */

const stamp = (value: string): string => format(new Date(value), "d MMM yyyy, HH:mm");

export function buildCaseMarkdown(
  detail: CaseDetailModel,
  session: CaseSessionState,
): string {
  const item = detail.case;
  const owner = detail.assignableUsers.find((user) => user.id === session.ownerId);
  const reviewer = detail.assignableUsers.find((user) => user.id === session.reviewerId);
  const lines: string[] = [];

  lines.push(`# ${item.caseNo} — ${item.title}`);
  lines.push("");
  lines.push(
    `**Status** ${CASE_STATUS_META[session.status].label} · **Priority** ${
      PRIORITY_META[session.priorityBand].label
    } (${item.priorityScore.toFixed(1)}) · **Plant** ${item.plantCode} ${item.plant.name}`,
  );
  lines.push(
    `**Owner** ${owner?.name ?? "Unassigned"} · **Reviewer** ${
      reviewer?.name ?? detail.reviewer.name
    } · **Due** ${stamp(session.dueAt)}`,
  );
  lines.push(
    `**Revenue at risk** ${formatMoney(item.revenueAtRisk, item.currency)} · **Category** ${
      detail.exceptionLabel
    } · **Detected by** ${DETECTION_SOURCE_META[item.detectedBy].label}`,
  );
  lines.push("");

  lines.push("## Executive summary");
  lines.push("");
  lines.push(`**Problem.** ${detail.summary.problem}`);
  lines.push("");
  lines.push(`**Business impact.** ${detail.summary.businessImpact}`);
  lines.push("");
  lines.push(`**Operational impact.** ${detail.summary.operationalImpact}`);
  lines.push("");
  lines.push(
    `**Root cause (${detail.summary.rootCauseConfidence.toLowerCase()}).** ${detail.summary.rootCause}`,
  );
  lines.push("");
  lines.push(`**Customer impact.** ${detail.summary.customerImpact}`);
  lines.push("");
  lines.push(`**Target KPI.** ${detail.summary.targetKpi}`);
  lines.push("");
  lines.push(`**Why the case exists.** ${detail.summary.whyRaised}`);
  lines.push("");

  lines.push("## Case information");
  lines.push("");
  lines.push(`- Material: ${item.materialCode ?? "—"} ${item.materialDesc ?? ""}`);
  lines.push(`- Supplier: ${item.supplierName ?? "—"}`);
  lines.push(
    `- Customer: ${item.customerName ?? "—"}${
      item.customerTier ? ` (${item.customerTier.replace("_", " ")})` : ""
    }`,
  );
  lines.push(`- Production line: ${detail.information.productionLine}`);
  lines.push(`- Order reference: ${detail.information.orderRef}`);
  lines.push(`- Risk category: ${detail.information.riskCategory}`);
  lines.push(
    `- Detection rule: ${detail.information.detectionRuleId} — ${detail.information.detectionRuleName}`,
  );
  lines.push(`- Signal: ${detail.information.signalRef}`);
  lines.push("");

  lines.push(`## Corrective actions (${session.actions.length})`);
  lines.push("");
  if (session.actions.length === 0) {
    lines.push("_None recorded._");
  } else {
    for (const action of session.actions) {
      const actionOwner = detail.assignableUsers.find((user) => user.id === action.ownerId);
      lines.push(
        `- **${action.title}** — ${action.status.replace("_", " ").toLowerCase()}, ${
          action.completionPct
        }% complete, owner ${actionOwner?.name ?? action.ownerId}, due ${stamp(action.dueAt)}`,
      );
      lines.push(`  - ${action.description}`);
      if (action.notes) lines.push(`  - Notes: ${action.notes}`);
    }
  }
  lines.push("");

  lines.push(`## Evidence (${session.evidence.length})`);
  lines.push("");
  for (const file of session.evidence) {
    lines.push(
      `- ${file.fileName} — ${file.description} (${file.uploadedByName}, ${stamp(
        file.uploadedAt,
      )})`,
    );
  }
  lines.push("");

  lines.push("## Verification");
  lines.push("");
  if (!session.verification) {
    lines.push("_Not yet requested._");
  } else {
    lines.push(
      `- Requested by ${session.verification.requestedByName} on ${stamp(
        session.verification.requestedAt,
      )}`,
    );
    lines.push(`- Reviewer: ${session.verification.reviewerName}`);
    lines.push(`- Decision: ${session.verification.decision ?? "Pending"}`);
    if (session.verification.decidedAt) {
      lines.push(`- Decided: ${stamp(session.verification.decidedAt)}`);
    }
    if (session.verification.comment) {
      lines.push(`- Comment: ${session.verification.comment}`);
    }
    if (session.verification.notes) lines.push(`- Notes: ${session.verification.notes}`);
  }
  lines.push("");

  lines.push(`## Timeline (${session.timeline.length} events)`);
  lines.push("");
  for (const event of session.timeline) {
    lines.push(`- ${stamp(event.at)} · ${event.actorName} — ${event.title}. ${event.detail}`);
  }
  lines.push("");

  lines.push(`## Discussion (${session.comments.length})`);
  lines.push("");
  for (const comment of session.comments) {
    lines.push(
      `- ${stamp(comment.at)} · ${comment.authorName}${
        comment.parentId ? " (reply)" : ""
      }: ${comment.body}`,
    );
  }
  lines.push("");

  lines.push(`## Audit log (${session.audit.length} entries)`);
  lines.push("");
  for (const entry of session.audit) {
    lines.push(
      `- ${stamp(entry.at)} · ${entry.actorName} · ${entry.action}${
        entry.field ? ` (${entry.field}: ${entry.fromValue ?? "—"} → ${entry.toValue ?? "—"})` : ""
      } · ${AUDIT_SOURCE_LABEL[entry.source].toLowerCase()}`,
    );
  }

  return lines.join("\n");
}

export function exportCase(detail: CaseDetailModel, session: CaseSessionState): string {
  const filename = `${detail.case.caseNo}-case-record.md`;
  const blob = new Blob([buildCaseMarkdown(detail, session)], {
    type: "text/markdown;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}
