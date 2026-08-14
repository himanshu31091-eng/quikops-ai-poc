import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import type { CaseAuditEntry, Plant, User } from "@/src/domain/types";
import { USE_DATABASE } from "../db";
import { CASES } from "../fixtures/cases";
import {
  buildAuditLog,
  buildCorrectiveActions,
  buildEvidence,
  buildTimeline,
  buildVerification,
} from "../fixtures/case-detail";
import { PLANTS, USERS } from "../fixtures/organisation";
import { toCaseListItem } from "./case-mapper";
import { getPeople, getPlants } from "./corpus";
import { findAuditForTenant } from "./portfolio-db-mapper";

/**
 * Global audit log.
 *
 * `buildAuditLog` already produces a complete trail per case; mapping it across
 * every case and concatenating gives the network-wide log — exactly the pattern
 * the Action Center used for `buildCorrectiveActions`.
 *
 * An earlier note called this blocked on persistence. It is not: only
 * *durability* needs a database, and the demo does not need durability.
 */

/** An audit entry with the case context a global view needs. */
export interface AuditEntryRow extends CaseAuditEntry {
  caseNo: string;
  caseTitle: string;
  plantCode: string;
  plantName: string;
}

export interface AuditLogData {
  entries: AuditEntryRow[];
  users: User[];
  plants: Plant[];
  /** Distinct actions present, for the filter menu. */
  actions: string[];
}

export async function getAuditLogData(): Promise<AuditLogData> {
  const entries: AuditEntryRow[] = [];

  // In database mode the trail is not derived — it is read. Every mutation
  // writes its audit row in the same transaction as the change, so these are
  // the events that actually happened rather than a reconstruction of what
  // the case record implies happened.
  if (USE_DATABASE) {
    const [stored, people, plants] = await Promise.all([
      findAuditForTenant(DEFAULT_TENANT_ID),
      getPeople(),
      getPlants(),
    ]);
    return {
      entries: stored,
      users: people,
      plants,
      actions: [...new Set(stored.map((entry) => entry.action))].sort(),
    };
  }

  for (const source of CASES) {
    const item = toCaseListItem(source);
    const actions = buildCorrectiveActions(item);
    const evidence = buildEvidence(item, actions);
    const verification = buildVerification(item, actions);
    const timeline = buildTimeline(item, actions, evidence, verification);

    for (const entry of buildAuditLog(item, timeline, verification)) {
      entries.push({
        ...entry,
        caseNo: item.caseNo,
        caseTitle: item.title,
        plantCode: item.plantCode,
        plantName: item.plant.name,
      });
    }
  }

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    entries,
    users: USERS,
    plants: PLANTS,
    actions: [...new Set(entries.map((entry) => entry.action))].sort(),
  };
}
