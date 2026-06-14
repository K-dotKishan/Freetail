# DECISIONS.md — Engineering Decision Log

> **Assignment:** Shared Expenses App — Spreetail Software Engineering Intern
> Each entry covers: the decision made, all options considered, and the reasoning.

---

## D1 — Soft Delete for Expenses (not hard DELETE)

**Decision:** Deleted expenses set `is_deleted = True`. The row stays in the database forever.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| Hard DELETE | Simple, no extra column | Audit trail gone permanently |
| Soft delete flag | History preserved, reversible | Slightly more complex queries |
| Separate audit snapshot table | Complete version history | Heavy — overkill for this scope |

**Why this:** Meera's explicit requirement: *"I want to approve anything the app deletes or changes."* Soft delete means the row survives in `imports_importrow.raw_data` and `audit_auditlog` even after rejection. Hard delete would make post-hoc review impossible. All balance queries simply add `WHERE is_deleted = FALSE` — negligible complexity.

---

## D2 — INR as the Single Canonical Currency for Balances

**Decision:** All balance arithmetic happens in INR. Non-INR amounts are converted at import time using a rate stored per-expense.

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| Multi-currency ledger | Exact in each currency | Requires live exchange rates, complex UI |
| Convert at query time | Always uses latest rate | Past expenses silently revalued if rate changes |
| **Convert at import, store rate per expense** | Auditable, no silent revaluation | Rate is fixed at import time |

**Why this:** Priya's requirement: *"Half the trip was in dollars. The sheet pretends a dollar is a rupee. That can't be right."* The group's debts are ultimately settled in INR. Storing `amount`, `currency`, `exchange_rate`, and `amount_inr` on every expense means you can always see the original USD figure and the exact rate used. Changing the global rate in `.env` does not retroactively change already-imported expenses — which is the correct behaviour (you agreed to split $84 at ₹84/$ on that day, not at whatever today's rate is).

---

## D3 — Percentage Normalization Instead of Rejection

**Decision:** When split percentages don't sum to 100%, normalize them proportionally rather than rejecting the row.

**Options considered:**

| Option | Behaviour |
|--------|-----------|
| Reject row | Forces user to fix CSV first — but CSV editing is explicitly banned |
| Flag and block | User sees the error but cannot fix within the app |
| **Auto-normalize + flag** | Preserves relative intent, transparent transformation |

**Why this:** The CSV note on Pizza Friday says *"percentages might be off"* — the user knew the proportions (Aisha/Rohan/Priya pay equally, Meera pays slightly less) but entered bad absolute numbers. Normalization formula: `corrected% = original% ÷ sum × 100`. The original values and the corrected values are both shown in the anomaly report so nothing is hidden.

---

## D4 — Two-Pass Duplicate Detection

**Decision:** Run duplicate detection in two passes: (1) exact signature match, (2) near-duplicate keyword match.

**Options considered:**

| Option | Catches Marina Bites? | Catches Thalassa? | False positive risk |
|--------|-----------------------|-------------------|---------------------|
| Exact match only | ✅ | ❌ | Low |
| `difflib` fuzzy match (0.6 threshold) | ✅ | ✅ | High ("Groceries BigBasket" ≈ "Groceries DMart") |
| **Two-pass keyword extraction** | ✅ | ✅ | Low |

**Why this:** The Thalassa dinner is the canonical hard case — two different people, slightly different descriptions ("Dinner at Thalassa" vs "Thalassa dinner"), different amounts. Pure exact matching misses it. The two-pass approach:
- Pass 1: `(date, normalize(description), amount)` — catches Marina Bites (identical)
- Pass 2: extract alphabetic tokens ≥4 chars, sort, group by (date, sorted_tokens) — catches Thalassa

The keyword approach is immune to the false positive that killed the `difflib` approach: "Groceries BigBasket" extracts `['bigbasket', 'groceries']`, "Groceries DMart" extracts `['dmart', 'groceries']` — different, correctly not flagged.

---

## D5 — Settlement Detection by Semantic Signals Only

**Decision:** A row is classified as a settlement only if its notes contain "settlement" or its description contains "paid back" / "paid X back".

**Options considered:**

| Option | Problem |
|--------|---------|
| Empty `split_type` = settlement | False positives: "House cleaning supplies" (missing payer, not a settlement) |
| Any two-person transfer = settlement | False positive: "Sam deposit share" (two-person but is a deposit) |
| **Explicit text signals only** | Only catches genuinely labelled settlements |

