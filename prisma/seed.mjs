import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Evaluation seed — additive, idempotent, and safe against a live environment.
 *
 * This script runs against a database a client is already using. That single
 * fact determines everything about how it is written:
 *
 * **It never deletes.** There is no `deleteMany`, no truncate, no reset. An
 * earlier version opened with `tenant.deleteMany({})`, which cascades to every
 * case, action, evidence row and audit entry in the system. Against an
 * evaluation environment that is not a reseed, it is data loss.
 *
 * **It never overwrites transactional data.** Cases, actions, evidence,
 * measurements, verifications, audit events and comments are created if
 * missing and otherwise left exactly as they are — because a client may have
 * edited them, and this script cannot tell an edit from the original. Only
 * reference data (tenants, roles, permissions, plants, people, KPI
 * definitions, case sources) is updated on a re-run, because that is
 * configuration rather than work.
 *
 * **It knows which rows are its own.** Every row this seed creates carries a
 * stable `seedKey`. A row with a null `seedKey` was created by a person, and
 * nothing here will touch it. Rows written by the earlier seed predate the
 * column, so on the first run each is matched once on its business key and
 * adopted — its `seedKey` is stamped on and nothing else about it changes.
 *
 * Consequently: running this twice produces the same database. The second run
 * creates nothing.
 *
 * ```bash
 * node prisma/seed.mjs --dry-run   # report what would change, write nothing
 * node prisma/seed.mjs             # apply
 * ```
 *
 * `--dry-run` executes the real code path inside a transaction and rolls it
 * back, so the report is what would actually happen rather than a second
 * implementation that might disagree with the first.
 *
 * Dates derive from DEMO_NOW, never from the wall clock, so the relative dates
 * the UI computes ("2d ago") stay correct against the frozen demo instant and
 * a re-run cannot produce different values.
 */
const DEMO_NOW = new Date("2026-08-15T09:12:00Z");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const at = (days, hours = 0) => new Date(DEMO_NOW.getTime() + days * DAY + hours * HOUR);

const DRY_RUN = process.argv.includes("--dry-run");
/** Rewrites seed-owned rows in place. Never touches a row with no seedKey. */
const REFRESH_SEEDED = process.argv.includes("--refresh-seeded");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* ------------------------------------------------------------------ Tally */

/** What the run did, per model, so the console report is auditable. */
const tally = { created: {}, adopted: {}, refreshed: {}, updated: {}, unchanged: {} };
const note = (bucket, label) => {
  tally[bucket][label] = (tally[bucket][label] ?? 0) + 1;
};

/**
 * Reference data: configuration the portal reads but never lets a client edit.
 * Safe to update on a re-run, so a corrected label or plant scope propagates.
 */
async function ensureRef(delegate, label, where, data) {
  const existing = await delegate.findUnique({ where });
  if (existing) {
    const updated = await delegate.update({ where, data });
    note("updated", label);
    return updated;
  }
  // A compound unique reads as `{ tenantId_email: { tenantId, email } }` in a
  // `where` and as plain columns in a `create`, so the identity is flattened
  // one level before it becomes row data.
  const identity = Object.fromEntries(
    Object.entries(where).flatMap(([key, value]) =>
      value !== null && typeof value === "object" ? Object.entries(value) : [[key, value]],
    ),
  );
  const created = await delegate.create({ data: { ...identity, ...data } });
  note("created", label);
  return created;
}

/**
 * Transactional data: work a client may have taken over. Created once, then
 * never written again by this script.
 *
 * `adoptWhere` matches a row the previous seed created before `seedKey`
 * existed. It is deliberately restricted to rows whose `seedKey` is still
 * null — a row that already carries a different key belongs to another
 * scenario, and a row created through the portal must never be captured by a
 * business-key coincidence.
 */
async function ensureRow(delegate, label, { tenantId, seedKey, adoptWhere, data }) {
  const own = await delegate.findFirst({ where: { tenantId, seedKey } });
  if (own) {
    /* `--refresh-seeded` rewrites the demo corpus in place, and is the one
     * mode that touches a row it did not just create. It exists because the
     * seeded scenario itself sometimes has to change — a tenant being
     * re-pointed at a different client, a case portfolio being rewritten —
     * and creating a second copy beside the first would leave the queue
     * showing both.
     *
     * It is still incapable of touching client work: the `where` carries the
     * `seedKey`, and a row a person created has none. Run it before handing an
     * environment over, never after. */
    if (REFRESH_SEEDED) {
      const refreshed = await delegate.update({ where: { id: own.id }, data });
      note("refreshed", label);
      return refreshed;
    }
    note("unchanged", label);
    return own;
  }

  if (adoptWhere) {
    const legacy = await delegate.findFirst({ where: { ...adoptWhere, tenantId, seedKey: null } });
    if (legacy) {
      const adopted = await delegate.update({ where: { id: legacy.id }, data: { seedKey } });
      note("adopted", label);
      return adopted;
    }
  }

  const created = await delegate.create({ data: { ...data, tenantId, seedKey } });
  note("created", label);
  return created;
}

/* -------------------------------------------------------- Access reference */

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

/**
 * Perma personas, mirroring `src/data/fixtures/organisation.ts` by
 * `personaKey` rather than by email.
 *
 * The fixture addresses sit on the company's real domain; these are
 * `example.com`, which RFC 2606 reserves for exactly this purpose. The two
 * sets are joined by the persona key, so the seed can carry honest synthetic
 * addresses without breaking the identity mapping.
 */
const PERMA_PEOPLE = [
  ["usr_rmenon", "rajesh.menon@example.com", "Rajesh Menon", "Supply Chain Head", "EXECUTIVE", []],
  ["usr_ndeshpande", "neha.deshpande@example.com", "Neha Deshpande", "Head of Operations", "OPS_MANAGER", []],
  ["usr_sjoshi", "sunil.joshi@example.com", "Sunil Joshi", "Plant Operations Manager — Vapi", "OPS_MANAGER", ["VP01"]],
  ["usr_aiyer", "arun.iyer@example.com", "Arun Iyer", "Procurement Manager", "TASK_OWNER", ["VP01", "RK01"]],
  ["usr_kbhatt", "kavita.bhatt@example.com", "Kavita Bhatt", "Quality Manager", "TASK_OWNER", ["VP01", "HY01"]],
  ["usr_vrane", "vikram.rane@example.com", "Vikram Rane", "Production Manager — Vapi", "TASK_OWNER", ["VP01"]],
  ["usr_mpillai", "meera.pillai@example.com", "Meera Pillai", "Logistics Lead", "TASK_OWNER", ["HY01"]],
  ["usr_agupta", "ananya.gupta@example.com", "Ananya Gupta", "Supply Chain Analyst", "ANALYST", []],
  ["usr_pnair", "prakash.nair@example.com", "Prakash Nair", "Platform Administrator", "ADMINISTRATOR", []],
];
/**
 * The Sika evaluation team.
 *
 * Named people with the job titles this work actually sits with, because an
 * evaluator judging a segregation-of-duties rule needs to see a plant manager
 * hand a case to a regional quality manager — not "Reviewer" handing it to
 * "Approver". The names are invented and every address is `example.com`, which
 * RFC 2606 reserves for exactly this; no real Sika employee appears anywhere.
 */
