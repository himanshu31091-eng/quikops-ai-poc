import { EXCEPTION_META } from "@/src/config/app-config";
import type { ExceptionType, OperationalCase, Plant, User } from "@/src/domain/types";
import { getCaseCorpus, getPeople, getPlants } from "./corpus";
import { reviewerFor } from "../fixtures/case-detail";
import { chooseReviewer } from "./case-detail-db-mapper";
import { resolveMode } from "@/src/ai/services/copilot-service";

/**
 * Administration data access.
 *
 * Routing rules are **derived from how cases are actually owned** rather than
 * declared separately: for each plant and exception type present in the corpus,
 * the default owner is whoever holds most of that work today. A routing table
 * that disagrees with reality is worse than none, and inventing one would
 * repeat the fixture drift D-48 exists to prevent.
 */

export interface RoutingRule {
  id: string;
  plantCode: string;
  plantName: string;
  exceptionType: ExceptionType;
  exceptionLabel: string;
  ownerId: string;
  ownerName: string;
  reviewerName: string;
  /** Cases this rule was inferred from. */
  caseCount: number;
}

export interface AdministrationData {
  users: User[];
  plants: Plant[];
  assignableCount: number;
  routingRules: RoutingRule[];
  /** The raw corpus, for the configuration previews. */
  cases: OperationalCase[];
  /**
   * Whether the Copilot is running against the live API.
   *
   * Resolved here rather than in the component: the key is server-side only,
   * so a client asking this question directly would have to be told, and the
   * settings panel must not be the one screen that guesses.
   */
  isCopilotLive: boolean;
}

export async function getAdministrationData(): Promise<AdministrationData> {
  const all = await getCaseCorpus();
  const plants = await getPlants();
  const users = await getPeople();
  const rules: RoutingRule[] = [];

  for (const plant of plants) {
    const atPlant = all.filter((item) => item.plantCode === plant.code);
    const types = [...new Set(atPlant.map((item) => item.exceptionType))];

    for (const exceptionType of types) {
      const matching = atPlant.filter((item) => item.exceptionType === exceptionType);
      const owned = matching.filter((item) => item.ownerId !== null);
      if (owned.length === 0) continue;

      // The owner holding most of this work is the de-facto routing target.
      const counts = new Map<string, number>();
      for (const item of owned) {
        counts.set(item.ownerId!, (counts.get(item.ownerId!) ?? 0) + 1);
      }
      const [ownerId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
      const owner = users.find((user) => user.id === ownerId);
      if (!owner) continue;

      rules.push({
        id: `rule_${plant.code}_${exceptionType}`,
        plantCode: plant.code,
        plantName: plant.name,
        exceptionType,
        exceptionLabel: EXCEPTION_META[exceptionType].label,
        ownerId,
        ownerName: owner.name,
        // Chosen from the tenant's own people; the fixture router names the
        // demo organisation's managers.
        reviewerName: (chooseReviewer(matching[0]!, users) ?? reviewerFor(matching[0]!)).name,
        caseCount: matching.length,
      });
    }
  }

  return {
    users,
    plants,
    assignableCount: users.length,
    routingRules: rules.sort(
      (a, b) => a.plantName.localeCompare(b.plantName) || b.caseCount - a.caseCount,
    ),
    cases: all,
    isCopilotLive: resolveMode() === "live",
  };
}
