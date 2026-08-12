import { computePriority } from "@/src/domain/priority";
import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import type {
  CaseStatus,
  CustomerTier,
  DetectionSource,
  ExceptionType,
  KpiKey,
  OperationalCase,
} from "@/src/domain/types";
import { DEFAULT_CURRENCY, DEMO_NOW, KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const at = (dayOffset: number, hour = 6, minute = 15): string =>
  new Date(
    DEMO_NOW.getTime() + dayOffset * DAY_MS - DEMO_NOW.getUTCHours() * HOUR_MS +
      hour * HOUR_MS + minute * 60_000 - DEMO_NOW.getUTCMinutes() * 60_000,
  ).toISOString();

/** SLA target resolution hours by band, per the approved sprint plan. */
const SLA_HOURS = SLA_TARGET_HOURS;

/**
 * How long a resolved case actually took, as a fraction of its SLA target.
 *
 * Previously a flat 0.8 for every terminal case, which meant **every resolved
 * case met its target by construction** — SLA adherence computed to exactly
 * 100% no matter how the metric was defined, and no derived figure could ever
 * disagree with it because there was nothing to disagree about.
 *
 * Now derived from the case number so it is stable across every render and
 * rehearsal (the same reason the trend series use a seeded PRNG), and spread
 * either side of 1.0 so a realistic minority overran. Roughly a quarter of the
 * range sits above target.
 */
function resolutionFactor(caseNo: string): number {
  // FNV-1a, then the murmur3 finalizer. The finalizer is the point: case
  // numbers are sequential, so a plain rolling hash produces near-identical
  // values for near-identical inputs and every case in a run lands on the same
  // factor. Without avalanche, five consecutive cases all resolved at 1.07 of
  // target and all five "missed" — a pattern, not a spread.
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < caseNo.length; index += 1) {
    hash = Math.imul(hash ^ caseNo.charCodeAt(index), 16777619) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;

  return 0.42 + ((hash % 1000) / 1000) * 0.76;
}

interface CaseSeed {
  caseNo: string;
  title: string;
  description: string;
  exceptionType: ExceptionType;
  detectedBy: DetectionSource;
  sourceSystem: string;
  sourceRecord: string;
  status: CaseStatus;
  plantCode: string;
  materialCode: string | null;
  materialDesc: string | null;
  customerCode: string | null;
  customerName: string | null;
  customerTier: CustomerTier | null;
  supplierCode: string | null;
  supplierName: string | null;
  revenueAtRisk: number;
  kpiKey: KpiKey;
  baselineValue: number;
  targetValue: number;
  ownerId: string | null;
  openedDayOffset: number;
  daysToPromisedDate: number;
  recurrenceCount: number;
  escalationLevel: number;
  totalActionCount: number;
  openActionCount: number;
  playbookId: string | null;
}

/**
 * The demonstration corpus — eight cases across three plants.
 *
 * Deliberately small. An audience cannot hold fifty cases in their head, and a
 * plant filter is only convincing if the person watching can count the rows
 * before and after. Six open cases and two resolved is the least data that
 * still demonstrates a hero problem, three distinct plant states, ownership,
 * evidence, verification and a trend — and every number on every screen is
 * derived from exactly these eight records.
 *
 * Vapi carries the story: three open, both criticals, the worst position.
 * Roorkee and Hyderabad exist so that switching plants visibly changes the
 * answer rather than merely re-rendering it.
 */
const SEEDS: CaseSeed[] = [
  /* ---------------------------------------------------------- Vapi — hero */

  {
    caseNo: "QO-PA-2026-00421",
    title: "Raw material availability — polymer resin",
    description:
      "Gujarat Petrochem confirmed dispatch of acrylic polymer resin four days behind the promised date against PO-PA-45821, followed by a one-day quality-release hold on the receipt. Waterproofing production sequencing at Vapi is affected and three confirmed customer orders are at risk of missing their delivery windows.",
    exceptionType: "VENDOR_DELAY",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PO-PA-45821",
    status: "IN_PROGRESS",
    plantCode: "VP01",
    materialCode: "RM-PR-3120",
    materialDesc: "Acrylic polymer resin, 45% solids, 220kg drum",
    customerCode: "C-LT-0114",
    customerName: "L&T Construction",
    customerTier: "TIER_1",
    supplierCode: "V-GPL-118",
    supplierName: "Gujarat Petrochem Ltd",
    revenueAtRisk: 4_200_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 87,
    targetValue: 95,
    ownerId: "usr_aiyer",
    openedDayOffset: -3,
    daysToPromisedDate: 4,
    recurrenceCount: 2,
    escalationLevel: 1,
    totalActionCount: 3,
    openActionCount: 1,
    playbookId: "pb_material_shortage",
  },
  {
    caseNo: "QO-PA-2026-00418",
    title: "Packaging material shortage — HDPE pails",
    description:
      "On-hand coverage of 20-litre HDPE pails fell to two days against the Vapi filling schedule after Bharat Packaging deferred a confirmed consignment. Dispatch of tile adhesive and waterproofing packs is exposed.",
    exceptionType: "MATERIAL_SHORTAGE",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PO-PA-45903",
    status: "IN_PROGRESS",
    plantCode: "VP01",
    materialCode: "PK-HD-2000",
    materialDesc: "HDPE pail, 20L, printed, with lid",
    customerCode: "C-SP-0231",
    customerName: "Shapoorji Pallonji",
    customerTier: "TIER_1",
    supplierCode: "V-BPI-204",
    supplierName: "Bharat Packaging Industries",
    revenueAtRisk: 2_850_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 87,
    targetValue: 95,
    ownerId: "usr_aiyer",
    openedDayOffset: -5,
    daysToPromisedDate: 3,
    recurrenceCount: 2,
    escalationLevel: 1,
    totalActionCount: 4,
    openActionCount: 2,
    playbookId: "pb_material_shortage",
  },
  {
    caseNo: "QO-PA-2026-00412",
    title: "Quality hold — SBR latex incoming consignment",
    description:
      "Incoming SBR latex from Deccan Polymers failed solids-content verification on first test. Material is on hold pending retest, blocking two repair-mortar batches scheduled this week.",
    exceptionType: "QUALITY_HOLD",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "Quality Management System",
    sourceRecord: "QC-VP-20418",
    status: "ASSIGNED",
    plantCode: "VP01",
    materialCode: "RM-SB-4410",
    materialDesc: "SBR latex, construction grade, 200kg",
    customerCode: "C-GP-0142",
    customerName: "Godrej Properties",
    customerTier: "TIER_2",
    supplierCode: "V-DPL-231",
    supplierName: "Deccan Polymers Pvt Ltd",
    revenueAtRisk: 1_950_000,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 88,
    targetValue: 95,
    ownerId: "usr_kbhatt",
    openedDayOffset: -2,
    daysToPromisedDate: 6,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 3,
    playbookId: "pb_quality_hold",
  },
  {
    caseNo: "QO-PA-2026-00313",
    title: "Waterproofing resin delay cleared by expedited road freight",
    description:
      "An earlier resin shortfall against the same supplier was closed by expediting a part consignment by road. The affected orders shipped inside their windows and the outcome held over the measurement window.",
    exceptionType: "VENDOR_DELAY",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PO-PA-45402",
    status: "VERIFIED",
    plantCode: "VP01",
    materialCode: "RM-PR-3120",
    materialDesc: "Acrylic polymer resin, 45% solids, 220kg drum",
    customerCode: "C-LT-0114",
    customerName: "L&T Construction",
    customerTier: "TIER_1",
    supplierCode: "V-GPL-118",
    supplierName: "Gujarat Petrochem Ltd",
    revenueAtRisk: 2_240_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 86,
    targetValue: 95,
    ownerId: "usr_aiyer",
    openedDayOffset: -19,
    daysToPromisedDate: 5,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 4,
    openActionCount: 0,
    playbookId: "pb_material_shortage",
  },

  /* -------------------------------------------------------------- Roorkee */

  {
    caseNo: "QO-PA-2026-00400",
    title: "Supplier delivery variance — cement consignments",
    description:
      "Delivered quantities from Shree Minerals have varied from confirmed quantities on five of the last nine consignments, distorting inventory planning for the repair-mortar line at Roorkee.",
    exceptionType: "PLANNING_DEVIATION",
    detectedBy: "PLAYBOOK_MONITOR",
    sourceSystem: "Procurement System",
    sourceRecord: "PO-PA-45610",
    status: "ASSIGNED",
    plantCode: "RK01",
    materialCode: "RM-CM-1010",
    materialDesc: "Ordinary Portland cement, 53 grade, 50kg",
    customerCode: null,
    customerName: null,
    customerTier: null,
    supplierCode: "V-SHM-317",
    supplierName: "Shree Minerals",
    revenueAtRisk: 1_150_000,
    kpiKey: "INVENTORY_DAYS",
    baselineValue: 34,
    targetValue: 25,
    ownerId: "usr_aiyer",
    openedDayOffset: -9,
    daysToPromisedDate: 11,
    recurrenceCount: 2,
    escalationLevel: 0,
    totalActionCount: 2,
    openActionCount: 1,
    playbookId: "pb_vendor_delay",
  },
  {
    caseNo: "QO-PA-2026-00367",
    title: "Stockout risk — epoxy hardener component",
    description:
      "Epoxy hardener coverage is under three days against the repair-chemicals plan at Roorkee, with no confirmed replenishment date from the supplier.",
    exceptionType: "INVENTORY_STOCKOUT",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PO-PA-45688",
    status: "IN_PROGRESS",
    plantCode: "RK01",
    materialCode: "RM-EH-6200",
    materialDesc: "Epoxy hardener, amine based, 30kg",
    customerCode: "C-AH-0311",
    customerName: "Ahluwalia Contracts",
    customerTier: "TIER_3",
    supplierCode: "V-SUN-402",
    supplierName: "Sundaram Chemicals",
    revenueAtRisk: 1_060_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 94,
    targetValue: 95,
    ownerId: "usr_aiyer",
    openedDayOffset: -6,
    daysToPromisedDate: 3,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 2,
    playbookId: "pb_stockout",
  },

  /* ------------------------------------------------------------ Hyderabad */

  {
    caseNo: "QO-PA-2026-00406",
    title: "Quality release delay — admixture batch AD-8842",
    description:
      "Superplasticiser batch AD-8842 has been awaiting final release for three days against a one-day standard. Chloride-content retest is queued behind routine sampling, holding the production schedule.",
    exceptionType: "QUALITY_HOLD",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "Quality Management System",
    sourceRecord: "QC-HY-20655",
    status: "IN_PROGRESS",
    plantCode: "HY01",
    materialCode: "FG-AD-8842",
    materialDesc: "Polycarboxylate superplasticiser, 250L",
    customerCode: "C-NC-0177",
    customerName: "NCC Limited",
    customerTier: "TIER_1",
    supplierCode: null,
    supplierName: null,
    revenueAtRisk: 3_100_000,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 90,
    targetValue: 95,
    ownerId: "usr_kbhatt",
    openedDayOffset: -4,
    daysToPromisedDate: 4,
    recurrenceCount: 1,
    escalationLevel: 1,
    totalActionCount: 3,
    openActionCount: 2,
    playbookId: "pb_quality_hold",
  },
  {
    caseNo: "QO-PA-2026-00292",
    title: "Curing compound release cycle shortened",
    description:
      "The sampling sequence was revised at Hyderabad so release testing runs in parallel with filling. Cycle time held over the measurement window and the case was closed.",
    exceptionType: "QUALITY_HOLD",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "Quality Management System",
    sourceRecord: "QC-HY-20488",
    status: "CLOSED",
    plantCode: "HY01",
    materialCode: "FG-CC-2400",
    materialDesc: "Concrete curing compound, 200L",
    customerCode: null,
    customerName: null,
    customerTier: "TIER_2",
    supplierCode: null,
    supplierName: null,
    revenueAtRisk: 690_000,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 86,
    targetValue: 95,
    ownerId: "usr_kbhatt",
    openedDayOffset: -38,
    daysToPromisedDate: 8,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 0,
    playbookId: "pb_quality_hold",
  },
];

function buildCase(seed: CaseSeed): OperationalCase & {
  openActionCount: number;
  totalActionCount: number;
} {
  const deviation = Math.max(seed.targetValue - seed.baselineValue, 0);
  const priority = computePriority({
    revenueAtRisk: seed.revenueAtRisk,
    kpiDeviationPts: deviation,
    customerTier: seed.customerTier,
    daysToPromisedDate: seed.daysToPromisedDate,
    recurrenceCount: seed.recurrenceCount,
    escalationLevel: seed.escalationLevel,
  });

  const openedAt = at(seed.openedDayOffset);
  // Derived from the same SLA_TARGET_HOURS the domain uses, so the stored
  // `slaBreachedAt` below is a materialised projection of
  // `hasBreachedSla()` rather than an independent assertion. The twelve call
  // sites that read the field therefore cannot drift from the rule: change the
  // targets in `src/domain/sla.ts` and both move together.
  const slaHours = SLA_HOURS[priority.band] ?? 240;
  const dueAt = new Date(new Date(openedAt).getTime() + slaHours * HOUR_MS).toISOString();
  const isBreached = new Date(dueAt).getTime() < DEMO_NOW.getTime();

  const terminal = seed.status === "CLOSED" || seed.status === "VERIFIED";
  const assigned = seed.ownerId !== null;
  const resolutionHours = slaHours * resolutionFactor(seed.caseNo);

  return {
    id: `case_${seed.caseNo.replace(/-/g, "_").toLowerCase()}`,
    caseNo: seed.caseNo,
    title: seed.title,
    description: seed.description,
    exceptionType: seed.exceptionType,
    detectedBy: seed.detectedBy,
    sourceSystem: seed.sourceSystem,
    sourceRecord: seed.sourceRecord,
    status: seed.status,
    priorityBand: priority.band,
    priorityScore: priority.score,
    priorityFactors: priority.factors,
    escalationLevel: seed.escalationLevel,
    plantCode: seed.plantCode,
    materialCode: seed.materialCode,
    materialDesc: seed.materialDesc,
    customerCode: seed.customerCode,
    customerName: seed.customerName,
    customerTier: seed.customerTier,
    supplierCode: seed.supplierCode,
    supplierName: seed.supplierName,
    revenueAtRisk: seed.revenueAtRisk,
    currency: DEFAULT_CURRENCY,
    kpiKey: seed.kpiKey,
    baselineValue: seed.baselineValue,
    targetValue: seed.targetValue,
    measurementWindowDays: KPI_MEASUREMENT_WINDOW_DAYS,
    ownerId: seed.ownerId,
    openedAt,
    assignedAt: assigned
      ? new Date(new Date(openedAt).getTime() + 5 * HOUR_MS).toISOString()
      : null,
    dueAt,
    slaBreachedAt: isBreached && !terminal ? dueAt : null,
    verifiedAt: terminal
      ? new Date(new Date(openedAt).getTime() + resolutionHours * HOUR_MS).toISOString()
      : null,
    // A closed case was verified first, then held open for the measurement
    // window before the outcome was signed off as durable.
    closedAt:
      seed.status === "CLOSED"
        ? new Date(
            new Date(openedAt).getTime() +
              (resolutionHours + KPI_MEASUREMENT_WINDOW_DAYS * 24) * HOUR_MS,
          ).toISOString()
        : null,
    recurrenceCount: seed.recurrenceCount,
    lastDetectedAt: at(seed.openedDayOffset + (seed.recurrenceCount > 1 ? 2 : 0)),
    playbookId: seed.playbookId,
    openActionCount: seed.openActionCount,
    totalActionCount: seed.totalActionCount,
  };
}

export const CASES = SEEDS.map(buildCase);

export const GOLDEN_CASE_NO = "QO-PA-2026-00421";