const SIKA_PEOPLE = [
  ["usr_sk_exec", "martina.keller@example.com", "Martina Keller", "Regional Supply Chain Director", "EXECUTIVE", []],
  ["usr_sk_ops", "andreas.brandt@example.com", "Andreas Brandt", "Head of Operations — EMEA", "OPS_MANAGER", []],
  ["usr_sk_quality", "beatriz.almeida@example.com", "Beatriz Almeida", "Regional Quality Manager", "OPS_MANAGER", []],
  ["usr_sk_owner_de", "jonas.richter@example.com", "Jonas Richter", "Plant Operations Manager — Leimen", "TASK_OWNER", ["SK-DE1"]],
  ["usr_sk_owner_es", "carla.ferrer@example.com", "Carla Ferrer", "Production Manager — Tarragona", "TASK_OWNER", ["SK-ES1"]],
  ["usr_sk_owner_pt", "rui.marques@example.com", "Rui Marques", "Plant Operations Manager — Gaia", "TASK_OWNER", ["SK-PT1"]],
  ["usr_sk_owner_fr", "elodie.bernard@example.com", "Élodie Bernard", "Procurement Manager — Lyon", "TASK_OWNER", ["SK-FR1"]],
  ["usr_sk_owner_it", "marco.ferretti@example.com", "Marco Ferretti", "Production Manager — Milano", "TASK_OWNER", ["SK-IT1"]],
  ["usr_sk_analyst", "sofia.lindqvist@example.com", "Sofia Lindqvist", "Supply Chain Analyst", "ANALYST", []],
  ["usr_sk_admin", "daniel.vogt@example.com", "Daniel Vogt", "Platform Administrator", "ADMINISTRATOR", []],
];

/**
 * Five European sites, in the countries the evaluation covers.
 *
 * Tarragona and Gaia are in Spanish- and Portuguese-speaking countries, which
 * is what makes the language switch demonstrable against data rather than
 * against navigation alone. These are evaluation sites carrying a plausible
 * location, not a claim about any particular factory.
 */
const SIKA_PLANTS = [
  ["SK-DE1", "Leimen", "Germany", "DE", "Europe/Berlin"],
  ["SK-ES1", "Tarragona", "Spain", "ES", "Europe/Madrid"],
  ["SK-PT1", "Vila Nova de Gaia", "Portugal", "PT", "Europe/Lisbon"],
  ["SK-FR1", "Lyon", "France", "FR", "Europe/Paris"],
  ["SK-IT1", "Milano", "Italy", "IT", "Europe/Rome"],
];

const SIKA_KPIS = [
  ["OTIF_PCT", "On-time in full", "Share of confirmed orders delivered on time and complete.", "%"],
  ["INVENTORY_DAYS", "Inventory days of cover", "Days of forward demand covered by on-hand stock against the coverage policy.", "days"],
  ["SUPPLIER_OTD_PCT", "Supplier on-time delivery", "Share of supplier consignments received on the confirmed date.", "%"],
  ["SCHEDULE_ADHERENCE_PCT", "Schedule adherence", "Share of production orders completed in the planned sequence and window.", "%"],
  ["FORECAST_ACCURACY_PCT", "Forecast accuracy", "Agreement between forecast and actual demand over the planning horizon.", "%"],
];

/**
 * The Sika evaluation portfolio.
 *
 * Fourteen cases across five sites, written in the vocabulary of construction
 * chemicals: admixtures, sealants, epoxies, membranes, tile adhesives, repair
 * mortars and the raw materials behind them. Product families are Sika's own
 * published ranges; customers and suppliers are invented, and every case says
 * in its description what the record is.
 *
 * The spread is deliberate. Five plants, four priority bands, eight exception
 * types, seven statuses, three detection sources, assigned and unassigned work,
 * breached and healthy SLAs — so an evaluator filtering the queue finds every
 * facet populated, and finds something different behind each one.
 */
