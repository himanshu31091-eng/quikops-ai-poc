import { statusGroupOf } from "@/src/domain/case-status";
import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import type { CaseListItem } from "@/src/domain/types";
import type { PortfolioSnapshot } from "@/src/data/queries/portfolio";
import { ageHours } from "@/src/data/queries/portfolio";
import { formatMoney } from "@/src/lib/format";

/**
 * Layer 3, portfolio variant: the whole operation rather than one case.
 *
 * Rendered as plain labelled text rather than JSON. Two reasons: it costs
 * roughly a third fewer tokens than the equivalent JSON, and a model asked to
 * quote a figure back reproduces a labelled line more reliably than a nested
 * key path.
 *
 * The case list is deliberately bounded and ordered by priority score. An
 * executive asking "what should I worry about" is asking about the top of that
 * list; rendering all 24 cases in full would spend the budget on the tail.
 */

/** Open cases rendered in full. Beyond this they are summarised by count. */
const DETAILED_CASES = 12;

function line(label: string, value: string | number): string {
  return `${label}: ${value}`;
}

function renderCase(item: CaseListItem, index: number): string {
  const slaTarget = SLA_TARGET_HOURS[item.priorityBand];
  const age = ageHours(item.openedAt);
  const overdue = item.slaBreachedAt !== null;

  const parts = [
    `${index + 1}. ${item.caseNo} — ${item.title}`,
    `   ${line("Priority", `${item.priorityScore.toFixed(1)}/100 (${item.priorityBand})`)}`,
    `   ${line("Status", statusGroupOf(item.status).replace(/_/g, " ").toLowerCase())}`,
    `   ${line("Plant", `${item.plant.name} (${item.plantCode})`)}`,
    `   ${line("Revenue at risk", formatMoney(item.revenueAtRisk, item.currency))}`,
    `   ${line("Owner", item.owner?.name ?? "UNASSIGNED")}`,
    `   ${line(
      "SLA",
      overdue
        ? `BREACHED — target was ${slaTarget}h, case is ${age}h old`
        : `within target (${slaTarget}h target, ${age}h old)`,
    )}`,
  ];

  if (item.supplierName) parts.push(`   ${line("Supplier", item.supplierName)}`);
  if (item.customerName) {
    parts.push(
      `   ${line(
        "Customer",
        `${item.customerName}${item.customerTier ? ` (${item.customerTier.replace("_", " ")})` : ""}`,
      )}`,
    );
  }
  if (item.materialCode) parts.push(`   ${line("Material", item.materialCode)}`);
  if (item.recurrenceCount > 1) {
    parts.push(`   ${line("Recurrence", `detection ${item.recurrenceCount} against this condition`)}`);
  }
  if (item.escalationLevel > 0) {
    parts.push(`   ${line("Escalation", `level ${item.escalationLevel}`)}`);
  }

  return parts.join("\n");
}

