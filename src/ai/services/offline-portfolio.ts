import type { PortfolioSnapshot } from "@/src/data/queries/portfolio";
import { formatMoney } from "@/src/lib/format";

/**
 * The no-API-key path at portfolio scope.
 *
 * Composed from the same snapshot the live path sends to the model, so every
 * figure is real — it is the reasoning that is scripted, not the facts. Kept
 * beside its case-scoped sibling rather than inside it: the two share no logic
 * and merging them would make both harder to read.
 */

type PortfolioIntent =
  | "worst_plant"
  | "focus"
  | "revenue"
  | "supplier"
  | "board"
  | "sla"
  | "unowned"
  | "execution"
  | "general";

/** Keyword routing. Order matters: first match wins. */
const INTENT_RULES: { intent: PortfolioIntent; patterns: RegExp }[] = [
  { intent: "unowned", patterns: /unowned|unassigned|nobody|no owner|picked up|pick up/i },
  { intent: "worst_plant", patterns: /plant|site|facility|hurting|worst/i },
  { intent: "supplier", patterns: /supplier|vendor|commercial|pattern/i },
  { intent: "sla", patterns: /sla|breach|overdue|late|about to/i },
  { intent: "execution", patterns: /better or worse|improv|execution performance|trend/i },
  { intent: "board", patterns: /board|brief|executive|leadership/i },
  { intent: "focus", patterns: /focus|today|three things|what should i/i },
  { intent: "revenue", patterns: /revenue|risk|exposure|money|cost/i },
];

function classify(question: string): PortfolioIntent {
  for (const rule of INTENT_RULES) {
    if (rule.patterns.test(question)) return rule.intent;
  }
  return "general";
}