const SIKA_CASES = [
  {
    key: "sika-case-00001",
    caseNo: "QO-SK-2026-00101",
    title: "ViscoCrete polymer delayed against confirmed ready-mix schedule",
    description:
      "A confirmed consignment of PCE polymer for Sika ViscoCrete admixture moved out by four days, against a ready-mix schedule carrying three infrastructure contracts. Representative evaluation data — not a live Sika record.",
    exceptionType: "VENDOR_DELAY",
    detectedBy: "EVERY_ANGLE",
    status: "PENDING_VERIFY",
    priorityBand: "CRITICAL",
    priorityScore: 84.6,
    escalationLevel: 1,
    plant: "SK-DE1",
    materialCode: "RM-PCE-4210",
    materialDesc: "PCE superplasticiser polymer, 40% solids, 1000L IBC",
    customerCode: "C-NBI-0210",
    customerName: "Nordbau Infrastruktur",
    customerTier: "TIER_1",
    supplierCode: "V-RPC-402",
    supplierName: "Rheinpolymer Chemie",
    revenueAtRisk: "96500",
    owner: "usr_sk_owner_de",
    reviewer: "usr_sk_quality",
    openedDays: -4,
    dueDays: -1,
    breached: true,
    recurrenceCount: 2,
    source: ["SAP ECC", "PO-SK-4471023", "SIG-2026-08-11-DE-00101", "RULE-VD-002", "Vendor confirmed date slip"],
    kpi: ["SUPPLIER_OTD_PCT", 82, 94, 88, -3],
    verification: { requestedDays: -1, notes: "Awaiting review. 3 of 3 actions complete and evidenced." },
    actions: [
      ["Confirm the revised dispatch date in writing", "Obtain written confirmation of the revised date and quantity from the supplier.", "DONE", 100, -3, -3],
      ["Release buffer stock against the ready-mix schedule", "Cover the first two pours from the Leimen buffer while the consignment is in transit.", "DONE", 100, -3, -2],
      ["Re-sequence the batching plan around the confirmed arrival", "Protect the two Tier 1 infrastructure contracts first.", "DONE", 100, -2, -1],
    ],
    evidence: [
      ["supplier-revised-dispatch-confirmation.pdf", "DOCUMENT", 184320, "Rheinpolymer confirmed the revised dispatch date and quantity in writing.", -3, false],
      ["leimen-buffer-release-note.pdf", "DOCUMENT", 96256, "Buffer stock released against the first two scheduled pours.", -2, false],
      ["revised-batching-plan-wk33.xlsx", "SPREADSHEET", 88104, "Batching plan re-sequenced to protect the Tier 1 contracts.", -1, false],
    ],
    comments: [
      ["usr_sk_owner_de", "Buffer covers us to Thursday. If the consignment slips again we lose the Nordbau pour, so I have asked for daily transit confirmation.", -2],
      ["usr_sk_ops", "Agreed. Protect Nordbau first — everything else can move.", -2, 5],
    ],
    audit: [
      ["case.assigned", "usr_sk_ops", "Work Manager", -4, "ownerId", "Unassigned", "Jonas Richter"],
      ["action.completed", "usr_sk_owner_de", "Case detail", -3],
      ["case.escalated", null, "Rule engine", -3, "escalationLevel", "0", "1"],
      ["verification.requested", "usr_sk_owner_de", "Case detail", -1],
    ],
  },
  {
    key: "sika-case-00002",
    caseNo: "QO-SK-2026-00102",
    title: "Sikaflex sealant batch held on skin-over time",
    description:
      "Incoming quality control held a polyurethane sealant batch after skin-over time fell outside the release window. Two façade contracts draw on the same batch. Representative evaluation data — not a live Sika record.",
    exceptionType: "QUALITY_HOLD",
    detectedBy: "EVERY_ANGLE",
    status: "IN_PROGRESS",
    priorityBand: "HIGH",
    priorityScore: 74.2,
    plant: "SK-ES1",
    materialCode: "FG-SFX-1180",
    materialDesc: "Sikaflex polyurethane sealant, 600ml sausage",
    customerCode: "C-IOC-0619",
    customerName: "Iberia Obras Civiles",
    customerTier: "TIER_1",
    supplierCode: "V-CTL-118",
    supplierName: "Catalonia Polymers",
    revenueAtRisk: "62400",
    owner: "usr_sk_owner_es",
    reviewer: "usr_sk_quality",
    openedDays: -6,
    dueDays: 0,
    recurrenceCount: 1,
    source: ["Quality Management System", "LOT-SK-ES-88412", "SIG-2026-08-09-ES-00102", "RULE-QH-004", "Release specification breach"],
    kpi: ["OTIF_PCT", 86, 95, 89, -5],
    actions: [
      ["Re-test the retained sample against the release window", "Repeat the skin-over determination on the retained sample.", "DONE", 100, -5, -5],
      ["Agree a concession or a replacement batch with the supplier", "Either a written concession with justification, or replacement on the original date.", "IN_PROGRESS", 45, 0, null],
      ["Confirm the façade contract dates can still be met", "Written confirmation to both contract managers once the batch position is known.", "TODO", 0, 1, null],
    ],
    evidence: [
      ["retest-certificate-ES-88412.pdf", "DOCUMENT", 143360, "Re-test confirmed skin-over time outside the release window on the retained sample.", -5, false],
    ],
    comments: [
      ["usr_sk_owner_es", "Re-test matches the original reading, so this is the batch rather than the measurement. Replacement requested from Catalonia Polymers.", -5],
      ["usr_sk_quality", "Do not release under concession without my sign-off — this batch is going onto a Tier 1 façade.", -4],
    ],
    audit: [
      ["case.assigned", "usr_sk_ops", "Work Manager", -6, "ownerId", "Unassigned", "Carla Ferrer"],
      ["action.completed", "usr_sk_owner_es", "Case detail", -5],
    ],
  },
  {
    key: "sika-case-00003",
    caseNo: "QO-SK-2026-00103",
    title: "Sikadur epoxy hardener short against industrial flooring orders",
    description:
      "Coverage of amine hardener for the Sikadur epoxy range fell below policy after a confirmed quantity was cut on receipt. Two industrial flooring orders are exposed. Representative evaluation data — not a live Sika record.",
    exceptionType: "MATERIAL_SHORTAGE",
    detectedBy: "EVERY_ANGLE",
    status: "IN_PROGRESS",
    priorityBand: "HIGH",
    priorityScore: 71.8,
    plant: "SK-PT1",
    materialCode: "RM-EPX-1140",
    materialDesc: "Epoxy hardener, amine-based, 200kg drum",
    customerCode: "C-ATC-0338",
    customerName: "Atlântico Construções",
    customerTier: "TIER_2",
    supplierCode: "V-AUR-116",
    supplierName: "Aurelia Resins",
    revenueAtRisk: "54800",
    owner: "usr_sk_owner_pt",
    reviewer: "usr_sk_ops",
    openedDays: -3,
    dueDays: 1,
    recurrenceCount: 2,
    source: ["SAP ECC", "PO-SK-4470884", "SIG-2026-08-12-PT-00103", "RULE-MS-001", "Coverage below policy minimum"],
    kpi: ["INVENTORY_DAYS", 7, 21, 11, -3],
    actions: [
      ["Confirm the short-shipped quantity with the supplier", "Establish what was actually dispatched against the confirmed order.", "DONE", 100, -3, -2],
      ["Qualify the alternate hardener grade for this formulation", "Confirm the alternate grade meets the specification and the lead time.", "IN_PROGRESS", 60, 1, null],
    ],
    evidence: [
      ["goods-receipt-discrepancy-PT-4470884.pdf", "DOCUMENT", 106496, "Goods receipt shows the delivered quantity against the confirmed order.", -2, false],
    ],
    comments: [
      ["usr_sk_analyst", "Second short shipment from Aurelia this quarter. Worth raising at the supplier review rather than absorbing it again.", -2],
    ],
    audit: [["case.assigned", "usr_sk_ops", "Work Manager", -3, "ownerId", "Unassigned", "Rui Marques"]],
  },
  {
    key: "sika-case-00004",
    caseNo: "QO-SK-2026-00104",
    title: "Sikalastic membrane consignment at risk against tunnel contract",
    description:
      "A liquid-applied membrane consignment for a tunnel waterproofing contract is tracking two days behind the site's required date. Representative evaluation data — not a live Sika record.",
    exceptionType: "DELIVERY_AT_RISK",
    detectedBy: "EVERY_ANGLE",
    status: "ASSIGNED",
    priorityBand: "HIGH",
    priorityScore: 68.9,
    plant: "SK-FR1",
    materialCode: "FG-SLC-4410",
    materialDesc: "Sikalastic liquid-applied membrane, 20kg pail",
    customerCode: "C-RBT-0451",
    customerName: "Rhône Bâtiment",
    customerTier: "TIER_1",
    revenueAtRisk: "58200",
    owner: "usr_sk_owner_fr",
    reviewer: "usr_sk_ops",
    openedDays: -2,
    dueDays: 2,
    recurrenceCount: 1,
    kpi: ["OTIF_PCT", 88, 95, null, -2],
    actions: [
      ["Price the expedite against the site's required date", "Establish whether the booked mode can still meet the date, and what an expedite costs.", "TODO", 0, 1, null],
    ],
    audit: [["case.assigned", "usr_sk_ops", "Work Manager", -2, "ownerId", "Unassigned", "Élodie Bernard"]],
  },
  {
    key: "sika-case-00005",
    caseNo: "QO-SK-2026-00105",
    title: "Cellulose ether stockout against SikaCeram demand",
    description:
      "On-hand cellulose ether fell below the coverage policy while tile adhesive demand ran ahead of forecast at Tarragona. Representative evaluation data — not a live Sika record.",
    exceptionType: "INVENTORY_STOCKOUT",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "ASSIGNED",
    priorityBand: "HIGH",
    priorityScore: 66.3,
    plant: "SK-ES1",
    materialCode: "RM-CEL-3050",
    materialDesc: "Cellulose ether, methyl hydroxyethyl, 25kg bag",
    supplierCode: "V-PON-233",
    supplierName: "Ponte Additives",
    customerTier: "TIER_2",
    revenueAtRisk: "41200",
    owner: "usr_sk_owner_es",
    openedDays: -4,
    dueDays: 1,
    recurrenceCount: 3,
    kpi: ["INVENTORY_DAYS", 6, 21, 9, -4],
    actions: [
      ["Place the replenishment against the revised demand profile", "Order to the corrected coverage target rather than the standing quantity.", "IN_PROGRESS", 70, 0, null],
      ["Reset the reorder point for the corrected demand", "Recalculate the trigger so the coverage gap does not reopen inside the lead time.", "TODO", 0, 3, null],
    ],
    comments: [
      ["usr_sk_analyst", "Third occurrence on this material in a quarter. The reorder point is the fix; the replenishment is only the patch.", -3],
    ],
    audit: [["case.assigned", "usr_sk_ops", "Work Manager", -4, "ownerId", "Unassigned", "Carla Ferrer"]],
  },
  {
    key: "sika-case-00006",
    caseNo: "QO-SK-2026-00106",
    title: "Tile adhesive line capacity short of the confirmed order book",
    description:
      "Available line hours at Milano fall short of confirmed SikaCeram orders in the current window. Representative evaluation data — not a live Sika record.",
    exceptionType: "CAPACITY_CONSTRAINT",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "TRIAGED",
    priorityBand: "MEDIUM",
    priorityScore: 52.7,
    plant: "SK-IT1",
    materialCode: "FG-SCR-5120",
    materialDesc: "SikaCeram cementitious tile adhesive, C2TE, 25kg bag",
    customerCode: "C-LCT-0512",
    customerName: "Lombardia Costruzioni",
    customerTier: "TIER_2",
    revenueAtRisk: "38600",
    reviewer: "usr_sk_ops",
    openedDays: -2,
    dueDays: 3,
    recurrenceCount: 1,
    kpi: ["SCHEDULE_ADHERENCE_PCT", 91, 97, null, -2],
  },
  {
    key: "sika-case-00007",
    caseNo: "QO-SK-2026-00107",
    title: "Silicone base polymer quantities varying from confirmed",
    description:
      "Delivered quantities varied from confirmed quantities on four of the last eleven silicone base consignments into Leimen. Representative evaluation data — not a live Sika record.",
    exceptionType: "PLANNING_DEVIATION",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "ASSIGNED",
    priorityBand: "MEDIUM",
    priorityScore: 47.1,
    plant: "SK-DE1",
    materialCode: "RM-SIL-2710",
    materialDesc: "Silicone sealant base polymer, 190kg drum",
    supplierCode: "V-NOR-508",
    supplierName: "Norska Minerals",
    customerTier: "TIER_3",
    revenueAtRisk: "27900",
    owner: "usr_sk_owner_de",
    openedDays: -8,
    dueDays: 2,
    recurrenceCount: 2,
    kpi: ["SUPPLIER_OTD_PCT", 79, 92, 83, -8],
    actions: [
      ["Reconcile the last eleven consignments against confirmations", "Establish whether the variance is systematic or a measurement difference.", "IN_PROGRESS", 40, 1, null],
    ],
    audit: [["case.assigned", "usr_sk_ops", "Work Manager", -8, "ownerId", "Unassigned", "Jonas Richter"]],
  },
  {
    key: "sika-case-00008",
    caseNo: "QO-SK-2026-00108",
    title: "Graded quartz delayed against SikaGrout production plan",
    description:
      "Graded quartz aggregate confirmed four days late against the SikaGrout production plan at Gaia. Representative evaluation data — not a live Sika record.",
    exceptionType: "VENDOR_DELAY",
    detectedBy: "EVERY_ANGLE",
    status: "IN_PROGRESS",
    priorityBand: "MEDIUM",
    priorityScore: 44.8,
    plant: "SK-PT1",
    materialCode: "RM-QTZ-1820",
    materialDesc: "Graded quartz aggregate, 0.1–0.3mm, 1000kg bulk bag",
    supplierCode: "V-NOR-508",
    supplierName: "Norska Minerals",
    customerTier: "TIER_3",
    revenueAtRisk: "23400",
    owner: "usr_sk_owner_pt",
    openedDays: -5,
    dueDays: 1,
    recurrenceCount: 1,
    kpi: ["SUPPLIER_OTD_PCT", 81, 92, 85, -5],
    actions: [
      ["Confirm the revised dispatch date in writing", "Written confirmation of the revised date and quantity.", "DONE", 100, -4, -4],
      ["Move the grout batch to the confirmed arrival", "Re-plan the batch rather than hold the line idle.", "IN_PROGRESS", 50, 0, null],
    ],
    evidence: [
      ["quartz-dispatch-confirmation-PT.pdf", "DOCUMENT", 98304, "Norska Minerals confirmed the revised dispatch date in writing.", -4, false],
    ],
  },
  {
    key: "sika-case-00009",
    caseNo: "QO-SK-2026-00109",
    title: "Curing compound cover well above policy at Lyon",
    description:
      "Days of cover for curing compound stand at more than three times the coverage policy, tying up working capital and shelf life. Representative evaluation data — not a live Sika record.",
    exceptionType: "INVENTORY_EXCESS",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "TRIAGED",
    priorityBand: "LOW",
    priorityScore: 22.4,
    plant: "SK-FR1",
    materialCode: "FG-CUR-6300",
    materialDesc: "Concrete curing compound, wax emulsion, 200L drum",
    customerTier: "TIER_3",
    revenueAtRisk: "12800",
    openedDays: -11,
    dueDays: 4,
    recurrenceCount: 1,
    kpi: ["INVENTORY_DAYS", 71, 30, 68, -11],
  },
  {
    key: "sika-case-00010",
    caseNo: "QO-SK-2026-00110",
    title: "Titanium dioxide short against Sikagard coating schedule",
    description:
      "Pigment coverage fell below the coatings schedule requirement after a confirmed quantity was cut on receipt. Unassigned pending triage. Representative evaluation data — not a live Sika record.",
    exceptionType: "MATERIAL_SHORTAGE",
    detectedBy: "EVERY_ANGLE",
    status: "NEW",
    priorityBand: "MEDIUM",
    priorityScore: 49.6,
    plant: "SK-IT1",
    materialCode: "RM-TIO-4200",
    materialDesc: "Titanium dioxide pigment, rutile grade, 25kg bag",
    supplierCode: "V-KAS-711",
    supplierName: "Kastell Speciality Chemicals",
    customerTier: "TIER_2",
    revenueAtRisk: "31500",
    openedDays: -1,
    dueDays: 3,
    recurrenceCount: 1,
    kpi: ["OTIF_PCT", 88, 95, null, -1],
  },
  {
    key: "sika-case-00011",
    caseNo: "QO-SK-2026-00111",
    title: "SikaGrout batch re-worked on flow value and released",
    description:
      "A structural grout batch was held on flow value, re-worked against the release specification and independently verified before dispatch. Representative evaluation data — not a live Sika record.",
    exceptionType: "QUALITY_HOLD",
    detectedBy: "EVERY_ANGLE",
    status: "VERIFIED",
    priorityBand: "HIGH",
    priorityScore: 69.2,
    plant: "SK-DE1",
    materialCode: "FG-GRT-7710",
    materialDesc: "SikaGrout non-shrink structural grout, 25kg bag",
    customerCode: "C-NBI-0210",
    customerName: "Nordbau Infrastruktur",
    customerTier: "TIER_1",
    revenueAtRisk: "44000",
    owner: "usr_sk_owner_de",
    reviewer: "usr_sk_quality",
    openedDays: -14,
    dueDays: -9,
    verifiedDays: -8,
    closedDays: -8,
    recurrenceCount: 1,
    kpi: ["OTIF_PCT", 86, 94, 95, -12, false],
    verification: {
      requestedDays: -9,
      decision: "APPROVED",
      decidedDays: -8,
      comment: "Re-worked batch meets the release specification and the customer date held.",
      notes: "4 of 4 actions complete and evidenced.",
    },
    actions: [
      ["Re-work the batch against the release specification", "Adjust and re-test until the flow value sits inside the window.", "DONE", 100, -13, -12],
      ["Re-test and document the released batch", "Full release testing with the certificate retained.", "DONE", 100, -12, -11],
      ["Confirm the customer date can still be met", "Written confirmation to the customer of the delivery date.", "DONE", 100, -11, -10],
      ["Record the root cause against the mix design", "Close the loop so the same deviation is caught at batching.", "DONE", 100, -10, -9],
    ],
    evidence: [
      ["sikagrout-release-certificate-DE.pdf", "DOCUMENT", 176128, "Re-worked batch passed full release testing.", -11, true],
      ["nordbau-date-confirmation.pdf", "DOCUMENT", 81920, "Nordbau confirmed the delivery date was held.", -10, true],
    ],
    comments: [
      ["usr_sk_quality", "Root cause sits with the mix design tolerance, not the batching. I have logged it against the specification review.", -9],
    ],
    audit: [
      ["case.assigned", "usr_sk_ops", "Work Manager", -14, "ownerId", "Unassigned", "Jonas Richter"],
      ["verification.requested", "usr_sk_owner_de", "Case detail", -9],
      ["verification.decided", "usr_sk_quality", "Case detail", -8, "decision", "Pending", "Approved"],
    ],
  },
  {
    key: "sika-case-00012",
    caseNo: "QO-SK-2026-00112",
    title: "MonoTop repair mortar at risk against motorway contract",
    description:
      "A repair mortar consignment for a motorway maintenance contract is tracking behind the confirmed date. All corrective actions are complete and evidenced; submitted for independent verification. Representative evaluation data — not a live Sika record.",
    exceptionType: "DELIVERY_AT_RISK",
    detectedBy: "EVERY_ANGLE",
    status: "PENDING_VERIFY",
    priorityBand: "HIGH",
    priorityScore: 65.8,
    plant: "SK-ES1",
    materialCode: "FG-MTP-5540",
    materialDesc: "Sika MonoTop concrete repair mortar, R4 class, 25kg bag",
    customerCode: "C-IOC-0619",
    customerName: "Iberia Obras Civiles",
    customerTier: "TIER_1",
    revenueAtRisk: "39700",
    owner: "usr_sk_owner_es",
    reviewer: "usr_sk_quality",
    openedDays: -7,
    dueDays: -3,
    breached: true,
    recurrenceCount: 1,
    kpi: ["OTIF_PCT", 85, 95, 91, -3],
    verification: { requestedDays: -3, notes: "Awaiting review. 3 of 3 actions complete." },
    actions: [
      ["Expedite the consignment to the contract date", "Book the faster mode and confirm the revised arrival.", "DONE", 100, -6, -5],
      ["Confirm the revised arrival with the contract manager", "Written confirmation that the revised date is acceptable on site.", "DONE", 100, -5, -4],
      ["Re-check the remaining consignments on that route", "Protect the rest of the week's schedule against the same cause.", "DONE", 100, -4, -3],
    ],
    evidence: [
      ["expedite-booking-ES-4471190.pdf", "DOCUMENT", 106496, "Expedited freight booked against the contract date.", -5, false],
      ["site-acceptance-revised-date.pdf", "DOCUMENT", 73728, "Contract manager accepted the revised arrival in writing.", -4, false],
    ],
    comments: [
      ["usr_sk_owner_es", "Site accepted the revised arrival, so the contract date holds. Submitting for verification.", -3],
    ],
    audit: [
      ["case.assigned", "usr_sk_ops", "Work Manager", -7, "ownerId", "Unassigned", "Carla Ferrer"],
      ["verification.requested", "usr_sk_owner_es", "Case detail", -3],
    ],
  },
  {
    key: "sika-case-00013",
    caseNo: "QO-SK-2026-00113",
    title: "Pail supply variance closed without customer impact",
    description:
      "Packaging pail deliveries varied from confirmed quantities across three consignments at Gaia. Resolved with the supplier and closed without customer impact. Representative evaluation data — not a live Sika record.",
    exceptionType: "PLANNING_DEVIATION",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "CLOSED",
    priorityBand: "LOW",
    priorityScore: 19.7,
    plant: "SK-PT1",
    materialCode: "PK-PAI-2010",
    materialDesc: "Packaging pail, 20 litre, HDPE",
    supplierCode: "V-KAS-711",
    supplierName: "Kastell Speciality Chemicals",
    customerTier: "TIER_3",
    revenueAtRisk: "9900",
    owner: "usr_sk_owner_pt",
    openedDays: -21,
    dueDays: -16,
    closedDays: -15,
    recurrenceCount: 1,
    kpi: ["SUPPLIER_OTD_PCT", 84, 92, 93, -19, false],
    actions: [
      ["Agree the tolerance and the count method with the supplier", "Written agreement on the tolerance and how quantities are counted on receipt.", "DONE", 100, -18, -16],
    ],
    evidence: [
      ["pail-tolerance-agreement-PT.pdf", "DOCUMENT", 65536, "Tolerance and count method agreed in writing with Kastell.", -16, true],
    ],
  },
  {
    key: "sika-case-00014",
    caseNo: "QO-SK-2026-00114",
    title: "Sikaflex filling line down on mixer fault, unassigned",
    description:
      "The Sikaflex filling line stopped on a mixer fault with confirmed orders in the window. Detected and unassigned — this is what the queue looks like before anybody has picked the work up. Representative evaluation data — not a live Sika record.",
    exceptionType: "CAPACITY_CONSTRAINT",
    detectedBy: "MANUAL",
    status: "NEW",
    priorityBand: "CRITICAL",
    priorityScore: 79.9,
    plant: "SK-FR1",
    materialCode: "FG-SFX-8820",
    materialDesc: "Sikaflex polyurethane sealant, 600ml sausage",
    customerCode: "C-RBT-0451",
    customerName: "Rhône Bâtiment",
    customerTier: "TIER_1",
    revenueAtRisk: "88300",
    openedDays: 0,
    dueDays: 2,
    recurrenceCount: 1,
    kpi: ["SCHEDULE_ADHERENCE_PCT", 93, 97, null, 0],
  },
];

