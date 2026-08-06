import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatHours, formatMoney } from "@/src/lib/format";

/**
 * The no-API-key path.
 *
 * Composed from the same case record the live path sends to the model, so the
 * content is accurate — it is the reasoning that is scripted, not the facts.
 * Kept in its own module so the live transport stays readable and so this can
 * be deleted outright once a key is always present.
 */

type Intent =
  | "root_cause"
  | "summary"
  | "recommend"
  | "executive"
  | "preventive"
  | "impact"
  | "priority"
  | "management"
  | "client"
  | "general";

/** Keyword routing for the offline responder. Order matters: first match wins. */
const INTENT_RULES: { intent: Intent; patterns: RegExp }[] = [
  { intent: "priority", patterns: /priorit|score|band|weight/i },
  { intent: "executive", patterns: /executive summary|brief for|for the board|for leadership/i },
  { intent: "preventive", patterns: /prevent|recur|stop.*happening|avoid.*again/i },
  { intent: "recommend", patterns: /recommend|corrective|what should|next step|action/i },
  { intent: "impact", patterns: /impact|cost|revenue|exposure|estimate/i },
  { intent: "root_cause", patterns: /why|root cause|caused|reason/i },
  { intent: "management", patterns: /management update|weekly review|ops review|for management/i },
  { intent: "client", patterns: /client|customer.ready|send to the customer|customer summary/i },
  { intent: "summary", patterns: /summar|overview|catch me up|status/i },
];

function classify(question: string): Intent {
  for (const rule of INTENT_RULES) {
    if (rule.patterns.test(question)) return rule.intent;
  }
  return "general";
}

/**
 * Offline answers. Composed from the same case record the live path sends to
 * the model, so the content is accurate — it is the reasoning that is scripted,
 * not the facts. Used when no API key is configured.
 */
