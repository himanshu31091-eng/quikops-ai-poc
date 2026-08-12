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
 * Defaults for routine cases, so a record that varies in six fields is written
 * in six fields. Every value below is authored — nothing here is generated.
 */
function routine(
  seed: Pick<
    CaseSeed,
    "caseNo" | "title" | "description" | "exceptionType" | "status" | "plantCode" | "revenueAtRisk" | "openedDayOffset"
  > &
    Partial<CaseSeed>,
): CaseSeed {
  return {
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "—",
    materialCode: null,
    materialDesc: null,
    customerCode: null,
    customerName: null,
    customerTier: "TIER_2",
    supplierCode: null,
    supplierName: null,
    kpiKey: "OTIF_PCT",
    baselineValue: 87,
    targetValue: 95,
    ownerId: null,
    daysToPromisedDate: 4,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 2,
    openActionCount: 1,
    playbookId: null,
    ...seed,
  };
}

const SEEDS: CaseSeed[] = [
  /* ------------------------------------------------------------------ Vapi */

  // The hero case. Everything the demo walks — source, owner, actions,
  // evidence, verification — hangs off this record.
  {
    caseNo: "QO-PA-2026-00421",
    title: "Raw material availability — polymer resin delay",
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
    recurrenceCount: 1,
    escalationLevel: 1,
    totalActionCount: 4,
    openActionCount: 2,
    playbookId: "pb_material_shortage",
  },
  {
    caseNo: "QO-PA-2026-00415",
    title: "Reactor batch cycle overrun — waterproof coating line",
    description:
      "Batch cycle time on reactor R-2 has exceeded standard by 22% across seven consecutive batches, reducing available capacity against the confirmed August plan.",
    exceptionType: "CAPACITY_CONSTRAINT",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PRD-VP-11842",
    status: "IN_PROGRESS",
    plantCode: "VP01",
    materialCode: "FG-WP-1180",
    materialDesc: "Elastomeric waterproof coating, 20L",
    customerCode: "C-TP-0088",
    customerName: "Tata Projects",
    customerTier: "TIER_1",
    supplierCode: null,
    supplierName: null,
    revenueAtRisk: 3_600_000,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 82,
    targetValue: 95,
    ownerId: "usr_vrane",
    openedDayOffset: -6,
    daysToPromisedDate: 5,
    recurrenceCount: 2,
    escalationLevel: 1,
    totalActionCount: 3,
    openActionCount: 2,
    playbookId: "pb_capacity",
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
    recurrenceCount: 2,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 3,
    playbookId: "pb_quality_hold",
  },
  {
    caseNo: "QO-PA-2026-00409",
    title: "Dispatch delay — consolidated load to Mumbai projects",
    description:
      "Three confirmed orders for the Mumbai corridor missed their dispatch slot after the assigned vehicle was released late from the weighbridge. Customer delivery windows are exposed.",
    exceptionType: "DELIVERY_AT_RISK",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "Logistics & Dispatch",
    sourceRecord: "DL-VP-77120",
    status: "TRIAGED",
    plantCode: "VP01",
    materialCode: null,
    materialDesc: null,
    customerCode: "C-RJ-0303",
    customerName: "Rustomjee Group",
    customerTier: "TIER_2",
    supplierCode: null,
    supplierName: null,
    revenueAtRisk: 2_400_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 87,
    targetValue: 95,
    ownerId: null,
    openedDayOffset: -1,
    daysToPromisedDate: 2,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 0,
    openActionCount: 0,
    playbookId: null,
  },

  /* ------------------------------------------------------------- Hyderabad */

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
    baselineValue: 88,
    targetValue: 95,
    ownerId: "usr_kbhatt",
    openedDayOffset: -4,
    daysToPromisedDate: 4,
    recurrenceCount: 2,
    escalationLevel: 1,
    totalActionCount: 3,
    openActionCount: 2,
    playbookId: "pb_quality_hold",
  },
  {
    caseNo: "QO-PA-2026-00403",
    title: "Sulphonated naphthalene shortage against admixture plan",
    description:
      "SNF powder coverage stands at four days against the confirmed admixture build for weeks 34 and 35. Sundaram Chemicals has not confirmed the follow-on consignment.",
    exceptionType: "MATERIAL_SHORTAGE",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PO-PA-45744",
    status: "IN_PROGRESS",
    plantCode: "HY01",
    materialCode: "RM-SN-2205",
    materialDesc: "Sulphonated naphthalene formaldehyde, 25kg bag",
    customerCode: "C-PE-0209",
    customerName: "Prestige Estates",
    customerTier: "TIER_2",
    supplierCode: "V-SUN-402",
    supplierName: "Sundaram Chemicals",
    revenueAtRisk: 2_650_000,
    kpiKey: "OTIF_PCT",
    baselineValue: 91,
    targetValue: 95,
    ownerId: "usr_aiyer",
    openedDayOffset: -7,
    daysToPromisedDate: 4,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 1,
    playbookId: "pb_material_shortage",
  },

  /* --------------------------------------------------------------- Roorkee */

  {
    caseNo: "QO-PA-2026-00400",
    title: "Supplier delivery variance — cement consignments",
    description:
      "Delivered quantities from Shree Minerals have varied from confirmed quantities on five of the last nine consignments, distorting inventory planning for the repair-mortar line.",
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
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 2,
    openActionCount: 1,
    playbookId: "pb_vendor_delay",
  },

  /* --------------------------------------------------------------- Chennai */

  {
    caseNo: "QO-PA-2026-00397",
    title: "Production changeover delay — tile adhesive line",
    description:
      "Changeover between grey and white tile-adhesive grades is running 90 minutes over standard, driven by extended dry-blend cleaning. Throughput against the weekly plan is short by 8%.",
    exceptionType: "CAPACITY_CONSTRAINT",
    detectedBy: "EVERY_ANGLE",
    sourceSystem: "SAP ERP",
    sourceRecord: "PRD-CH-10937",
    status: "IN_PROGRESS",
    plantCode: "CH01",
    materialCode: "FG-TA-6600",
    materialDesc: "Tile adhesive, C2TE grade, 20kg",
    customerCode: "C-BG-0255",
    customerName: "Brigade Group",
    customerTier: "TIER_2",
    supplierCode: null,
    supplierName: null,
    revenueAtRisk: 1_480_000,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 89,
    targetValue: 95,
    ownerId: "usr_vrane",
    openedDayOffset: -8,
    daysToPromisedDate: 7,
    recurrenceCount: 1,
    escalationLevel: 0,
    totalActionCount: 3,
    openActionCount: 1,
    playbookId: "pb_capacity",
  },

  /* --------------------------------------- Open — routine, across the sites */

  routine({
    caseNo: "QO-PA-2026-00394",
    title: "Redispersible polymer powder below reorder level",
    description:
      "RDP stock at Vapi fell below the reorder threshold with six days of coverage against the tile-adhesive plan.",
    exceptionType: "MATERIAL_SHORTAGE",
    status: "ASSIGNED",
    plantCode: "VP01",
    materialCode: "RM-RD-5150",
    materialDesc: "Redispersible polymer powder, 25kg",
    supplierCode: "V-DPL-231",
    supplierName: "Deccan Polymers Pvt Ltd",
    revenueAtRisk: 1_320_000,
    openedDayOffset: -4,
    ownerId: "usr_aiyer",
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00391",
    title: "HPMC viscosity variance on incoming lot",
    description:
      "Hydroxypropyl methylcellulose lot tested 12% below specified viscosity, requiring reformulation of two adhesive batches.",
    exceptionType: "QUALITY_HOLD",
    status: "IN_PROGRESS",
    plantCode: "VP01",
    materialCode: "RM-HP-3380",
    materialDesc: "Hydroxypropyl methylcellulose, 25kg",
    supplierCode: "V-ICA-509",
    supplierName: "Ind-Chem Additives",
    revenueAtRisk: 890_000,
    openedDayOffset: -6,
    ownerId: "usr_kbhatt",
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 88,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00388",
    title: "Silica sand moisture above specification",
    description:
      "Graded silica sand received at Vapi tested above the 0.5% moisture limit, blocking release to the dry-mix line until drying is scheduled.",
    exceptionType: "QUALITY_HOLD",
    status: "TRIAGED",
    plantCode: "VP01",
    materialCode: "RM-SS-1120",
    materialDesc: "Graded silica sand, 40-80 mesh",
    supplierCode: "V-SHM-317",
    supplierName: "Shree Minerals",
    revenueAtRisk: 760_000,
    openedDayOffset: -2,
    totalActionCount: 0,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00385",
    title: "Defoamer consignment short-shipped",
    description:
      "Received quantity of silicone defoamer is 30% short against the confirmed purchase order, with no revised date from the supplier.",
    exceptionType: "VENDOR_DELAY",
    status: "ASSIGNED",
    plantCode: "VP01",
    materialCode: "RM-DF-7710",
    materialDesc: "Silicone defoamer, 50kg",
    supplierCode: "V-ICA-509",
    supplierName: "Ind-Chem Additives",
    revenueAtRisk: 640_000,
    openedDayOffset: -10,
    ownerId: "usr_aiyer",
  }),
  routine({
    caseNo: "QO-PA-2026-00382",
    title: "Finished goods excess — superseded waterproofing grade",
    description:
      "Stock of the superseded WP-900 grade has exceeded 90 days of coverage following the specification change.",
    exceptionType: "INVENTORY_EXCESS",
    status: "TRIAGED",
    plantCode: "VP01",
    materialCode: "FG-WP-0900",
    materialDesc: "Waterproof coating, WP-900, 20L",
    revenueAtRisk: 1_680_000,
    openedDayOffset: -12,
    kpiKey: "INVENTORY_DAYS",
    baselineValue: 92,
    targetValue: 45,
    daysToPromisedDate: 21,
    totalActionCount: 1,
    openActionCount: 1,
  }),
  routine({
    caseNo: "QO-PA-2026-00379",
    title: "Curing compound batch awaiting release",
    description:
      "Concrete curing compound batch is held pending confirmation of the film-formation test.",
    exceptionType: "QUALITY_HOLD",
    status: "ASSIGNED",
    plantCode: "HY01",
    materialCode: "FG-CC-2400",
    materialDesc: "Concrete curing compound, 200L",
    revenueAtRisk: 920_000,
    openedDayOffset: -3,
    ownerId: "usr_kbhatt",
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 88,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00376",
    title: "Admixture dosing pump fault reducing line output",
    description:
      "Dosing pump on the admixture blending line is running below rated flow, extending batch times by 18%.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "IN_PROGRESS",
    plantCode: "HY01",
    revenueAtRisk: 1_240_000,
    openedDayOffset: -5,
    ownerId: "usr_vrane",
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 88,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00373",
    title: "Delivery at risk — Bengaluru project consignment",
    description:
      "A confirmed consignment for a Bengaluru site is tracking two days behind the committed delivery window.",
    exceptionType: "DELIVERY_AT_RISK",
    status: "ASSIGNED",
    plantCode: "HY01",
    customerCode: "C-SO-0288",
    customerName: "Sobha Limited",
    customerTier: "TIER_2",
    revenueAtRisk: 1_540_000,
    openedDayOffset: -2,
    ownerId: "usr_mpillai",
    daysToPromisedDate: 3,
  }),
  routine({
    caseNo: "QO-PA-2026-00370",
    title: "Calcium carbonate supply variance",
    description:
      "Delivered fineness of ground calcium carbonate has drifted outside the agreed band across three consignments.",
    exceptionType: "PLANNING_DEVIATION",
    status: "TRIAGED",
    plantCode: "HY01",
    materialCode: "RM-CC-1180",
    materialDesc: "Ground calcium carbonate, 50kg",
    supplierCode: "V-SHM-317",
    supplierName: "Shree Minerals",
    revenueAtRisk: 480_000,
    openedDayOffset: -11,
    recurrenceCount: 2,
    totalActionCount: 1,
    openActionCount: 1,
  }),
  routine({
    caseNo: "QO-PA-2026-00367",
    title: "Stockout risk — epoxy hardener component",
    description:
      "Epoxy hardener coverage is under three days against the repair-chemicals plan at Roorkee.",
    exceptionType: "INVENTORY_STOCKOUT",
    status: "IN_PROGRESS",
    plantCode: "RK01",
    materialCode: "RM-EH-6200",
    materialDesc: "Epoxy hardener, amine based, 30kg",
    supplierCode: "V-SUN-402",
    supplierName: "Sundaram Chemicals",
    revenueAtRisk: 1_060_000,
    openedDayOffset: -6,
    ownerId: "usr_aiyer",
    daysToPromisedDate: 3,
  }),
  routine({
    caseNo: "QO-PA-2026-00364",
    title: "Woven sack print rejection at incoming inspection",
    description:
      "PP woven sacks were rejected at incoming inspection for print registration outside tolerance, affecting dry-mix packing.",
    exceptionType: "QUALITY_HOLD",
    status: "ASSIGNED",
    plantCode: "RK01",
    materialCode: "PK-PP-3300",
    materialDesc: "PP woven sack, 25kg, printed",
    supplierCode: "V-BPI-204",
    supplierName: "Bharat Packaging Industries",
    revenueAtRisk: 520_000,
    openedDayOffset: -8,
    ownerId: "usr_kbhatt",
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 90,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00361",
    title: "Planning deviation after grade rationalisation",
    description:
      "The MRP plan at Roorkee still reflects two discontinued repair-mortar grades, releasing orders against obsolete specifications.",
    exceptionType: "PLANNING_DEVIATION",
    status: "IN_PROGRESS",
    plantCode: "RK01",
    revenueAtRisk: 700_000,
    openedDayOffset: -13,
    ownerId: "usr_agupta",
    daysToPromisedDate: 14,
  }),
  routine({
    caseNo: "QO-PA-2026-00358",
    title: "Inbound freight delay — Kandla port clearance",
    description:
      "A resin consignment is held in customs clearance at Kandla, extending inbound lead time by four days.",
    exceptionType: "VENDOR_DELAY",
    status: "ASSIGNED",
    plantCode: "RK01",
    materialCode: "RM-PR-3120",
    materialDesc: "Acrylic polymer resin, 45% solids, 220kg drum",
    supplierCode: "V-GPL-118",
    supplierName: "Gujarat Petrochem Ltd",
    revenueAtRisk: 1_380_000,
    openedDayOffset: -5,
    ownerId: "usr_aiyer",
    recurrenceCount: 2,
    daysToPromisedDate: 5,
  }),
  routine({
    caseNo: "QO-PA-2026-00355",
    title: "Tile adhesive dry-mix silo blockage",
    description:
      "Recurring bridging in the Chennai dry-mix silo is interrupting the adhesive packing line.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "IN_PROGRESS",
    plantCode: "CH01",
    revenueAtRisk: 830_000,
    openedDayOffset: -9,
    ownerId: "usr_vrane",
    recurrenceCount: 1,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 90,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00352",
    title: "Delivery window missed — Coimbatore distributor",
    description:
      "A distributor consignment for Coimbatore missed its committed window after a vehicle breakdown in transit.",
    exceptionType: "DELIVERY_AT_RISK",
    status: "ASSIGNED",
    plantCode: "CH01",
    customerCode: "C-AH-0311",
    customerName: "Ahluwalia Contracts",
    customerTier: "TIER_3",
    revenueAtRisk: 610_000,
    openedDayOffset: -3,
    ownerId: "usr_mpillai",
    daysToPromisedDate: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00349",
    title: "Excess stock — monsoon-season waterproofing packs",
    description:
      "Seasonal build of monsoon waterproofing packs has not depleted at the forecast rate, tying up warehouse capacity.",
    exceptionType: "INVENTORY_EXCESS",
    status: "TRIAGED",
    plantCode: "CH01",
    revenueAtRisk: 1_120_000,
    openedDayOffset: -15,
    kpiKey: "INVENTORY_DAYS",
    baselineValue: 71,
    targetValue: 45,
    daysToPromisedDate: 20,
    totalActionCount: 1,
    openActionCount: 1,
  }),
  routine({
    caseNo: "QO-PA-2026-00346",
    title: "Admixture density variance on filling line",
    description:
      "Filled weights on the Chennai admixture line are drifting above tolerance, causing giveaway and rework.",
    exceptionType: "OTHER",
    status: "IN_PROGRESS",
    plantCode: "CH01",
    revenueAtRisk: 390_000,
    openedDayOffset: -7,
    ownerId: "usr_vrane",
    daysToPromisedDate: 12,
  }),
  routine({
    caseNo: "QO-PA-2026-00343",
    title: "Repair mortar order released against short inventory",
    description:
      "A production order was released at Chennai despite insufficient component stock, creating a mid-batch stoppage risk.",
    exceptionType: "PLANNING_DEVIATION",
    status: "ASSIGNED",
    plantCode: "CH01",
    revenueAtRisk: 540_000,
    openedDayOffset: -4,
    ownerId: "usr_agupta",
  }),
  routine({
    caseNo: "QO-PA-2026-00340",
    title: "Grouting compound stockout at Vapi",
    description:
      "Non-shrink grout finished stock reached zero against open distributor demand.",
    exceptionType: "INVENTORY_STOCKOUT",
    status: "IN_PROGRESS",
    plantCode: "VP01",
    materialCode: "FG-GR-4100",
    materialDesc: "Non-shrink cementitious grout, 25kg",
    revenueAtRisk: 1_760_000,
    openedDayOffset: -6,
    ownerId: "usr_vrane",
    daysToPromisedDate: 4,
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00337",
    title: "Manual observation — bagging line dust extraction",
    description:
      "Plant walkthrough recorded reduced dust extraction on the Vapi bagging line, raised for corrective action.",
    exceptionType: "OTHER",
    detectedBy: "MANUAL",
    status: "ASSIGNED",
    plantCode: "VP01",
    revenueAtRisk: 210_000,
    openedDayOffset: -10,
    ownerId: "usr_sjoshi",
    daysToPromisedDate: 18,
  }),
  routine({
    caseNo: "QO-PA-2026-00334",
    title: "Supplier confirmation overdue — mineral filler",
    description:
      "No order acknowledgement has been received against two open purchase orders for mineral filler.",
    exceptionType: "VENDOR_DELAY",
    status: "TRIAGED",
    plantCode: "HY01",
    supplierCode: "V-SHM-317",
    supplierName: "Shree Minerals",
    revenueAtRisk: 430_000,
    openedDayOffset: -2,
    totalActionCount: 0,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00331",
    title: "Reopened — polymer resin quality variance",
    description:
      "Resin solids content drifted out of band again after the earlier corrective action was signed off, so the case was reopened rather than raised fresh.",
    exceptionType: "QUALITY_HOLD",
    status: "REOPENED",
    plantCode: "VP01",
    materialCode: "RM-PR-3120",
    materialDesc: "Acrylic polymer resin, 45% solids, 220kg drum",
    supplierCode: "V-GPL-118",
    supplierName: "Gujarat Petrochem Ltd",
    revenueAtRisk: 1_890_000,
    openedDayOffset: -14,
    ownerId: "usr_kbhatt",
    recurrenceCount: 1,
    escalationLevel: 1,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 88,
    targetValue: 95,
    daysToPromisedDate: 4,
  }),
  routine({
    caseNo: "QO-PA-2026-00328",
    title: "New — anti-corrosion coating raw material enquiry",
    description:
      "A new-grade raw material for anti-corrosion coating has no approved second source, raising single-source exposure.",
    exceptionType: "OTHER",
    detectedBy: "MANUAL",
    status: "NEW",
    plantCode: "RK01",
    revenueAtRisk: 320_000,
    openedDayOffset: -1,
    totalActionCount: 0,
    openActionCount: 0,
    daysToPromisedDate: 25,
  }),
  routine({
    caseNo: "QO-PA-2026-00325",
    title: "New — distributor order pattern shift, western region",
    description:
      "Order frequency from western-region distributors has shifted materially against forecast, flagged for planning review.",
    exceptionType: "PLANNING_DEVIATION",
    detectedBy: "PLAYBOOK_MONITOR",
    status: "NEW",
    plantCode: "VP01",
    revenueAtRisk: 680_000,
    openedDayOffset: -1,
    totalActionCount: 0,
    openActionCount: 0,
    daysToPromisedDate: 16,
  }),
  routine({
    caseNo: "QO-PA-2026-00322",
    title: "Pending verification — admixture line changeover fix",
    description:
      "Changeover standard work was revised and the line has run to plan for four days; awaiting reviewer sign-off.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "PENDING_VERIFY",
    plantCode: "HY01",
    revenueAtRisk: 1_290_000,
    openedDayOffset: -12,
    ownerId: "usr_vrane",
    totalActionCount: 4,
    openActionCount: 0,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 88,
    targetValue: 95,
    daysToPromisedDate: 6,
  }),
  routine({
    caseNo: "QO-PA-2026-00319",
    title: "Pending verification — packaging supplier dual sourcing",
    description:
      "A second approved source for HDPE pails was qualified and first consignment received; awaiting verification of the outcome.",
    exceptionType: "VENDOR_DELAY",
    status: "PENDING_VERIFY",
    plantCode: "VP01",
    supplierCode: "V-BPI-204",
    supplierName: "Bharat Packaging Industries",
    revenueAtRisk: 980_000,
    openedDayOffset: -16,
    ownerId: "usr_aiyer",
    totalActionCount: 3,
    openActionCount: 0,
    recurrenceCount: 2,
    daysToPromisedDate: 8,
  }),
  routine({
    caseNo: "QO-PA-2026-00316",
    title: "Pending verification — cement variance controls",
    description:
      "Goods-receipt weighing controls were tightened at Roorkee; awaiting reviewer confirmation over the measurement window.",
    exceptionType: "PLANNING_DEVIATION",
    status: "PENDING_VERIFY",
    plantCode: "RK01",
    revenueAtRisk: 460_000,
    openedDayOffset: -18,
    ownerId: "usr_agupta",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "INVENTORY_DAYS",
    baselineValue: 31,
    targetValue: 25,
    daysToPromisedDate: 10,
  }),

  /* ------------------------------------------------------- Resolved corpus */

  routine({
    caseNo: "QO-PA-2026-00313",
    title: "Waterproofing resin delay cleared by expedited road freight",
    description:
      "Resin shortfall was closed by expediting a part consignment by road; the affected orders shipped inside their windows.",
    exceptionType: "VENDOR_DELAY",
    status: "VERIFIED",
    plantCode: "VP01",
    supplierCode: "V-GPL-118",
    supplierName: "Gujarat Petrochem Ltd",
    revenueAtRisk: 2_240_000,
    openedDayOffset: -19,
    ownerId: "usr_aiyer",
    totalActionCount: 4,
    openActionCount: 0,
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00310",
    title: "Tile adhesive quality hold released after re-test",
    description:
      "Adhesive batch was released following a confirmatory open-time re-test; no customer impact recorded.",
    exceptionType: "QUALITY_HOLD",
    status: "VERIFIED",
    plantCode: "CH01",
    revenueAtRisk: 870_000,
    openedDayOffset: -21,
    ownerId: "usr_kbhatt",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 87,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00307",
    title: "Admixture stockout cleared by inter-plant transfer",
    description:
      "A stock transfer from Roorkee covered the Hyderabad shortfall while the replenishment order was expedited.",
    exceptionType: "INVENTORY_STOCKOUT",
    status: "VERIFIED",
    plantCode: "HY01",
    revenueAtRisk: 1_430_000,
    openedDayOffset: -20,
    ownerId: "usr_aiyer",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00304",
    title: "Dispatch scheduling corrected after weighbridge queue review",
    description:
      "Slot allocation at the Vapi weighbridge was re-sequenced, restoring on-time dispatch performance.",
    exceptionType: "DELIVERY_AT_RISK",
    status: "VERIFIED",
    plantCode: "VP01",
    revenueAtRisk: 1_670_000,
    openedDayOffset: -22,
    ownerId: "usr_mpillai",
    totalActionCount: 4,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00301",
    title: "Grout capacity shortfall recovered with additional shift",
    description:
      "An additional weekend shift recovered the grout build against the confirmed plan.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "VERIFIED",
    plantCode: "RK01",
    revenueAtRisk: 1_050_000,
    openedDayOffset: -23,
    ownerId: "usr_vrane",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 91,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00298",
    title: "Filler supply variance closed with revised tolerance",
    description:
      "An agreed fineness tolerance was documented with the supplier and confirmed on two subsequent consignments.",
    exceptionType: "PLANNING_DEVIATION",
    status: "CLOSED",
    plantCode: "HY01",
    revenueAtRisk: 380_000,
    openedDayOffset: -34,
    ownerId: "usr_agupta",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00295",
    title: "Packaging shortage closed after dual sourcing",
    description:
      "A second pail supplier was approved and the shortage did not recur across the measurement window.",
    exceptionType: "MATERIAL_SHORTAGE",
    status: "CLOSED",
    plantCode: "VP01",
    revenueAtRisk: 1_240_000,
    openedDayOffset: -36,
    ownerId: "usr_aiyer",
    totalActionCount: 4,
    openActionCount: 0,
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00292",
    title: "Curing compound release cycle shortened",
    description:
      "Sampling sequence was revised so release testing runs in parallel with filling; cycle time held over the window.",
    exceptionType: "QUALITY_HOLD",
    status: "CLOSED",
    plantCode: "HY01",
    revenueAtRisk: 690_000,
    openedDayOffset: -38,
    ownerId: "usr_kbhatt",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 86,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00289",
    title: "Chennai changeover standard work adopted",
    description:
      "Revised changeover standard work was adopted on the adhesive line and held through the measurement window.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "CLOSED",
    plantCode: "CH01",
    revenueAtRisk: 820_000,
    openedDayOffset: -40,
    ownerId: "usr_vrane",
    totalActionCount: 4,
    openActionCount: 0,
    kpiKey: "SCHEDULE_ADHERENCE_PCT",
    baselineValue: 87,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00286",
    title: "Excess seasonal stock cleared to secondary channel",
    description:
      "Surplus monsoon-grade stock was released to the distributor channel at an agreed discount.",
    exceptionType: "INVENTORY_EXCESS",
    status: "CLOSED",
    plantCode: "CH01",
    revenueAtRisk: 950_000,
    openedDayOffset: -42,
    ownerId: "usr_mpillai",
    totalActionCount: 2,
    openActionCount: 0,
    kpiKey: "INVENTORY_DAYS",
    baselineValue: 78,
    targetValue: 45,
  }),
  routine({
    caseNo: "QO-PA-2026-00283",
    title: "Roorkee inbound clearance delay resolved",
    description:
      "Documentation was corrected with the clearing agent and inbound lead time returned to standard.",
    exceptionType: "VENDOR_DELAY",
    status: "VERIFIED",
    plantCode: "RK01",
    revenueAtRisk: 740_000,
    openedDayOffset: -24,
    ownerId: "usr_aiyer",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00280",
    title: "Hyderabad dispatch backlog cleared",
    description:
      "A backlog of confirmed dispatches was cleared over two days with additional vehicle capacity.",
    exceptionType: "DELIVERY_AT_RISK",
    status: "VERIFIED",
    plantCode: "HY01",
    revenueAtRisk: 1_310_000,
    openedDayOffset: -25,
    ownerId: "usr_mpillai",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00277",
    title: "Vapi resin second source qualified",
    description:
      "An alternate resin source was qualified and first supply accepted, reducing single-source exposure.",
    exceptionType: "MATERIAL_SHORTAGE",
    status: "VERIFIED",
    plantCode: "VP01",
    revenueAtRisk: 1_580_000,
    openedDayOffset: -26,
    ownerId: "usr_aiyer",
    totalActionCount: 4,
    openActionCount: 0,
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00274",
    title: "Sack print specification agreed with supplier",
    description:
      "Print registration tolerance was agreed and confirmed across two subsequent deliveries.",
    exceptionType: "QUALITY_HOLD",
    status: "VERIFIED",
    plantCode: "RK01",
    revenueAtRisk: 410_000,
    openedDayOffset: -27,
    ownerId: "usr_kbhatt",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 89,
    targetValue: 95,
  }),
  routine({
    caseNo: "QO-PA-2026-00271",
    title: "Chennai stockout prevented by reorder point revision",
    description:
      "Reorder points were recalculated against revised lead times and no stockout occurred over the window.",
    exceptionType: "INVENTORY_STOCKOUT",
    status: "VERIFIED",
    plantCode: "CH01",
    revenueAtRisk: 660_000,
    openedDayOffset: -28,
    ownerId: "usr_agupta",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00268",
    title: "Admixture giveaway reduced on filling line",
    description:
      "Filling-head calibration was corrected and filled weights returned inside tolerance.",
    exceptionType: "OTHER",
    status: "VERIFIED",
    plantCode: "CH01",
    revenueAtRisk: 290_000,
    openedDayOffset: -29,
    ownerId: "usr_vrane",
    totalActionCount: 2,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00265",
    title: "Vapi silo bridging addressed with aeration change",
    description:
      "Aeration settings were revised on the dry-mix silo and the blockage did not recur during the window.",
    exceptionType: "CAPACITY_CONSTRAINT",
    status: "VERIFIED",
    plantCode: "VP01",
    revenueAtRisk: 780_000,
    openedDayOffset: -30,
    ownerId: "usr_vrane",
    totalActionCount: 3,
    openActionCount: 0,
    recurrenceCount: 2,
  }),
  routine({
    caseNo: "QO-PA-2026-00262",
    title: "Hyderabad planning deviation corrected at source",
    description:
      "Master data for two discontinued grades was corrected, ending erroneous order release.",
    exceptionType: "PLANNING_DEVIATION",
    status: "VERIFIED",
    plantCode: "HY01",
    revenueAtRisk: 350_000,
    openedDayOffset: -31,
    ownerId: "usr_agupta",
    totalActionCount: 2,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00259",
    title: "Roorkee epoxy hardener supply stabilised",
    description:
      "A scheduling agreement was put in place with the hardener supplier and deliveries held to plan.",
    exceptionType: "VENDOR_DELAY",
    status: "VERIFIED",
    plantCode: "RK01",
    revenueAtRisk: 890_000,
    openedDayOffset: -32,
    ownerId: "usr_aiyer",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00256",
    title: "Vapi dust extraction corrective work completed",
    description:
      "Extraction ducting was cleaned and re-balanced on the bagging line following the plant observation.",
    exceptionType: "OTHER",
    detectedBy: "MANUAL",
    status: "CLOSED",
    plantCode: "VP01",
    revenueAtRisk: 180_000,
    openedDayOffset: -44,
    ownerId: "usr_sjoshi",
    totalActionCount: 2,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00253",
    title: "Distributor forecast alignment completed",
    description:
      "Forecast collaboration was re-established with western-region distributors and variance narrowed.",
    exceptionType: "PLANNING_DEVIATION",
    status: "CLOSED",
    plantCode: "VP01",
    revenueAtRisk: 520_000,
    openedDayOffset: -46,
    ownerId: "usr_agupta",
    totalActionCount: 3,
    openActionCount: 0,
  }),
  routine({
    caseNo: "QO-PA-2026-00250",
    title: "Hyderabad quality retest queue reduced",
    description:
      "A priority lane for release testing was introduced and the retest queue cleared.",
    exceptionType: "QUALITY_HOLD",
    status: "CLOSED",
    plantCode: "HY01",
    revenueAtRisk: 610_000,
    openedDayOffset: -48,
    ownerId: "usr_kbhatt",
    totalActionCount: 3,
    openActionCount: 0,
    kpiKey: "SUPPLIER_OTD_PCT",
    baselineValue: 86,
    targetValue: 95,
  }),
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
