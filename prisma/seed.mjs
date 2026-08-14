import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Deterministic evaluation seed.
 *
 * Two tenants, deliberately different in kind: `perma-demo` mirrors the POC's
 * existing representative scenario, and `sika-evaluation` is a small dataset an
 * evaluator explores for themselves. Neither is production data and both say so
 * in `dataDisclosure`, which the shell renders.
 *
 * Everything is fixed — no randomness, no `new Date()` for "now". Dates derive
 * from DEMO_NOW so a reseed produces byte-identical rows and the relative dates
 * the UI computes ("2d ago") stay correct against the frozen clock.
 *
 * Small on purpose. Enough to render the dashboard, the queue, a case with its
 * actions, evidence and verification, and an audit trail — nothing more.
 */
const DEMO_NOW = new Date("2026-08-15T09:12:00Z");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const at = (days, hours = 0) => new Date(DEMO_NOW.getTime() + days * DAY + hours * HOUR);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLES = [
  { key: "EXECUTIVE", label: "Executive", description: "Sponsors work; does not own cases." },
  { key: "OPS_MANAGER", label: "Operations Manager", description: "Triages, assigns and verifies." },
  { key: "TASK_OWNER", label: "Task Owner", description: "Owns cases and executes corrective action." },
  { key: "ANALYST", label: "Supply Chain Analyst", description: "Investigates; can own cases." },
  { key: "ADMINISTRATOR", label: "Administrator", description: "Configuration, users, routing." },
];

const PERMISSIONS = [
  { key: "case.view", label: "View cases" },
  { key: "case.create", label: "Create cases" },
  { key: "case.assign", label: "Assign owners" },
  { key: "action.update", label: "Update corrective actions" },
  { key: "evidence.add", label: "Add evidence" },
  { key: "verification.decide", label: "Record a verification decision" },
  { key: "user.manage", label: "Manage users" },
  { key: "config.manage", label: "Manage configuration" },
];

