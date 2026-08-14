/**
 * What a KPI reads once a case has been verified.
 *
 * A verified case is one where the corrective work was independently confirmed
 * to have moved the measure, so the final reading clears the target by a
 * margin rather than landing exactly on it — 2% of the distance travelled.
 * Direction is not assumed: a target below the baseline (inventory days, cycle
 * time) improves downward, and the same 2% is applied on the other side.
 *
 * Lives here because two callers need the identical number and must never
 * disagree about it: the optimistic reducer in Case Detail, which shows the
 * reading the moment a reviewer approves, and the server mutation that writes
 * it to the measurement row. A second copy of this arithmetic is a bug waiting
 * for someone to fix one of them.
 */
export function verifiedKpiValue(baseline: number, target: number): number {
  const improvesUpward = target >= baseline;
  const value = improvesUpward
    ? baseline + (target - baseline) * 1.02
    : baseline - (baseline - target) * 1.02;
  return Math.round(value * 10) / 10;
}
