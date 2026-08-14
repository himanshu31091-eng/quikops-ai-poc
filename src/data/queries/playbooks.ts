import { EXCEPTION_META } from "@/src/config/app-config";
import {
  scorePlaybookEffectiveness,
  type PlaybookEffectiveness,
} from "@/src/domain/playbook-effectiveness";
import type { CaseListItem, ExceptionType } from "@/src/domain/types";
import { EXCEPTION_TYPES } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { getCaseCorpus } from "./corpus";
import { PLAYBOOK_LIBRARY, type PlaybookStep } from "../fixtures/playbooks";

/**
 * Playbook library data access.
 *
 * Steps come from the same catalogue `buildCorrectiveActions` uses to generate
 * plans, so what the library shows is what a case actually gets. Effectiveness
 * is scored from the cases that ran each playbook.
 */

export interface PlaybookView {
  id: string;
  name: string;
  exceptionType: ExceptionType;
  exceptionLabel: string;
  icon: string;
  description: string;
  version: string;
  updatedAt: string;
  steps: PlaybookStep[];
  effectiveness: PlaybookEffectiveness;
  /** Cases currently running this playbook, newest first. */
  activeCases: CaseListItem[];
  appliedCases: CaseListItem[];
}

export interface PlaybookLibraryData {
  playbooks: PlaybookView[];
  /** Exception types with cases but no playbook — the coverage gap. */
  uncovered: { exceptionType: ExceptionType; label: string; caseCount: number }[];
}

export async function getPlaybookLibraryData(): Promise<PlaybookLibraryData> {
  const all = await getCaseCorpus();

  const playbooks: PlaybookView[] = PLAYBOOK_LIBRARY.map((playbook) => {
    const applied = all.filter((item) => item.playbookId === playbook.id);
    return {
      id: playbook.id,
      name: playbook.name,
      exceptionType: playbook.exceptionType,
      exceptionLabel: EXCEPTION_META[playbook.exceptionType].label,
      icon: EXCEPTION_META[playbook.exceptionType].icon,
      description: playbook.description,
      version: playbook.version,
      updatedAt: playbook.updatedAt,
      steps: playbook.steps,
      effectiveness: scorePlaybookEffectiveness(applied, DEMO_NOW),
      activeCases: applied.filter(
        (item) => item.status !== "CLOSED" && item.status !== "VERIFIED",
      ),
      appliedCases: applied,
    };
  }).sort((a, b) => b.effectiveness.sampleSize - a.effectiveness.sampleSize);

  const covered = new Set(PLAYBOOK_LIBRARY.map((playbook) => playbook.exceptionType));

  return {
    playbooks,
    uncovered: EXCEPTION_TYPES.filter((type) => !covered.has(type))
      .map((type) => ({
        exceptionType: type,
        label: EXCEPTION_META[type].label,
        caseCount: all.filter((item) => item.exceptionType === type).length,
      }))
      .filter((entry) => entry.caseCount > 0)
      .sort((a, b) => b.caseCount - a.caseCount),
  };
}