async function main() {
  // Idempotent: a reseed replaces tenant-owned rows rather than duplicating.
  // Cascade from Tenant clears cases, actions, evidence and audit with it.
  await prisma.tenant.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});

  for (const p of PERMISSIONS) await prisma.permission.create({ data: p });
  for (const r of ROLES) await prisma.role.create({ data: r });

  /* ------------------------------------------------------- Perma demo */

  const perma = await prisma.tenant.create({
    data: {
      id: "perma-demo",
      name: "Perma Construction Aids",
      environmentLabel: "Demo Scenario",
      environmentType: "DEMO",
      industry: "Construction Chemicals — India",
      defaultLanguage: "en",
      supportedLanguages: ["en", "es"],
      currency: "INR",
      currencyLocale: "en-IN",
      dataDisclosure:
        "Illustrative demonstration data — a representative scenario, not a customer",
    },
  });

  const vapi = await prisma.plant.create({
    data: { tenantId: perma.id, code: "VP01", name: "Vapi", country: "India", countryCode: "IN", timezone: "Asia/Kolkata" },
  });
  const roorkee = await prisma.plant.create({
    data: { tenantId: perma.id, code: "RK01", name: "Roorkee", country: "India", countryCode: "IN", timezone: "Asia/Kolkata" },
  });

  const mk = (email, name, jobTitle, roleKey, scope) =>
    prisma.user.create({
      data: { tenantId: perma.id, email, name, jobTitle, roleKey, plantScope: scope, language: "en" },
    });

  await mk("rajesh.menon@example.com", "Rajesh Menon", "Supply Chain Head", "EXECUTIVE", []);
  await mk("neha.deshpande@example.com", "Neha Deshpande", "Head of Operations", "OPS_MANAGER", []);
  const sunil = await mk("sunil.joshi@example.com", "Sunil Joshi", "Plant Operations Manager — Vapi", "OPS_MANAGER", ["VP01"]);
  const arun = await mk("arun.iyer@example.com", "Arun Iyer", "Procurement Manager", "TASK_OWNER", ["VP01", "RK01"]);

  const otif = await prisma.kpiDefinition.create({
    data: {
      tenantId: perma.id,
      key: "OTIF_PCT",
      label: "On-time in full",
      definition:
        "Share of confirmed orders delivered on time and complete. Measured by the enterprise data platform; QuikOps reads it and never recomputes it.",
      unit: "%",
      sourceSystem: "Enterprise Data Platform",
    },
  });

  const inventoryDays = await prisma.kpiDefinition.create({
    data: {
      tenantId: perma.id,
      key: "INVENTORY_DAYS",
      label: "Inventory days of cover",
      definition:
        "Days of forward demand covered by on-hand stock. Measured by the enterprise data platform against the material's coverage policy.",
      unit: "days",
      sourceSystem: "Enterprise Data Platform",
    },
  });

  const source = await prisma.caseSource.create({
    data: {
      tenantId: perma.id,
      system: "SAP ERP",
      recordRef: "PO-PA-45821",
      signalRef: "SIG-2026-08-12-IN-00421",
      businessRuleId: "RULE-VD-002",
      businessRuleName: "Vendor confirmed date slip",
    },
  });

  // The hero case, carried over unchanged from the POC corpus.
  const hero = await prisma.case.create({
    data: {
      tenantId: perma.id,
      caseNo: "QO-PA-2026-00421",
      title: "Raw material availability — polymer resin",
      description:
        "Gujarat Petrochem confirmed dispatch of acrylic polymer resin four days behind the promised date against PO-PA-45821, followed by a one-day quality-release hold on the receipt. Three confirmed customer orders are at risk.",
      exceptionType: "VENDOR_DELAY",
      detectedBy: "EVERY_ANGLE",
      status: "IN_PROGRESS",
      priorityBand: "CRITICAL",
      priorityScore: 81.7,
      escalationLevel: 1,
      plantId: vapi.id,
      sourceId: source.id,
      materialCode: "RM-PR-3120",
      materialDesc: "Acrylic polymer resin, 45% solids, 220kg drum",
      customerCode: "C-LT-0114",
      customerName: "L&T Construction",
      customerTier: "TIER_1",
      supplierCode: "V-GPL-118",
      supplierName: "Gujarat Petrochem Ltd",
      revenueAtRisk: "4200000",
      currency: "INR",
      ownerId: arun.id,
      reviewerId: sunil.id,
      openedAt: at(-3),
      assignedAt: at(-3, 5),
      dueAt: at(1),
      lastDetectedAt: at(-3),
      recurrenceCount: 2,
      playbookId: "pb_material_shortage",
    },
  });

  // The pending-verification case: all work closed, waiting on a reviewer.
  const pending = await prisma.case.create({
    data: {
      tenantId: perma.id,
      caseNo: "QO-PA-2026-00418",
      title: "Packaging material shortage — HDPE pails",
      description:
        "Coverage of 20-litre HDPE pails fell to two days after Bharat Packaging deferred a confirmed consignment. All four corrective actions are complete and evidenced; submitted for independent verification.",
      exceptionType: "MATERIAL_SHORTAGE",
      detectedBy: "EVERY_ANGLE",
      status: "PENDING_VERIFY",
      priorityBand: "HIGH",
      priorityScore: 72.4,
      escalationLevel: 1,
      plantId: vapi.id,
      materialCode: "PK-HD-2000",
      customerName: "Shapoorji Pallonji",
      customerTier: "TIER_1",
      supplierName: "Bharat Packaging Industries",
      revenueAtRisk: "2850000",
      currency: "INR",
      ownerId: arun.id,
      reviewerId: sunil.id,
      openedAt: at(-5),
      assignedAt: at(-5, 4),
      dueAt: at(-2),
      slaBreachedAt: at(-2),
      lastDetectedAt: at(-5),
      recurrenceCount: 2,
    },
  });

  const variance = await prisma.case.create({
    data: {
      tenantId: perma.id,
      caseNo: "QO-PA-2026-00400",
      title: "Supplier delivery variance — cement consignments",
      description:
        "Delivered quantities from Shree Minerals varied from confirmed quantities on five of the last nine consignments.",
      exceptionType: "PLANNING_DEVIATION",
      detectedBy: "PLAYBOOK_MONITOR",
      status: "ASSIGNED",
      priorityBand: "LOW",
      priorityScore: 17.2,
      plantId: roorkee.id,
      supplierName: "Shree Minerals",
      revenueAtRisk: "1150000",
      currency: "INR",
      ownerId: arun.id,
      openedAt: at(-9),
      assignedAt: at(-9, 6),
      dueAt: at(2),
      lastDetectedAt: at(-9),
      recurrenceCount: 2,
    },
  });

  // Hero case plan: two closed, one still open and a day past due.
  const heroActions = [
    ["Expedite the next polymer resin shipment", "DONE", 100, at(-3), at(-3, 8)],
    ["Reserve a priority QC testing slot for the incoming resin", "DONE", 100, at(-2), at(-2, 6)],
    ["Re-sequence production to protect priority customer orders", "IN_PROGRESS", 55, at(-1), null],
  ];
  for (const [title, status, pct, dueAt, completedAt] of heroActions) {
    await prisma.correctiveAction.create({
      data: {
        tenantId: perma.id,
        caseId: hero.id,
        title,
        description: "Recorded by the plant team against the agreed acceptance criteria.",
        ownerId: arun.id,
        status,
        completionPct: pct,
        dueAt,
        completedAt,
        acceptanceCriteria: "Written confirmation retained and attached as evidence.",
      },
    });
  }

  // The pending-verification case asserts its own plan: "All four corrective
  // actions are complete and evidenced". Those rows have to exist, or the case
  // renders as submitted for sign-off with nothing behind it — which is the one
  // thing the verification card is there to make impossible. Titles are the
  // material-shortage playbook steps the POC already uses.
  const pendingPlan = [
    [
      "Confirm alternate supplier lead time in writing",
      "Obtain written confirmation of lead time and quantity from the qualified alternate source.",
      at(-4), at(-4, 6),
      ["alternate-supplier-confirmation.pdf", "DOCUMENT", 214338, "Qualified alternate source confirmed lead time and quantity in writing.", at(-4, 7)],
    ],
    [
      "Re-sequence the build to protect confirmed orders",
      "Move the constrained material to the orders with the earliest promised dates and the highest tier.",
      at(-4), at(-3, 4),
      ["revised-build-sequence.xlsx", "SPREADSHEET", 88104, "Build re-sequenced against the earliest promised dates and the highest tier.", at(-3, 5)],
    ],
    [
      "Raise the expedite and confirm freight mode",
      "Place the expedite request and confirm the freight mode and arrival date.",
      at(-3), at(-3, 8),
      ["expedite-request-45903.pdf", "DOCUMENT", 96256, "Expedite raised against the deferred consignment, with the freight mode and revised arrival confirmed.", at(-3, 9)],
    ],
    [
      "Reset the reorder point against the current demand profile",
      "Recalculate the trigger so the same coverage gap does not reopen inside the lead time.",
      at(-3), at(-2, 2),
      ["reorder-point-review.xlsx", "SPREADSHEET", 64512, "Reorder point recalculated against the current demand profile.", at(-2, 3)],
    ],
  ];
  for (const [index, [title, description, dueAt, completedAt, file]] of pendingPlan.entries()) {
    const action = await prisma.correctiveAction.create({
      data: {
        tenantId: perma.id,
        caseId: pending.id,
        title,
        description,
        ownerId: arun.id,
        status: "DONE",
        completionPct: 100,
        dueAt,
        completedAt,
        sequence: index,
        acceptanceCriteria: "Written confirmation retained and attached as evidence.",
      },
    });
    const [fileName, fileType, fileSizeBytes, proves, uploadedAt] = file;
    await prisma.evidence.create({
      data: {
        tenantId: perma.id,
        caseId: pending.id,
        actionId: action.id,
        fileName,
        fileType,
        fileSizeBytes,
        proves,
        uploadedById: arun.id,
        uploadedAt,
        // The reviewer has not decided yet, so nothing has been accepted.
        accepted: false,
      },
    });
  }

  await prisma.evidence.createMany({
    data: [
      { tenantId: perma.id, caseId: hero.id, fileName: "supplier-confirmation-45821.pdf", fileType: "DOCUMENT", fileSizeBytes: 184320, proves: "Supplier confirmed the revised dispatch date in writing.", uploadedById: arun.id, uploadedAt: at(-3, 9), accepted: true },
      { tenantId: perma.id, caseId: hero.id, fileName: "qc-inspection-record.pdf", fileType: "DOCUMENT", fileSizeBytes: 96256, proves: "Quality reserved a priority release slot for the incoming lot.", uploadedById: arun.id, uploadedAt: at(-2, 7), accepted: true },
      { tenantId: perma.id, caseId: hero.id, fileName: "revised-production-schedule.xlsx", fileType: "SPREADSHEET", fileSizeBytes: 51200, proves: "Production re-sequenced around the confirmed receipt.", uploadedById: arun.id, uploadedAt: at(-1, 3), accepted: false },
    ],
  });

  // The measurement the demo turns on. Baseline, target and interim are the
  // POC's existing values and are not recomputed here.
  await prisma.kpiMeasurement.create({
    data: {
      tenantId: perma.id,
      caseId: pending.id,
      kpiId: otif.id,
      baseline: 87,
      target: 95,
      current: 92,
      windowDays: 14,
      windowOpenedAt: at(-2),
      inProgress: true,
      measuredAt: at(0),
    },
  });

  // Every case states what it is measured against, because the KPI, its
  // baseline and its target are properties of the measurement rather than of
  // the case. Without a row here the case reads as 0 against a target of 0 —
  // which is not "unmeasured", it is wrong. These are the POC's existing
  // values for both cases, carried across unchanged.
  await prisma.kpiMeasurement.create({
    data: {
      tenantId: perma.id,
      caseId: hero.id,
      kpiId: otif.id,
      baseline: 87,
      target: 95,
      current: 92,
      windowDays: 14,
      windowOpenedAt: at(-3),
      inProgress: true,
      measuredAt: at(0),
    },
  });

  await prisma.kpiMeasurement.create({
    data: {
      tenantId: perma.id,
      caseId: variance.id,
      kpiId: inventoryDays.id,
      baseline: 34,
      target: 25,
      // No reading taken yet. Null is the honest value; a number here would be
      // an invented measurement.
      current: null,
      windowDays: 14,
      windowOpenedAt: at(-9),
      inProgress: true,
      measuredAt: at(0),
    },
  });

  await prisma.verification.create({
    data: {
      tenantId: perma.id,
      caseId: pending.id,
      requestedById: arun.id,
      requestedAt: at(-2),
      reviewerId: sunil.id,
      decision: null,
      windowDays: 14,
      notes: "Awaiting review. 4 of 4 actions complete.",
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      { tenantId: perma.id, userId: arun.id, event: "case.assigned", entityType: "Case", entityId: hero.id, field: "ownerId", fromValue: "Unassigned", toValue: "Arun Iyer", source: "Work Manager", occurredAt: at(-3, 5) },
      { tenantId: perma.id, userId: arun.id, event: "action.completed", entityType: "Case", entityId: hero.id, source: "Case detail", occurredAt: at(-3, 8) },
      { tenantId: perma.id, userId: null, event: "case.escalated", entityType: "Case", entityId: hero.id, field: "escalationLevel", fromValue: "0", toValue: "1", source: "Rule engine", occurredAt: at(-2, 5) },
      { tenantId: perma.id, userId: arun.id, event: "verification.requested", entityType: "Case", entityId: pending.id, source: "Case detail", occurredAt: at(-2) },
    ],
  });

  /* -------------------------------------------------- Sika evaluation */

  const sika = await prisma.tenant.create({
    data: {
      id: "sika-evaluation",
      name: "Sika",
      environmentLabel: "Sika Evaluation Environment",
      environmentType: "EVALUATION",
      industry: "Supply Chain / Manufacturing",
      defaultLanguage: "en",
      supportedLanguages: ["en", "es", "pt-BR"],
      currency: "EUR",
      currencyLocale: "de-DE",
      dataDisclosure: "Representative evaluation data — not a live Sika system",
    },
  });

  const site = await prisma.plant.create({
    data: { tenantId: sika.id, code: "EVAL1", name: "Evaluation Site 1", country: "Germany", countryCode: "DE", timezone: "Europe/Berlin" },
  });

  // Synthetic evaluators on example.com. No real identities, no @sika.com.
  const evalOwner = await prisma.user.create({
    data: { tenantId: sika.id, email: "action.owner@example.com", name: "Evaluation Action Owner", jobTitle: "Action Owner", roleKey: "TASK_OWNER", plantScope: ["EVAL1"], language: "en" },
  });
  const evalReviewer = await prisma.user.create({
    data: { tenantId: sika.id, email: "reviewer@example.com", name: "Evaluation Reviewer", jobTitle: "Reviewer", roleKey: "OPS_MANAGER", plantScope: ["EVAL1"], language: "en" },
  });
  await prisma.user.create({
    data: { tenantId: sika.id, email: "executive@example.com", name: "Evaluation Executive", jobTitle: "Executive", roleKey: "EXECUTIVE", plantScope: [], language: "en" },
  });

  const sikaKpi = await prisma.kpiDefinition.create({
    data: { tenantId: sika.id, key: "OTIF_PCT", label: "On-time in full", definition: "Share of confirmed orders delivered on time and complete.", unit: "%", sourceSystem: "Representative source data" },
  });

  const sikaSource = await prisma.caseSource.create({
    data: { tenantId: sika.id, system: "Representative ERP", recordRef: "PO-EVAL-1001", signalRef: "SIG-EVAL-0001", businessRuleId: "RULE-VD-002", businessRuleName: "Vendor confirmed date slip" },
  });

  const sikaCase = await prisma.case.create({
    data: {
      tenantId: sika.id,
      caseNo: "QO-EV-2026-00001",
      title: "Raw material delivery delayed against confirmed date",
      description:
        "Representative evaluation case. A confirmed supplier date moved out, placing customer orders at risk. Illustrative data — not a live Sika record.",
      exceptionType: "VENDOR_DELAY",
      detectedBy: "EVERY_ANGLE",
      status: "PENDING_VERIFY",
      priorityBand: "CRITICAL",
      priorityScore: 78.4,
      escalationLevel: 1,
      plantId: site.id,
      sourceId: sikaSource.id,
      materialCode: "RM-EV-1001",
      customerTier: "TIER_1",
      revenueAtRisk: "48000",
      currency: "EUR",
      ownerId: evalOwner.id,
      reviewerId: evalReviewer.id,
      openedAt: at(-4),
      assignedAt: at(-4, 3),
      dueAt: at(-1),
      slaBreachedAt: at(-1),
      lastDetectedAt: at(-4),
      recurrenceCount: 1,
    },
  });

  await prisma.correctiveAction.create({
    data: { tenantId: sika.id, caseId: sikaCase.id, title: "Confirm the revised date with the supplier", description: "Representative corrective action.", ownerId: evalOwner.id, status: "DONE", completionPct: 100, dueAt: at(-3), completedAt: at(-3, 4) },
  });
  await prisma.evidence.create({
    data: { tenantId: sika.id, caseId: sikaCase.id, fileName: "supplier-confirmation.pdf", fileType: "DOCUMENT", fileSizeBytes: 122880, proves: "Supplier confirmed the revised date in writing.", uploadedById: evalOwner.id, uploadedAt: at(-3, 5), accepted: true },
  });
  await prisma.kpiMeasurement.create({
    data: { tenantId: sika.id, caseId: sikaCase.id, kpiId: sikaKpi.id, baseline: 87, target: 95, current: 92, windowDays: 14, windowOpenedAt: at(-1), inProgress: true, measuredAt: at(0) },
  });
  await prisma.verification.create({
    data: { tenantId: sika.id, caseId: sikaCase.id, requestedById: evalOwner.id, requestedAt: at(-1), reviewerId: evalReviewer.id, decision: null, windowDays: 14, notes: "Awaiting review." },
  });
  await prisma.auditEvent.create({
    data: { tenantId: sika.id, userId: evalOwner.id, event: "verification.requested", entityType: "Case", entityId: sikaCase.id, source: "Case detail", occurredAt: at(-1) },
  });

  const counts = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    plants: await prisma.plant.count(),
    cases: await prisma.case.count(),
    actions: await prisma.correctiveAction.count(),
    evidence: await prisma.evidence.count(),
    measurements: await prisma.kpiMeasurement.count(),
    verifications: await prisma.verification.count(),
    audit: await prisma.auditEvent.count(),
  };
  // The seed is a CLI script, not app code: its result belongs on the console.
  console.warn("seeded:", JSON.stringify(counts));
}

await main();
await prisma.$disconnect();