**Why this:** Missing `split_type` is an anomaly (missing data), not evidence of a settlement. The Rohan→Aisha row is unambiguous because the note literally says *"this is a settlement not an expense??"* Requiring explicit semantic signals avoids incorrectly reclassifying ambiguous rows. Rows that might be settlements but aren't explicitly labelled are flagged as anomalies and left to the user.

---

## D6 — Ex-Member Split Policy: Remove and Redistribute

**Decision:** When a departed member appears in a post-departure expense split, remove them and redistribute their share equally among active members.

**Options considered:**

| Option | Problem |
|--------|---------|
| Reject the entire row | Loses a legitimate expense |
| Keep Meera in | Violates Sam's requirement; incorrect |
| **Remove + redistribute** | Correct behaviour, fully logged |
| Ask user per row | More control, but adds friction for a clear-cut case |

**Why this:** Sam's requirement: *"I moved in mid-April. Why would March electricity affect my balance?"* The same logic applies in reverse — Meera left 31 March, so April expenses are not her responsibility. The April Groceries note even says *"oops Meera still in the group list"* — confirming this is a data entry error. Redistribution is logged in the anomaly report so the change is fully transparent. The user can still reject the row if they disagree.

---

## D7 — Greedy Debt Simplification Algorithm

**Decision:** Use a greedy min-max creditor/debtor matching algorithm to compute the minimum set of payments needed to settle all debts.

**Options considered:**

| Option | Transactions | Complexity |
|--------|-------------|------------|
| Raw per-pair balances | O(n²) | O(n²) |
| **Greedy min-max** | O(n-1) worst case | O(n log n) |
| Integer Linear Programming | Optimal | Overkill for ≤10 people |

**Why this:** Aisha's requirement: *"I just want one number per person. Who pays whom, how much, done."* The greedy algorithm produces the minimum number of transactions. Rohan's requirement (*"I want to see exactly which expenses make that up"*) is satisfied separately by the per-expense breakdown shown alongside the settlement plan — these are two different views of the same data.

Algorithm: sort creditors (net positive balance) descending, sort debtors (net negative balance) descending. Greedily match the largest creditor with the largest debtor, transfer `min(credit, debt)`, advance whichever is exhausted.

---

## D8 — User Approval Gate Before Any Data is Written

**Decision:** Parsed CSV rows are stored as `ImportRow` with `decision=pending`. No `Expense` or `Settlement` is created until the user explicitly accepts each row.

**Options considered:**

| Option | Risk |
|--------|------|
| Import everything, let user delete bad rows | Hard to undo; silent errors slip through |
| Import clean rows automatically, flag anomalies | Partial imports are confusing to reason about |
| **Full approval gate for all rows** | Nothing committed without explicit consent |

**Why this:** Meera's requirement: *"Clean up the duplicates — but I want to approve anything the app deletes or changes."* A crashed import and a silent guess are both failing answers (assignment spec). The approval gate means every row has an explicit decision logged. The `ImportRow` table preserves `raw_data` (what the CSV said) and `parsed_data` (what the system computed) for every row permanently.

---

## D9 — Time-Bounded Membership Model

**Decision:** `Membership` has `joined_at` and `left_at` date fields. Expenses validate participant membership against the expense date.

**Options considered:**

| Option | Problem |
|--------|---------|
| Simple many-to-many User↔Group | Cannot represent Meera leaving or Sam joining |
| Separate historical table | More complex queries |
| **Membership with date range** | Clean, queryable, handles all scenarios |

**Why this:** The assignment has three membership events: Meera leaves end of March, Sam joins mid-April, Dev is a guest. A date range on `Membership` handles all three:
- `left_at = NULL` → currently active
- `left_at = 2026-03-31` → Meera's departure
- `joined_at = 2026-04-08` → Sam's arrival
- Dev has no membership record — guest expenses track him by name only

The importer uses `joined_at ≤ expense_date < left_at` (or `left_at IS NULL`) to determine whether a participant was an active member when an expense occurred.

---

## D10 — PostgreSQL on Neon for Production

**Decision:** SQLite locally, PostgreSQL (Neon serverless) in production.

**Options considered:**

| Option | Dev experience | Production fit |
|--------|----------------|----------------|
| SQLite everywhere | Simple | Concurrent writes, no cloud access |
| PostgreSQL everywhere | More setup | Best for production |
| **SQLite local, PostgreSQL production** | Fast local dev | Correct for deployment |

**Why this:** All ORM queries are database-agnostic — switching is a one-line change in `DATABASE_URL`. Neon's serverless PostgreSQL gives a free-tier production database with auto-suspend (Django's `conn_health_checks=True` handles reconnection transparently). The `dj_database_url.parse()` pattern keeps connection config in one environment variable — no hardcoded credentials anywhere.
