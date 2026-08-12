import { ALL_PLANTS, scopeCases, type PlantScope } from "@/src/scope/plant-scope";
import type {
  CaseListItem,
  Plant,
  TrendPoint,
  User,
} from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import { reviewerFor } from "../fixtures/case-detail";
import {
  OTIF_SERIES_90D,
  REVENUE_AT_RISK_SERIES_90D,
  SLA_BREACH_SERIES_90D,
} from "../fixtures/metrics";
import { PLANTS, USERS } from "../fixtures/organisation";
import { toCaseListItem } from "./case-mapper";

/**
 * Execution Analytics data access.
 *
 * Returns the raw working set plus the stored trend series. Every aggregate the
 * module shows is derived on the client, for the same reason the Work Manager
 * derives its own: the filters are interactive, so a filter change must cost one
 * memoised pass rather than a server round trip — and every card, chart, table
 * and heatmap then reads the same array and cannot disagree with the others.
 *
 * Same contract as every other query module: async, finished view model,
 * fixture read swappable for a real query without touching a caller.
 */

/** The reviewer assigned to a case, resolved once here rather than per render. */
export interface CaseReviewerLink {
  caseNo: string;
  reviewerId: string;
}

export interface AnalyticsData {
  cases: CaseListItem[];
  plants: Plant[];
  /** Everyone who can appear in an owner or reviewer table. */
  people: User[];
  reviewers: CaseReviewerLink[];
  /** Stored 90-day series. Trends the cases cannot produce on their own. */
  otifSeries: TrendPoint[];
  revenueAtRiskSeries: TrendPoint[];
  slaBreachSeries: TrendPoint[];
}

export async function getAnalyticsData(scope: PlantScope = ALL_PLANTS): Promise<AnalyticsData> {
  const cases = scopeCases(CASES, scope).map(toCaseListItem);

  return {
    cases,
    plants: PLANTS,
    people: USERS.filter((user) => user.isActive),
    // Resolved server-side because `reviewerFor` is a fixture concern; the
    // module only needs the mapping, not the rule behind it.
    reviewers: cases.map((item) => ({
      caseNo: item.caseNo,
      reviewerId: reviewerFor(item).id,
    })),
    otifSeries: OTIF_SERIES_90D,
    revenueAtRiskSeries: REVENUE_AT_RISK_SERIES_90D,
    slaBreachSeries: SLA_BREACH_SERIES_90D,
  };
}
