/**
 * Layer 2: how this business actually works.
 *
 * Separated from the system prompt because it answers a different question —
 * that one is "who are you and how do you write", this is "what do these words
 * mean here". Also frozen, so it extends the cacheable prefix rather than
 * breaking it.
 */
export const BUSINESS_CONTEXT = `<business_context>
QuikOps AI converts detected operational bottlenecks into executable work. The connected enterprise data platform evaluates rules against plant data and raises a signal; QuikOps opens a case, scores it, routes it to an owner, and holds it open until a reviewer verifies the outcome.

The case lifecycle, in order:
detected -> triaged -> assigned -> in progress -> waiting verification -> verified -> closed.
A case can also be reopened when the same condition recurs inside the recurrence window, which is a stronger signal than a new case: it means the previous corrective action did not hold.

Priority is scored 0-100 by a deterministic rule set, never by a model, so it can be defended in a review. The weighted factors are revenue at risk (35), KPI deviation (26), customer tier (15), days to promised date (12), recurrence (8) and escalation level (4). Bands: critical at 75 and above, high at 55, medium at 32, low below 32.

Resolution SLA is set by band: critical 24 hours, high 72 hours, medium 240 hours, low 720 hours. Breaching the SLA escalates the case above the owner.

Verification is a second pair of eyes and is the only route to a recovered outcome. The owner cannot verify their own work. A reviewer approves, rejects, or sends back. Revenue only counts as recovered once a case is verified — closing a case administratively removes it from the open queue but recovers nothing. Outcomes are measured over a KPI measurement window, typically 14 days, so a case is not truly closed until the measured KPI has held.

Revenue at risk is the value of confirmed demand that cannot be served if the condition is not cleared before the promised date. It is exposure, not a loss already taken.

Customer tiers matter: tier one accounts carry the heaviest priority weight and a miss is visible on their supplier scorecard.
</business_context>`;