export function offlinePortfolioAnswer(
  snapshot: PortfolioSnapshot,
  question: string,
): string {
  const t = snapshot.totals;
  const money = (value: number) => formatMoney(value, t.currency);

  const worstPlant = [...snapshot.plants].sort((a, b) => a.otifPct - b.otifPct)[0];
  const topCase = snapshot.openCases[0];
  const unowned = snapshot.openCases.filter((item) => item.owner === null);
  const breached = snapshot.openCases.filter((item) => item.slaBreachedAt !== null);
  const worstSupplier = snapshot.supplierExposure[0];

  const networkLine = `Across the network there are **${t.openCases} open cases** carrying **${money(
    t.revenueAtRisk,
  )}**. ${t.breachedOpen} are past SLA and ${t.unassignedOpen} have no owner.`;

  switch (classify(question)) {
    case "worst_plant": {
      if (!worstPlant) return "No plant health data is present in the record.";
      return [
        `**${worstPlant.plant.name} (${worstPlant.plant.code})** is the weakest site, running **${worstPlant.otifPct}% on-time in full**, ${worstPlant.otifDeltaPts >= 0 ? "up" : "down"} ${Math.abs(worstPlant.otifDeltaPts)} points. It carries ${worstPlant.openCases} open case${worstPlant.openCases === 1 ? "" : "s"}, ${worstPlant.criticalCases} of them critical, and ${money(worstPlant.revenueAtRisk)} at risk against ${worstPlant.slaAdherencePct}% SLA adherence.`,
        networkLine,
        worstSupplier
          ? `The pattern worth acting on is commercial rather than operational: **${worstSupplier.supplierName}** alone accounts for ${worstSupplier.openCases} open cases worth ${money(worstSupplier.revenueAtRisk)}.`
          : "No single supplier dominates the open set, so the exposure is genuinely distributed.",
      ].join("\n\n");
    }

    case "focus": {
      const top = snapshot.openCases.slice(0, 3);
      if (top.length === 0) return "Nothing is open. There is no work to prioritise.";
      return [
        "Three things, in this order.",
        top
          .map(
            (item, index) =>
              `${index + 1}. **${item.caseNo} — ${item.title}**. ${item.priorityBand} at ${item.priorityScore.toFixed(1)}/100, ${money(item.revenueAtRisk)} at risk at ${item.plant.name}, ${item.owner ? `owned by ${item.owner.name}` : "**with no owner**"}${item.slaBreachedAt ? ", already past SLA" : ""}.`,
          )
          .join("\n"),
        `That order holds because priority is scored on revenue at risk, KPI deviation, customer tier, time to promised date, recurrence and escalation — the ranking already encodes what you would weigh by hand.`,
        t.unassignedOpen > 0
          ? `Before any of it: ${t.unassignedOpen} open case${t.unassignedOpen === 1 ? " has" : "s have"} no owner. An unowned case is not being worked, whatever its score.`
          : `Every open case has an owner, so the constraint is capacity rather than accountability.`,
      ].join("\n\n");
    }

    case "revenue": {
      return [
        `Total exposure across ${t.openCases} open cases is **${money(t.revenueAtRisk)}**.`,
        snapshot.byBand
          .filter((band) => band.count > 0)
          .map(
            (band) =>
              `- **${band.band}** — ${band.count} case${band.count === 1 ? "" : "s"}, ${money(band.revenueAtRisk)}`,
          )
          .join("\n"),
        topCase
          ? `The single largest is **${topCase.caseNo}** at ${money(topCase.revenueAtRisk)} — ${topCase.title}, at ${topCase.plant.name}.`
          : "",
        worstSupplier
          ? `The concentration worth attacking is **${worstSupplier.supplierName}**: ${worstSupplier.openCases} open cases worth ${money(worstSupplier.revenueAtRisk)} between them. One commercial escalation covering all of them moves more than resolving each separately.`
          : "",
        `This is exposure, not loss already taken — the value of confirmed demand that cannot be served if these conditions are not cleared before their promised dates.`,
      ]
        .filter((part) => part !== "")
        .join("\n\n");
    }

    case "supplier": {
      if (snapshot.supplierExposure.length === 0) {
        return `No supplier currently carries more than one open case, so the exposure is distributed rather than concentrated. There is no commercial pattern to escalate — these are individual operational fixes.`;
      }
      return [
        `${snapshot.supplierExposure.length} supplier${snapshot.supplierExposure.length === 1 ? " carries" : "s carry"} more than one open case, which makes ${snapshot.supplierExposure.length === 1 ? "it" : "them"} a commercial conversation rather than a set of operational fixes.`,
        snapshot.supplierExposure
          .map(
            (entry) =>
              `- **${entry.supplierName}** — ${entry.openCases} open cases, ${money(entry.revenueAtRisk)} at risk${entry.maxRecurrence > 1 ? `, worst is detection ${entry.maxRecurrence} against the same condition` : ""}`,
          )
          .join("\n"),
        `Recurrence is the signal that matters. A condition detected three times is not three incidents — it is one unresolved root cause that previous corrective action failed to hold. Escalate to account management and ask for a written commitment rather than opening a fourth case.`,
      ].join("\n\n");
    }

    case "sla": {
      return [
        `**${t.breachedOpen} of ${t.openCases} open cases are past SLA**, against ${snapshot.metrics.slaAdherencePct}% adherence for the quarter.`,
        breached.length > 0
          ? breached
              .slice(0, 5)
              .map(
                (item) =>
                  `- **${item.caseNo}** — ${item.priorityBand}, ${money(item.revenueAtRisk)}, ${item.plant.name}, ${item.owner ? `owned by ${item.owner.name}` : "**no owner**"}`,
              )
              .join("\n") +
            (breached.length > 5 ? `\n- …and ${breached.length - 5} more` : "")
          : "Nothing is currently past its resolution target.",
        `Targets run by band: critical 24 hours, high 72, medium 240, low 720. Breaching escalates a case above its owner — ${t.escalatedOpen} open case${t.escalatedOpen === 1 ? " is" : "s are"} currently escalated.`,
        t.unassignedOpen > 0
          ? `${t.unassignedOpen} open case${t.unassignedOpen === 1 ? " has" : "s have"} no owner, which is the gap to close first — a case nobody owns does not breach late, it breaches by default.`
          : `Every open case has a named owner, so the gap is capacity rather than accountability.`,
      ].join("\n\n");
    }

    case "unowned": {
      if (unowned.length === 0) {
        return `Every open case has a named owner. Accountability is not the constraint — ${
          t.breachedOpen > 0
            ? `${t.breachedOpen} case${t.breachedOpen === 1 ? " is" : "s are"} past SLA despite being owned, which points at capacity or blocked dependencies rather than routing.`
            : `and nothing is past SLA, so execution is keeping pace.`
        }`;
      }
      const plants = [...new Set(unowned.map((item) => item.plantCode))].join(", ");
      return [
        `**${unowned.length} open case${unowned.length === 1 ? " has" : "s have"} no owner.**`,
        unowned
          .slice(0, 6)
          .map(
            (item) =>
              `- **${item.caseNo}** — ${item.priorityBand} at ${item.priorityScore.toFixed(1)}, ${money(item.revenueAtRisk)}, ${item.plant.name}${item.slaBreachedAt ? ", already past SLA" : ""}`,
          )
          .join("\n"),
        `Route them by plant scope — each needs an operations manager or task owner covering ${plants}. Assigning an owner moves a detected case straight to assigned; the status follows the work, so there is nothing else to set.`,
      ].join("\n\n");
    }

    case "execution": {
      return [
        `The two directions are diverging, and that is the important read.`,
        `**Operationally we are losing ground.** ${t.openCases} cases are open carrying ${money(t.revenueAtRisk)}, ${t.breachedOpen} past SLA, ${t.recurringOpen} of them repeat conditions.`,
        `**At execution we are improving.** Mean time to resolve is **${snapshot.metrics.mttrHours} hours, ${Math.abs(snapshot.metrics.mttrDeltaPct)}% ${snapshot.metrics.mttrDeltaPct < 0 ? "faster" : "slower"}** than last quarter. SLA adherence is **${snapshot.metrics.slaAdherencePct}%**, ${snapshot.metrics.slaAdherenceDeltaPts >= 0 ? "up" : "down"} ${Math.abs(snapshot.metrics.slaAdherenceDeltaPts)} points. Verification pass rate is ${snapshot.metrics.verificationPassRatePct}% and recurrence has fallen to ${snapshot.metrics.recurrenceRatePct}%.`,
        `You closed ${snapshot.metrics.casesClosedThisWeek} cases this week and opened ${snapshot.metrics.casesOpenedThisWeek}. That gap is the story: the team is fixing things faster than before and still losing ground, because conditions arrive faster than they are cleared. The lever is upstream — ${t.recurringOpen} open recurring conditions mean corrective action is not holding.`,
      ].join("\n\n");
    }

    case "board": {
      return [
        `**Operational position — ${snapshot.plants.length} plants**`,
        `${t.openCases} cases are open carrying **${money(t.revenueAtRisk)}** of revenue at risk. ${t.criticalOpen} critical, ${t.highOpen} high. ${t.breachedOpen} past their resolution target, ${t.unassignedOpen} with no owner.`,
        `**What is driving it.** ${worstPlant ? `${worstPlant.plant.name} is the weakest site at ${worstPlant.otifPct}% on-time in full with ${money(worstPlant.revenueAtRisk)} at risk. ` : ""}${worstSupplier ? `${worstSupplier.supplierName} accounts for ${worstSupplier.openCases} open cases worth ${money(worstSupplier.revenueAtRisk)} — a supplier performance issue rather than ${worstSupplier.openCases} separate operational ones. ` : ""}${t.recurringOpen} open cases are repeat detections, meaning earlier corrective action did not hold.`,
        `**What is working.** Mean time to resolve is down ${Math.abs(snapshot.metrics.mttrDeltaPct)}% to ${snapshot.metrics.mttrHours} hours; SLA adherence up ${Math.abs(snapshot.metrics.slaAdherenceDeltaPts)} points to ${snapshot.metrics.slaAdherencePct}%. Verification pass rate holding at ${snapshot.metrics.verificationPassRatePct}%.`,
        `**What needs a decision.** ${worstSupplier ? `A commercial escalation with ${worstSupplier.supplierName} — repeated corrective cycles are not changing their delivery performance.` : `Capacity against the ${t.unassignedOpen} unowned cases.`} Everything else is being executed within the existing process.`,
      ].join("\n\n");
    }

    default:
      return [
        `Across ${snapshot.plants.length} plants there are **${t.openCases} open cases** carrying **${money(t.revenueAtRisk)}** — ${t.criticalOpen} critical, ${t.highOpen} high, ${t.breachedOpen} past SLA and ${t.unassignedOpen} with no owner.`,
        `Execution is running at ${snapshot.metrics.mttrHours}h mean time to resolve and ${snapshot.metrics.slaAdherencePct}% SLA adherence.`,
        `I answer from the operational position on screen — open cases, plant health, execution performance, supplier exposure, revenue impact and inventory. Ask which plant is worst, where the revenue risk sits, what to focus on today, or whether there are supplier patterns worth escalating commercially.`,
      ].join("\n\n");
  }
}
