# Architecture

## 1. Problem Statement

*Describe the fragmented customer identity problem across KIC's systems and why it matters. Why is a shared email or phone number insufficient as a single canonical key? What are the business consequences of unresolved identity — in CRM, in marketing attribution, in the studio experience?*

---

## 2. Build vs Buy

*Would you build this identity resolution layer, or buy a Customer Data Platform (CDP) — and why? What factors drive that call: cost, control, time-to-value, team capability, data residency, or something else? If you'd buy, which product and why; if you'd build, what does that imply about ongoing maintenance and ownership?*

---

## 3. Proposed Data Model

*Define the unified customer profile and how it relates to identity signals and source events. A diagram or structured description is fine. Consider: what is the canonical record, how are signals stored as typed edges, and how do source events reference the profile rather than the signal?*

---

## 4. Integration Points

*For each of KICApp, Shopify, Mindbody — how does data flow into the central layer? What signals does each system provide, and what are the integration patterns (webhooks, polling, SDK instrumentation, server-side event forwarding)?*

---

## 5. Identity Resolution

*How does the system resolve events to canonical profiles when no single shared key exists?*

Cover:
- The resolution algorithm: given an incoming event with a set of signals, how do you find the right profile? What is the lookup order? What happens when signals match different profiles (collision)?
- Deterministic vs probabilistic signals: how does your model distinguish between a high-confidence match (same phone) and a lower-confidence one (same device, which could be a shared iPad at a studio)?
- Cascading merges: when a new event links two previously separate profiles, how do you unify them? What happens to their existing events?
- Merge provenance: what do you record about why two profiles were merged, so the decision can be reviewed or reversed?
- The real KIC signal landscape includes: `email`, `phone`, `device_id`, `browser_fingerprint`, `shopify_customer_id`, `mindbody_client_id`, `app_user_id`, `fbclid`, `gclid`. How does your model accommodate signals that are short-lived (click IDs) versus stable (platform IDs)?

---

## 6. Failure Modes

*Identify at least four failure scenarios and how the architecture mitigates each. Consider: duplicate webhooks, downstream outages, schema drift in source payloads, identity conflicts (two real people sharing a device), a bad merge that incorrectly unified two separate customers, and what happens when it goes out against a stale identity snapshot.*

---

## 7. Rollout Strategy

*How would you introduce this without breaking existing integrations? Consider shadow mode, feature flags, phased cutover, and how you'd validate identity resolution accuracy before making it load-bearing for CRM or marketing sends.*

---

## 8. "We Miss You" Campaign — Worked Example

*Trace this specific use case end-to-end through your proposed architecture: Marketing wants to send a re-engagement email to members who have lapsed from studio bookings but remain active in the app, with a discount code valid in both Shopify and at the studio.*

*Walk through: how the system knows these are the same person (they may have different emails in Mindbody vs the app), how the lapse signal is detected, how the discount code is issued and made valid across both systems, and what happens if the identity resolution was wrong — the wrong person gets the email or the discount is redeemed by someone else.*
