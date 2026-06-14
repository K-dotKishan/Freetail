# DECISIONS.md — Engineering Decision Log

## D1: Soft Delete for Expenses

**Decision:** Use `is_deleted=True` flag instead of hard DELETE.

**Options considered:**
- Hard delete: simple, no extra column, but audit trail is lost permanently
- Soft delete with flag: preserves history, allows Meera's requirement of approving anything deleted
- Full audit table with snapshots: complete history but heavy

**Why this:** The assignment specifically requires Meera to approve deletions. Soft delete means the row stays in the database and shows in the audit log, even after import rejection. Hard delete would prevent any post-hoc review.

---

## D2: INR as Canonical Currency for Balance Calculations

**Decision:** All balance calculations happen in INR. USD amounts are converted at import time using a configurable rate.

**Options considered:**
- Multi-currency ledger (keep each amount in its original currency, convert at query time)
- Convert at import time, store amount_inr alongside original
- Force single currency

**Why this:** The group's ledger is fundamentally INR — even Dev's USD expenses are for shared flat costs. Priya's requirement was "the sheet pretends a dollar is a rupee — that can't be right", which means we need conversion, but we don't need live rates or per-currency balances. Converting at import (with the rate stored) is transparent: you can always see the original USD amount and the rate used.

The rate is stored per-expense (`exchange_rate` column) so changing the global rate doesn't silently revalue old transactions.

---

## D3: Percentage Normalization vs. Rejection

**Decision:** When percentages don't sum to 100%, normalize proportionally rather than reject the row.

**Options:**
- Reject the row entirely (requires user to fix the CSV)
- Flag and let user decide
- Auto-normalize and flag

**Why this:** The CSV note says "percentages might be off" — the user clearly intended the relative proportions, not the absolute numbers. Normalization (each % ÷ sum × 100) preserves intent. We flag it clearly so nothing is hidden.

---

## D4: Settlement Detection Heuristic

**Decision:** Detect settlements by checking: (a) notes contain "settlement", (b) description contains "paid back", (c) split_type is empty and it's clearly a transfer.

**Options:**
- Only detect by notes
- Require a separate "type" column in CSV
- Always treat missing split_type as a settlement

**Why this:** The CSV doesn't have a "type" field. The note on the Rohan→Aisha row explicitly says "this is a settlement not an expense??" — that's unambiguous. For robustness, we also check description text. We always flag for user confirmation rather than silently converting.

---

## D5: Duplicate Detection Strategy

**Decision:** Two passes: (1) exact signature match (date + normalized_description + amount), (2) near-duplicate check (same date, overlapping description keywords).

**Options:**
- Only exact match (misses Thalassa situation)
- Fuzzy string distance on description (more complex, more false positives)
- Two-pass with keyword extraction

**Why this:** The Thalassa dinner is the hardest case — two different people logged the same dinner with slightly different descriptions and amounts. Pure exact matching would miss it. The two-pass approach catches both the exact duplicate (Marina Bites) and the near-duplicate (Thalassa) without requiring a complex fuzzy library.

For near-duplicates, we extract content words (≥4 chars) from the description and sort them. "Dinner at Thalassa" and "Thalassa dinner" both reduce to "dinner thalassa" — match.

---

## D6: Ex-Member Split Policy

**Decision:** Remove Meera from April splits and redistribute her share equally.

**Options:**
- Reject the entire row
- Keep Meera in (she might still owe from her time in the flat)
- Remove her, redistribute among remaining members
- Ask user per row

**Why this:** Sam's requirement: "I moved in mid-April. Why would March electricity affect my balance?" — the principle is that expenses should only include members active on that date. Meera left 31 March; April expenses are not her responsibility. Redistributing to active members is the fairest outcome. Each April row is flagged so the user can see exactly what changed.

---

## D7: Balance Calculation — Greedy Debt Simplification

**Decision:** Use a greedy min-max creditor/debtor matching algorithm to find minimum transactions.

**Options:**
- Show raw per-pair balances (more transparent, more transactions)
- Greedy simplification (fewer transactions, may introduce indirect payments)
- ILP optimization (optimal but overkill for 5 people)

**Why this:** Rohan's requirement: "If the app says I owe ₹2,300, I want to see exactly which expenses make that up." We satisfy this by showing the full expense breakdown alongside the simplified settlement. The simplification just shows the optimal payment plan; the breakdown shows the source.

With ≤10 members, greedy gives the optimal result in O(n log n).

---

## D8: JWT Authentication (7-day access tokens)

**Decision:** 7-day access token lifetime, 30-day refresh tokens.

**Why this:** This is a flat-mates app — they'll use it regularly from the same devices. Long-lived tokens reduce login friction without a meaningful security tradeoff for a private group app. The interceptor auto-refreshes on 401 so sessions feel seamless.

---

## D9: SQLite for Development

**Decision:** SQLite in dev, PostgreSQL-compatible schema for production.

**Why this:** Eliminates setup friction for running locally. All Django ORM queries are database-agnostic. The only SQLite-specific concern is concurrent writes — acceptable for a 4-5 person app, trivially fixed by switching the DATABASE_URL in production.
