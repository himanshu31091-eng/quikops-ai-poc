# PERMA PRESENTATION CONTEXT

> Written for Claude Browser and the client presentation.
> **This is the only presentation truth.** It supersedes
> `PRESENTATION_CONTEXT.md`, which describes an earlier seeded organisation and
> must not be used for this deck.
>
> Presentation-focused by design: no project history, no past decisions.

---

## 1. Product

**QuikOps AI** — an operational execution platform for manufacturing.

> Your enterprise data identifies operational bottlenecks.
> QuikOps AI turns them into executed, verified outcomes.

Analytics tells you a problem exists. Nothing owns it, tracks it to closure, or
proves the fix held. That gap is what QuikOps closes.

---

## 2. Customer scenario

**Perma Construction Aids** — an Indian construction-chemicals manufacturer.
Product lines: waterproofing chemicals, concrete admixtures, repair chemicals,
tile adhesives. Customers are construction and infrastructure contractors.

---

## 3. What this scenario is

A **representative / illustrative** manufacturing and supply-chain implementation
scenario. It models how QuikOps would address a real operational problem at a
company of this type.

---

## 4. Credibility rule — read before writing a single slide

**Do not claim Perma Construction Aids is an actual historical production
customer.** Nothing supports it. Do not state or imply that QuikOps was
implemented for them, deployed at their sites, or produced results there.

**Do not invent historical customer results** — no savings, ROI, benefit
percentages, testimonials or before/after outcomes attributed to Perma.

Every figure in the screenshots is illustrative demonstration data. If a slide
needs a number, take it from a screenshot in this pack and label the scenario as
illustrative.

---

## 5. Current scenario facts

| | |
|---|---|
| Company | Perma Construction Aids |
| Plants | **Vapi** (VP01, Gujarat) · **Roorkee** (RK01, Uttarakhand) · **Hyderabad** (HY01, Telangana) |
| Currency | **Indian rupees (₹)**, written in lakh and crore — ₹42,00,000 and ₹1.4Cr |
| Case ID format | **QO-PA-2026-00xxx** |
| Corpus | 8 cases, 6 open |
| Date shown | 15 August 2026 |

> **Chennai is not part of the current scenario.** It existed in an earlier
> version and was removed. Three plants only.

**Plant positions as shown:** Vapi is the site needing attention — 3 open cases,
the only critical case, on-time delivery at 87.0% and falling 4.1 points.
Roorkee 2 open, Hyderabad 1 open, both healthier.

**People:** Rajesh Menon (Supply Chain Head) · Neha Deshpande (Head of
Operations) · Arun Iyer (Procurement Manager) · Kavita Bhatt (Quality Manager) ·
Prakash Nair (Platform Administrator).

---

## 6. Hero case — the spine of the presentation

**QO-PA-2026-00421 — Raw material availability, polymer resin**

| | |
|---|---|
| Plant | Vapi |
| Priority | Critical (81.7) |
| Status | In progress |
| Exposure | ₹42,00,000 |
| Owner | Arun Iyer, Procurement Manager |
| Data source | SAP ERP |
| Source record | PO-PA-45821 |
| Business impact | Three confirmed customer orders at risk |
| Supplier | Gujarat Petrochem Ltd |
| Customer | L&T Construction (tier one) |
| Actions | 3, of which 2 complete |

The signal: acrylic polymer resin confirmed four days behind the promised date,
followed by a one-day quality-release hold on the receipt.

---

## 7. Pending verification case

**QO-PA-2026-00418 — Packaging material shortage, HDPE pails**

Vapi · High priority · **Pending verification** · owner Arun Iyer.

All four corrective actions are complete and evidenced; the case is submitted and
waiting on an independent reviewer. Use this to show that **completing the work
is not the same as proving it worked** — the case sits in the queue until someone
who did not do the work signs it off.

---

## 8. The customer journey