/* ------------------------------------------------------------------- Perma */

/** The POC's existing demo corpus, unchanged. Keys adopt the rows already
 *  in the database rather than creating second copies of them. */
const PERMA_CASES = [
  {
    key: "perma-case-00421",
    caseNo: "QO-PA-2026-00421",
    actions: [
      "Expedite the next polymer resin shipment",
      "Reserve a priority QC testing slot for the incoming resin",
      "Re-sequence production to protect priority customer orders",
    ],
    evidence: [
      "supplier-confirmation-45821.pdf",
      "qc-inspection-record.pdf",
      "revised-production-schedule.xlsx",
    ],
    kpiKey: "OTIF_PCT",
    audit: [
      ["case.assigned", -3, 5],
      ["action.completed", -3, 8],
      ["case.escalated", -2, 5],
    ],
  },
  {
    key: "perma-case-00418",
    caseNo: "QO-PA-2026-00418",
    actions: [
      "Confirm alternate supplier lead time in writing",
      "Re-sequence the build to protect confirmed orders",
      "Raise the expedite and confirm freight mode",
      "Reset the reorder point against the current demand profile",
    ],
    evidence: [
      "alternate-supplier-confirmation.pdf",
      "revised-build-sequence.xlsx",
      "expedite-request-45903.pdf",
      "reorder-point-review.xlsx",
    ],
    kpiKey: "OTIF_PCT",
    verification: true,
    audit: [["verification.requested", -2, 0]],
  },
  {
    key: "perma-case-00400",
    caseNo: "QO-PA-2026-00400",
    actions: [],
    evidence: [],
    kpiKey: "INVENTORY_DAYS",
    audit: [],
  },
];

