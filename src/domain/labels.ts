import {
  ACTION_STATUS_META,
  CASE_STATUS_META,
  DETECTION_SOURCE_META,
  EXCEPTION_META,
  PRIORITY_META,
  ROLE_META,
} from "@/src/config/app-config";
import type {
  ActionStatus,
  CaseStatus,
  DetectionSource,
  ExceptionType,
  PriorityBand,
  UserRole,
} from "./types";

/**
 * Enum labels, in the reader's language.
 *
 * The meta tables in `src/config/app-config.ts` are evaluated at import, long
 * before a locale is known, and they are read by the query layer, the CSV
 * exporters and the filter builders as well as by components — so their labels
 * cannot become catalogue lookups. Instead the authored English stays there as
 * the fallback and every *rendering* site comes through here.
 *
 * The fallback is deliberate rather than defensive: a band or an exception type
 * added to the domain before its translation is written renders the English word
 * a reader can still act on, not a raw `exception.NEW_THING` key.
 */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Present when a catalogue actually carries the key, as opposed to echoing it. */
export interface LabelContext {
  t: Translate;
  messages: Record<string, string>;
}

function lookup(fmt: LabelContext, key: string, fallback: string): string {
  return fmt.messages[key] ? fmt.t(key) : fallback;
}

export function priorityLabel(band: PriorityBand, fmt: LabelContext): string {
  return lookup(fmt, `priority.${band}`, PRIORITY_META[band].label);
}

export function exceptionLabel(type: ExceptionType, fmt: LabelContext): string {
  return lookup(fmt, `exception.${type}`, EXCEPTION_META[type].label);
}

export function caseStatusLabel(status: CaseStatus, fmt: LabelContext): string {
  return lookup(fmt, `status.${status}`, CASE_STATUS_META[status].label);
}

export function actionStatusLabel(status: ActionStatus, fmt: LabelContext): string {
  return lookup(fmt, `actionStatus.${status}`, ACTION_STATUS_META[status].label);
}

export function roleLabel(role: UserRole, fmt: LabelContext): string {
  return lookup(fmt, `role.${role}`, ROLE_META[role].label);
}

export function roleShortLabel(role: UserRole, fmt: LabelContext): string {
  return lookup(fmt, `roleShort.${role}`, ROLE_META[role].short);
}

export function detectionSourceLabel(source: DetectionSource, fmt: LabelContext): string {
  return lookup(fmt, `detection.${source}`, DETECTION_SOURCE_META[source].label);
}

/**
 * Connector health and run outcome.
 *
 * These arrive already computed — `evaluateConnectorHealth` returns the band's
 * whole token set, label included — so the resolver takes the band alongside the
 * authored label rather than re-deriving it from a meta table.
 */
export function connectorBandLabel(band: string, authored: string, fmt: LabelContext): string {
  return lookup(fmt, `connectorBand.${band}`, authored);
}

export function runStatusLabel(status: string, authored: string, fmt: LabelContext): string {
  return lookup(fmt, `runStatus.${status}`, authored);
}