```
Operational signal → Case → Owner → Corrective action → Evidence
  → KPI measurement → Pending verification → Verification → Closure
  → Management analytics
```

Each step is a screen in the demo, in that order.

---

## 9. Data lineage — the question every audience asks

```
Source system (SAP ERP)        the customer already owns this
        ↓
Source record (PO-PA-45821)    a purchase order that still lives upstream
        ↓
Operational signal             the delivery date moved
        ↓
Business rule                  agreed logic decides this is worth raising
        ↓
QuikOps case (QO-PA-2026-00421)
        ↓
Owner → corrective actions → evidence → verification
        ↓
Management view
```

The correct framing: *QuikOps consumes operational signals from existing business
systems and applies agreed business logic to identify exceptions requiring
attention.* It does not generate the data and did not invent the case.

---

## 10. POC data vs future production data

| This demonstration | A production deployment |
|---|---|
| Seeded, illustrative figures | The customer's live operational data |
| Three plants, eight cases | Their real sites and full case volume |
| Frozen clock at 15 Aug 2026 | Live time |
| Connectors modelled, no live ingestion | Real feeds from ERP, quality, procurement, dispatch |
| Session-scoped changes, discarded on refresh | Persisted, audited records |
| Persona switch instead of sign-in | Corporate identity, SSO |

Say *"in a deployment this would read your own SAP"* rather than implying it
already does.

---

## 11. What QuikOps does NOT claim

State these plainly if asked — they make the product more credible, not less:

1. **It does not automatically diagnose root causes.** The plant team does, and
   their conclusion is recorded on the case as team analysis.
2. **It does not automatically solve bottlenecks.** People execute the work.
3. **It does not replace the ERP** — SAP, Oracle or any other. Those remain the
   systems of record. QuikOps complements them.
4. **It does not make operational decisions for the customer.** It gives
   visibility, ownership, tracking, evidence, verification and measurement.

On KPI movement specifically: a reading inside an open measurement window is
**interim, not a verdict**. Related indicators are surfaced for management to
weigh — never presented as proven consequences.

---

## 12. Never mention Every Angle

The upstream analytics vendor is **never named** in any presentation, slide,
screenshot caption or spoken narration. Use *enterprise data platform*,
*connected enterprise data*, or simply *detected*.

---

## 13. Never use the previous scenario

The following belong to an earlier version and must not appear anywhere in the
deck:

- **Northbridge Industrial** and its email domain
- **US dollar figures** — the scenario is rupees
- **Old case IDs** in the `QO-2026-004xxx` format
- **Old plant names** — Querétaro, Greenville, Ingolstadt, Pune
- **Old personas** — Elena Vásquez, Marcus Reinhardt, Carlos Mendoza, Sandra Whitfield
- **Chennai**, which is no longer in the scenario

If a screenshot shows any of these, it is stale. Do not use it.

---

## 14. Recommended narrative

1. **The Perma problem** — customer deliveries slipping; management cannot see
   why, who owns it, or whether anything is working.
2. **Operational signal** — SAP shows a resin delivery four days late against
   PO-PA-45821.
3. **QuikOps case** — agreed business logic raises QO-PA-2026-00421 as critical,
   ₹42,00,000 exposed, three customer orders at risk.
4. **Owner and action** — Arun Iyer takes it; three corrective actions, two done.
5. **Evidence** — supplier confirmation, revised date, QC record, revised
   schedule. Proof the work happened.
6. **Verification** — QO-PA-2026-00418 shows the step that matters: complete and
   evidenced, waiting on an independent reviewer. Completion is not proof.
7. **Management visibility** — the dashboard answers *where do I look*, and the
   related-indicators panel asks *did fixing this press on something else?*
8. **Systemic improvement** — the playbook turns one successful response into a
   standard way of responding. The first time is an improvement action; the
   second should not be improvised.

Close on the argument, not the feature list:

> The ERP tells us what happened. QuikOps manages what happens next — and lets
> management verify whether the improvement actually worked.