/* -------------------------------------------------------------------- Seed */

async function seedAccessReference(db) {
  for (const p of PERMISSIONS) {
    await ensureRef(db.permission, "permission", { key: p.key }, { label: p.label });
  }
  for (const r of ROLES) {
    await ensureRef(db.role, "role", { key: r.key }, { label: r.label, description: r.description });
  }
}

async function seedPeople(db, tenantId, people, plantCodes) {
  const byPersona = {};
  for (const [personaKey, email, name, jobTitle, roleKey, scope] of people) {
    const user = await ensureRef(
      db.user,
      "user",
      { tenantId_email: { tenantId, email } },
      {
        name,
        jobTitle,
        roleKey,
        personaKey,
        // An empty scope means the whole tenant; anything else is validated
        // against the sites that exist, so a typo cannot silently hide a
        // person's work from them.
        plantScope: scope.filter((code) => plantCodes.includes(code)),
        language: "en",
      },
    );
    byPersona[personaKey] = user;
  }
  return byPersona;
}

/** Cases and everything hanging off them, for the evaluation tenant. */
async function seedSikaCases(db, tenantId, ctx) {
  for (const spec of SIKA_CASES) {
    const plant = ctx.plants[spec.plant];

    const source = spec.source
      ? await ensureRow(db.caseSource, "caseSource", {
          tenantId,
          seedKey: `${spec.key}-source`,
          adoptWhere: { recordRef: spec.source[1] },
          data: {
            system: spec.source[0],
            recordRef: spec.source[1],
            signalRef: spec.source[2],
            businessRuleId: spec.source[3],
            businessRuleName: spec.source[4],
          },
        })
      : null;

    const owner = spec.owner ? ctx.people[spec.owner] : null;
    const reviewer = spec.reviewer ? ctx.people[spec.reviewer] : null;

    const record = await ensureRow(db.case, "case", {
      tenantId,
      seedKey: spec.key,
      adoptWhere: { caseNo: spec.caseNo },
      data: {
        caseNo: spec.caseNo,
        title: spec.title,
        description: spec.description,
        exceptionType: spec.exceptionType,
        detectedBy: spec.detectedBy,
        status: spec.status,
        priorityBand: spec.priorityBand,
        priorityScore: spec.priorityScore,
        escalationLevel: spec.escalationLevel ?? 0,
        plantId: plant.id,
        sourceId: source?.id ?? null,
        materialCode: spec.materialCode ?? null,
        materialDesc: spec.materialDesc ?? null,
        customerCode: spec.customerCode ?? null,
        customerName: spec.customerName ?? null,
        customerTier: spec.customerTier ?? null,
        supplierCode: spec.supplierCode ?? null,
        supplierName: spec.supplierName ?? null,
        revenueAtRisk: spec.revenueAtRisk,
        currency: "EUR",
        ownerId: owner?.id ?? null,
        reviewerId: reviewer?.id ?? null,
        openedAt: at(spec.openedDays),
        assignedAt: owner ? at(spec.openedDays, 3) : null,
        dueAt: at(spec.dueDays),
        slaBreachedAt: spec.breached ? at(spec.dueDays) : null,
        verifiedAt: spec.verifiedDays === undefined ? null : at(spec.verifiedDays),
        closedAt: spec.closedDays === undefined ? null : at(spec.closedDays),
        lastDetectedAt: at(spec.openedDays),
        recurrenceCount: spec.recurrenceCount,
      },
    });

    const actionRows = [];
    for (const [index, action] of (spec.actions ?? []).entries()) {
      const [title, description, status, pct, dueDays, completedDays] = action;
      actionRows.push(
        await ensureRow(db.correctiveAction, "correctiveAction", {
          tenantId,
          seedKey: `${spec.key}-action-${index + 1}`,
          adoptWhere: { caseId: record.id, title },
          data: {
            caseId: record.id,
            title,
            description,
            // An action needs an owner even where the case does not have one
            // yet; the site owner is who would carry it.
            ownerId: (owner ?? ctx.people.usr_sk_ops).id,
            status,
            completionPct: pct,
            sequence: index,
            dueAt: at(dueDays),
            completedAt: completedDays === null ? null : at(completedDays, 6),
            acceptanceCriteria: "Written confirmation retained and attached as evidence.",
          },
        }),
      );
    }

    for (const [index, file] of (spec.evidence ?? []).entries()) {
      const [fileName, fileType, fileSizeBytes, proves, uploadedDays, accepted] = file;
      await ensureRow(db.evidence, "evidence", {
        tenantId,
        seedKey: `${spec.key}-evidence-${index + 1}`,
        adoptWhere: { caseId: record.id, fileName },
        data: {
          caseId: record.id,
          // Evidence proves an action where there is one to point at.
          actionId: actionRows[index]?.id ?? null,
          fileName,
          fileType,
          fileSizeBytes,
          proves,
          uploadedById: (owner ?? ctx.people.usr_sk_ops).id,
          uploadedAt: at(uploadedDays, 7),
          accepted,
        },
      });
    }

    if (spec.kpi) {
      const [kpiKey, baseline, target, current, openedDays, inProgress] = spec.kpi;
      const kpi = ctx.kpis[kpiKey];
      await ensureRow(db.kpiMeasurement, "kpiMeasurement", {
        tenantId,
        seedKey: `${spec.key}-kpi`,
        adoptWhere: { caseId: record.id, kpiId: kpi.id },
        data: {
          caseId: record.id,
          kpiId: kpi.id,
          baseline,
          target,
          current,
          windowDays: 14,
          windowOpenedAt: at(openedDays),
          inProgress: inProgress ?? true,
          measuredAt: at(0),
        },
      });
    }

    if (spec.verification) {
      const v = spec.verification;
      await ensureRow(db.verification, "verification", {
        tenantId,
        seedKey: `${spec.key}-verification`,
        adoptWhere: { caseId: record.id },
        data: {
          caseId: record.id,
          requestedById: (owner ?? ctx.people.usr_sk_owner_de).id,
          requestedAt: at(v.requestedDays),
          reviewerId: (reviewer ?? ctx.people.usr_sk_quality).id,
          decision: v.decision ?? null,
          decidedAt: v.decidedDays === undefined ? null : at(v.decidedDays),
          comment: v.comment ?? null,
          notes: v.notes,
          windowDays: 14,
        },
      });
    }

    for (const [index, comment] of (spec.comments ?? []).entries()) {
      const [persona, body, days, hours] = comment;
      await ensureRow(db.comment, "comment", {
        tenantId,
        seedKey: `${spec.key}-comment-${index + 1}`,
        adoptWhere: { caseId: record.id, body },
        data: {
          caseId: record.id,
          authorId: ctx.people[persona].id,
          body,
          createdAt: at(days, hours ?? 2),
        },
      });
    }

    for (const [index, event] of (spec.audit ?? []).entries()) {
      const [name, persona, source_, days, field, fromValue, toValue] = event;
      await ensureRow(db.auditEvent, "auditEvent", {
        tenantId,
        seedKey: `${spec.key}-audit-${index + 1}`,
        adoptWhere: { entityId: record.id, event: name, occurredAt: at(days) },
        data: {
          userId: persona ? ctx.people[persona].id : null,
          event: name,
          entityType: "Case",
          entityId: record.id,
          field: field ?? null,
          fromValue: fromValue ?? null,
          toValue: toValue ?? null,
          source: source_,
          occurredAt: at(days),
        },
      });
    }
  }
}