export function offlineAnswer(detail: CaseDetailModel, question: string): string {
  const item = detail.case;
  const money = formatMoney(item.revenueAtRisk, item.currency);
  const open = detail.actions.filter((a) => a.status !== "DONE" && a.status !== "CANCELLED");
  const done = detail.actions.filter((a) => a.status === "DONE");
  const hoursToDue = (new Date(item.dueAt).getTime() - DEMO_NOW.getTime()) / 3_600_000;
  const slaText =
    hoursToDue < 0
      ? `**${formatHours(Math.abs(hoursToDue))} past its SLA target**`
      : `**${formatHours(hoursToDue)} of SLA remaining**`;
  const owner = item.owner?.name ?? "nobody — the case is unassigned";

  switch (classify(question)) {
    case "root_cause":
      return `${detail.summary.rootCause}\n\nConfidence is recorded as **${detail.summary.rootCauseConfidence.toLowerCase()}**. The condition was raised by ${
        detail.information.detectionRuleId
      } (${detail.information.detectionRuleName}) against the ${item.plantCode} dataset${
        item.recurrenceCount > 1
          ? `, and this is detection ${item.recurrenceCount} against the same material and source — the interval between detections is the strongest evidence that the previous fix addressed the symptom rather than the cause`
          : ", with no prior detection against this combination"
      }.\n\n${detail.summary.operationalImpact}`;

    case "summary":
      return `${item.caseNo} is a **${detail.exceptionLabel.toLowerCase()}** at ${
        item.plant.name
      } carrying ${money} of revenue at risk. It is ${item.status.replace(
        "_",
        " ",
      ).toLowerCase()}, owned by ${owner}, and ${slaText}.\n\n${item.description}\n\n${
        detail.actions.length === 0
          ? "No corrective actions have been created yet."
          : `${done.length} of ${detail.actions.length} corrective actions are complete. ${
              open.length > 0
                ? `The next open action is "${open[0]!.title}".`
                : "All actions are closed and the case is with the reviewer."
            }`
      } Execution health is ${detail.health.score}/100 (${detail.health.band
        .replace("_", " ")
        .toLowerCase()}).`;

    case "recommend":
      return `${
        open.length > 0
          ? `The plan already on the case covers the right ground — work it rather than starting again. The immediate step is **${
              open[0]!.title
            }** (${open[0]!.description})`
          : `All planned actions are complete, so the remaining step is verification by ${detail.reviewer.name}`
      }.\n\n${
        open
          .slice(1, 4)
          .map((action) => `- ${action.title} — ${action.description}`)
          .join("\n") || ""
      }${open.length > 1 ? "\n\n" : ""}${
        detail.supplierIssues.filter((entry) => entry.status !== "CLOSED").length > 0
          ? `Beyond the case itself: ${item.supplierName} carries ${
              detail.supplierIssues.filter((entry) => entry.status !== "CLOSED").length
            } other open cases. A single commercial escalation covering all of them will move more than resolving each one separately.`
          : `Beyond the case itself, nothing else is open against ${
              item.supplierName ?? "this source"
            }, so the exposure is contained to this case.`
      }`;

    case "executive":
      return `**${item.caseNo} — ${item.title}**\n\n${detail.summary.businessImpact}\n\n${
        detail.summary.customerImpact
      }\n\n${detail.summary.targetKpi}\n\nCurrent position: ${item.status
        .replace("_", " ")
        .toLowerCase()}, owned by ${owner}, ${slaText}. ${done.length} of ${
        detail.actions.length
      } corrective actions complete.`;

    case "preventive":
      return `The recurring exposure here is **${detail.information.riskCategory.toLowerCase()}**, and the record points at one durable fix rather than a set of controls.\n\n${
        detail.summary.rootCause
      }\n\nPractically that means: close the loop where the condition originates rather than where it surfaces, set the detection threshold so ${
        detail.information.detectionRuleId
      } fires with enough lead time to act, and record the outcome against the ${
        item.measurementWindowDays
      }-day measurement window so a repeat is visible as a recurrence rather than a new case.${
        item.recurrenceCount > 1
          ? ` This case has already recurred ${item.recurrenceCount} times, so the preventive step is the one that has been skipped each time.`
          : ""
      }`;

    case "impact":
      return `${detail.summary.revenueImpact}\n\n${detail.summary.businessImpact}\n\n${
        detail.summary.customerImpact
      }`;

    case "priority":
      return `The score is **${item.priorityScore.toFixed(1)} out of 100**, which places the case in the **${
        item.priorityBand
      }** band (critical at 75, high at 55, medium at 32). It comes from a deterministic rule set, not a model, so it can be defended in a review.\n\n${item.priorityFactors
        .map(
          (factor) => `- **${factor.factor}** — ${factor.raw}, contributing ${factor.weighted.toFixed(1)} points`,
        )
        .join(
          "\n",
        )}\n\nThe weights are configurable per deployment. Nothing about the score is inferred from the case text.`;

    case "management":
      return `**${item.caseNo} — ${item.title}**\n\n**Position.** ${item.status
        .replace("_", " ")
        .toLowerCase()} at ${item.plant.name}, owned by ${owner}, ${slaText}. ${money} of revenue at risk.\n\n**Done so far.** ${
        done.length === 0
          ? "No corrective actions have been closed yet."
          : `${done.length} of ${detail.actions.length} corrective actions complete, evidenced by ${detail.evidence.length} attached file${detail.evidence.length === 1 ? "" : "s"}.`
      }\n\n**Outstanding.** ${
        open.length === 0
          ? "Nothing outstanding on the plan — the case is with the reviewer."
          : `${open.length} action${open.length === 1 ? "" : "s"} open, next being "${open[0]!.title}".`
      }\n\n**Ask of management.** ${
        item.escalationLevel > 0
          ? `This case has escalated to level ${item.escalationLevel} — it needs a decision above the owner, not more chasing.`
          : item.recurrenceCount > 1
            ? `This is detection ${item.recurrenceCount} against the same source. A commercial conversation will move it further than another corrective cycle.`
            : "Nothing at this stage — the plan is being worked and is within SLA."
      }`;

    case "client":
      return `**Update on ${
        item.materialCode ? `${item.materialCode} supply` : "your order"
      }**\n\nWe identified a ${detail.exceptionLabel.toLowerCase()} affecting ${
        item.materialCode ?? "material"
      } at our ${item.plant.name} facility${
        item.customerName ? ` on work supporting ${item.customerName}` : ""
      }. We detected this proactively through our operational monitoring rather than at the point of delivery.\n\n${
        done.length > 0
          ? `We have completed ${done.length} corrective step${done.length === 1 ? "" : "s"}, each documented and independently reviewed.`
          : "A corrective plan is in place and being executed now."
      } ${
        open.length > 0
          ? `The remaining work is scheduled and tracked to a resolution target of ${formatHours(Math.abs(hoursToDue))} ${hoursToDue < 0 ? "past our internal deadline, which we are treating as escalated" : "from now"}.`
          : "The corrective work is complete and is undergoing final verification against a measurement window before we consider it closed."
      }\n\nWe will confirm once the outcome has been verified. Please contact your account manager if you need anything ahead of that.`;

    default:
      return `${item.caseNo} is a ${detail.exceptionLabel.toLowerCase()} at ${
        item.plant.name
      }, ${item.status.replace("_", " ").toLowerCase()}, ${money} at risk, ${slaText}.\n\nI answer from the case record on screen — the operational case, its corrective actions, evidence, comments, timeline and verification state. Ask about the root cause, the corrective plan, the business impact, the priority score, or what to do next.`;
  }
}