export function buildPortfolioContext(snapshot: PortfolioSnapshot): string {
  const t = snapshot.totals;
  const money = (value: number) => formatMoney(value, t.currency);

  const sections: string[] = [];

  sections.push(
    [
      "PORTFOLIO POSITION",
      line("Cases in the system", t.totalCases),
      line("Open cases", t.openCases),
      line("Total revenue at risk across open cases", money(t.revenueAtRisk)),
      line("Open critical", t.criticalOpen),
      line("Open high", t.highOpen),
      line("Open cases past SLA", t.breachedOpen),
      line("Open cases with no owner", t.unassignedOpen),
      line("Awaiting verification", t.pendingVerification),
      line("Open recurring conditions (detection 2 or later)", t.recurringOpen),
      line("Open cases escalated above the owner", t.escalatedOpen),
    ].join("\n"),
  );

  sections.push(
    [
      "PRIORITY DISTRIBUTION (open cases)",
      ...snapshot.byBand.map(
        (band) => `${band.band}: ${band.count} case(s), ${money(band.revenueAtRisk)} at risk`,
      ),
    ].join("\n"),
  );

  sections.push(
    [
      "LIFECYCLE DISTRIBUTION (open cases)",
      ...snapshot.byStatusGroup.map(
        (entry) => `${entry.group.replace(/_/g, " ").toLowerCase()}: ${entry.count}`,
      ),
    ].join("\n"),
  );

  sections.push(
    [
      "EXECUTION PERFORMANCE (portfolio, this quarter)",
      line("Mean time to resolve", `${snapshot.metrics.mttrHours}h (${snapshot.metrics.mttrDeltaPct}% vs last quarter)`),
      line(
        "SLA adherence",
        `${snapshot.metrics.slaAdherencePct}% (${snapshot.metrics.slaAdherenceDeltaPts >= 0 ? "+" : ""}${snapshot.metrics.slaAdherenceDeltaPts} pts)`,
      ),
      line("Verification pass rate", `${snapshot.metrics.verificationPassRatePct}%`),
      line("Recurrence rate", `${snapshot.metrics.recurrenceRatePct}%`),
      line("Cases closed this week", snapshot.metrics.casesClosedThisWeek),
      line("Cases opened this week", snapshot.metrics.casesOpenedThisWeek),
    ].join("\n"),
  );

  sections.push(
    [
      "PLANT HEALTH",
      ...snapshot.plants.map((plant) =>
        [
          `${plant.plant.name} (${plant.plant.code}, ${plant.plant.country})`,
          `   ${line("On-time in full", `${plant.otifPct}% (${plant.otifDeltaPts >= 0 ? "+" : ""}${plant.otifDeltaPts} pts)`)}`,
          `   ${line("Open cases", `${plant.openCases}, of which ${plant.criticalCases} critical`)}`,
          `   ${line("Revenue at risk", money(plant.revenueAtRisk))}`,
          `   ${line("SLA adherence", `${plant.slaAdherencePct}%`)}`,
        ].join("\n"),
      ),
    ].join("\n"),
  );

  if (snapshot.supplierExposure.length > 0) {
    sections.push(
      [
        "SUPPLIER EXPOSURE (suppliers carrying more than one open case)",
        ...snapshot.supplierExposure.map(
          (entry) =>
            `${entry.supplierName}: ${entry.openCases} open cases, ${money(
              entry.revenueAtRisk,
            )} at risk, worst recurrence ${entry.maxRecurrence}`,
        ),
      ].join("\n"),
    );
  }

  sections.push(
    [
      "REVENUE IMPACT BY EXCEPTION TYPE",
      ...snapshot.revenueImpact.map(
        (bucket) =>
          `${bucket.exceptionType.replace(/_/g, " ").toLowerCase()}: ${money(
            bucket.atRisk,
          )} still at risk, ${money(bucket.recovered)} recovered, ${bucket.caseCount} case(s)`,
      ),
    ].join("\n"),
  );

  sections.push(
    [
      "INVENTORY HEALTH",
      ...snapshot.inventory.map(
        (row) =>
          `${row.plantName} (${row.plantCode}): ${row.inventoryDays} days coverage against a ${row.targetDays}-day policy, ${row.stockoutRiskSkus} SKUs at stockout risk, ${money(
            row.excessValue,
          )} excess — ${row.status.replace("_", " ").toLowerCase()}`,
      ),
    ].join("\n"),
  );

  const detailed = snapshot.openCases.slice(0, DETAILED_CASES);
  const remainder = snapshot.openCases.length - detailed.length;

  sections.push(
    [
      `OPEN CASES — highest priority first${
        remainder > 0
          ? `, showing the top ${detailed.length} of ${snapshot.openCases.length}`
          : ""
      }`,
      ...detailed.map(renderCase),
      ...(remainder > 0
        ? [
            `\n(${remainder} further open case(s) below priority ${detailed[
              detailed.length - 1
            ]!.priorityScore.toFixed(1)} are not listed individually. Say so if a question needs them.)`,
          ]
        : []),
    ].join("\n\n"),
  );

  return sections.join("\n\n");
}