/**
 * The Perma demo corpus already exists in the database. Nothing here creates
 * it: this pass finds each row on its business key and stamps the `seedKey`
 * on, so a later run can recognise its own work. Rows a client added to these
 * cases are left alone, because they match no key here.
 */
async function adoptPermaCorpus(db, tenantId) {
  for (const spec of PERMA_CASES) {
    const record = await db.case.findFirst({ where: { tenantId, caseNo: spec.caseNo } });
    if (!record) continue;
    if (!record.seedKey) {
      await db.case.update({ where: { id: record.id }, data: { seedKey: spec.key } });
      note("adopted", "case");
    } else {
      note("unchanged", "case");
    }

    for (const [index, title] of spec.actions.entries()) {
      await adopt(db.correctiveAction, "correctiveAction", { tenantId, caseId: record.id, title }, `${spec.key}-action-${index + 1}`);
    }
    for (const [index, fileName] of spec.evidence.entries()) {
      await adopt(db.evidence, "evidence", { tenantId, caseId: record.id, fileName }, `${spec.key}-evidence-${index + 1}`);
    }
    await adopt(db.kpiMeasurement, "kpiMeasurement", { tenantId, caseId: record.id }, `${spec.key}-kpi`);
    if (spec.verification) {
      await adopt(db.verification, "verification", { tenantId, caseId: record.id }, `${spec.key}-verification`);
    }
    for (const [index, [event, days, hours]] of spec.audit.entries()) {
      await adopt(
        db.auditEvent,
        "auditEvent",
        { tenantId, entityId: record.id, event, occurredAt: at(days, hours) },
        `${spec.key}-audit-${index + 1}`,
      );
    }
  }

  // The one audit row the Perma corpus raises against a case rather than a
  // person: an escalation the rule engine wrote.
  const permaSource = await db.caseSource.findFirst({ where: { tenantId, recordRef: "PO-PA-45821" } });
  if (permaSource && !permaSource.seedKey) {
    await db.caseSource.update({ where: { id: permaSource.id }, data: { seedKey: "perma-case-00421-source" } });
    note("adopted", "caseSource");
  }
}

/** Stamp a seedKey onto a row the previous seed created, once. */
async function adopt(delegate, label, where, seedKey) {
  const row = await delegate.findFirst({ where: { ...where, seedKey: null } });
  if (!row) {
    note("unchanged", label);
    return;
  }
  await delegate.update({ where: { id: row.id }, data: { seedKey } });
  note("adopted", label);
}

async function run(db) {
  await seedAccessReference(db);

  /* ------------------------------------------------------- Perma demo */

  const perma = await ensureRef(
    db.tenant,
    "tenant",
    { id: "perma-demo" },
    {
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
  );

  const permaPlants = [
    ["VP01", "Vapi", "India", "IN", "Asia/Kolkata"],
    ["RK01", "Roorkee", "India", "IN", "Asia/Kolkata"],
    ["HY01", "Hyderabad", "India", "IN", "Asia/Kolkata"],
  ];
  for (const [code, name, country, countryCode, timezone] of permaPlants) {
    await ensureRef(
      db.plant,
      "plant",
      { tenantId_code: { tenantId: perma.id, code } },
      { name, country, countryCode, timezone },
    );
  }

  await seedPeople(db, perma.id, PERMA_PEOPLE, ["VP01", "RK01", "HY01"]);

  for (const [key, label, definition, unit] of [
    ["OTIF_PCT", "On-time in full", "Share of confirmed orders delivered on time and complete. Measured by the enterprise data platform; QuikOps reads it and never recomputes it.", "%"],
    ["INVENTORY_DAYS", "Inventory days of cover", "Days of forward demand covered by on-hand stock. Measured by the enterprise data platform against the material's coverage policy.", "days"],
  ]) {
    await ensureRef(
      db.kpiDefinition,
      "kpiDefinition",
      { tenantId_key: { tenantId: perma.id, key } },
      { label, definition, unit, sourceSystem: "Enterprise Data Platform" },
    );
  }

  await adoptPermaCorpus(db, perma.id);

  /* -------------------------------------------------- Sika evaluation */

  const sika = await ensureRef(
    db.tenant,
    "tenant",
    { id: "sika-evaluation" },
    {
      name: "Sika",
      environmentLabel: "Sika Evaluation Environment",
      environmentType: "EVALUATION",
      industry: "Construction Chemicals",
      defaultLanguage: "en",
      supportedLanguages: ["en", "es", "pt-BR"],
      currency: "EUR",
      currencyLocale: "de-DE",
      dataDisclosure: "Representative evaluation data — not a live Sika system",
    },
  );

  const plants = {};
  for (const [code, name, country, countryCode, timezone] of SIKA_PLANTS) {
    plants[code] = await ensureRef(
      db.plant,
      "plant",
      { tenantId_code: { tenantId: sika.id, code } },
      { name, country, countryCode, timezone },
    );
  }

  const people = await seedPeople(db, sika.id, SIKA_PEOPLE, Object.keys(plants));

  const kpis = {};
  for (const [key, label, definition, unit] of SIKA_KPIS) {
    kpis[key] = await ensureRef(
      db.kpiDefinition,
      "kpiDefinition",
      { tenantId_key: { tenantId: sika.id, key } },
      { label, definition, unit, sourceSystem: "Representative source data" },
    );
  }

  await seedSikaCases(db, sika.id, { plants, people, kpis });
}

/* ----------------------------------------------------------------- Report */

function report(counts) {
  const line = (bucket) => {
    const entries = Object.entries(tally[bucket]);
    if (entries.length === 0) return `  ${bucket.padEnd(10)} —`;
    return `  ${bucket.padEnd(10)} ${entries.map(([k, v]) => `${k} ${v}`).join(", ")}`;
  };
  // A seed is a CLI script, not app code: its result belongs on the console.
  console.warn(DRY_RUN ? "\nDRY RUN — nothing was written\n" : "\nApplied\n");
  console.warn(line("created"));
  console.warn(line("refreshed"));
  console.warn(line("adopted"));
  console.warn(line("updated"));
  console.warn(line("unchanged"));
  console.warn("\n  totals after this run:", JSON.stringify(counts), "\n");
}

async function totals(db) {
  return {
    tenants: await db.tenant.count(),
    users: await db.user.count(),
    plants: await db.plant.count(),
    cases: await db.case.count(),
    actions: await db.correctiveAction.count(),
    evidence: await db.evidence.count(),
    measurements: await db.kpiMeasurement.count(),
    verifications: await db.verification.count(),
    comments: await db.comment.count(),
    audit: await db.auditEvent.count(),
    clientCreatedCases: await db.case.count({ where: { seedKey: null } }),
  };
}

/** Thrown to roll a dry run back. Not an error: the rollback is the point. */
class DryRunComplete extends Error {}

if (DRY_RUN) {
  try {
    await prisma.$transaction(
      async (tx) => {
        await run(tx);
        const counts = await totals(tx);
        report(counts);
        throw new DryRunComplete();
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } catch (error) {
    if (!(error instanceof DryRunComplete)) throw error;
  }
} else {
  await run(prisma);
  report(await totals(prisma));
}

await prisma.$disconnect();
