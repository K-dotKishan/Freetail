# AI_USAGE.md — AI Tools, Prompts & Corrections

> **Assignment:** Shared Expenses App — Spreetail Software Engineering Intern

---

## Tools Used

| Tool | Role |
|------|------|
| **Kiro** (Claude-based AI IDE by AWS) | Primary development collaborator — code generation, architecture scaffolding, design system |

Kiro was used as a pair programmer throughout. Every line of generated code was read, understood, tested, and — where necessary — corrected before being committed. The sections below document the process honestly.

---

## Key Prompts Used

### Prompt 1 — CSV Anomaly Analysis
```
You are analysing a shared expenses CSV export. Identify ALL data problems.
For each anomaly: give the exact row (date + description), the specific problem,
and a suggested handling policy. Be exhaustive — this will be tested.
```
**Context provided:** Full CSV content, member names, timeline (Meera left end of March, Sam joined mid-April, Dev is a guest).

**Output:** 19 anomalies identified across categories: duplicates, format errors, missing fields, wrong member references, financial logic errors, non-expense entries, and multi-currency issues. This output became the basis for `SCOPE.md` and the entire `apps/imports/` module.

---

### Prompt 2 — Django Project Scaffolding
```
Scaffold a Django REST API for a shared expenses app with these apps:
accounts (custom User), groups (with time-bounded membership), expenses
(4 split types: equal/unequal/percentage/share), settlements, imports
(CSV pipeline with anomaly detection), audit. Use JWT auth, postgres-compatible
models, and soft delete for expenses.
```
**Output:** Full directory structure, models, serializers, views, URLs for all 6 apps. Migrations worked first try.

---

### Prompt 3 — Balance Calculation Service
```
Implement a balance calculation function that:
1. Iterates all non-deleted expenses in a group
2. Credits the payer amount_inr, debits each split participant their owed_amount
3. Applies settlements to reduce balances
4. Returns {user_id: net_balance} and a per-user expense breakdown
Then implement greedy debt simplification: sort creditors and debtors by
absolute value, greedily match largest creditor with largest debtor.
Use Python Decimal throughout, no float arithmetic.
```
**Output:** `balance_service.py` — correct on first implementation.

---

### Prompt 4 — Frontend Design System
```
Design a dark-mode UI design system using Tailwind CSS for a shared expenses app.
Palette: deep space background (#0f0f1a), indigo-violet brand gradient.
Components needed: glass cards, gradient buttons, input fields, badges, tables,
modals, navigation sidebar, avatar chips, stat cards. All as reusable Tailwind
component classes in index.css using @layer components.
```
**Output:** Complete design system in `index.css` and `tailwind.config.js` with custom colors, shadows, animations, and 20+ component classes.

---

### Prompt 5 — Import Pipeline Architecture
```
Design a CSV import pipeline with these stages:
1. Parse raw CSV (handle comma-in-amounts, various date formats)
2. Per-row anomaly detection (6 validator modules)
3. Duplicate detection (exact + near-duplicate, two-pass)
4. Store as ImportBatch + ImportRow (raw + parsed + anomalies)
5. User approval gate (accept/reject per row)
6. Approval service creates Expense or Settlement objects
7. Report generation (JSON + downloadable text)
Document every anomaly type and the policy applied to each.
```
**Output:** Complete `apps/imports/` module with parsers, validators, services, views, and URL routing.

---

## Three Cases Where AI Output Was Wrong

### Case 1 — Percentage Normalization: Division by Zero Bug

**What AI generated:**
```python
# In anomaly_detector.py
for d in split_details:
    d['value'] = d['value'] / total_pct * 100
```

**How I caught it:** Code review. I asked: what happens if `total_pct` is `0`? This would occur if all `split_details` entries had parse errors (e.g. "Aisha thirty%; Rohan thirty%") — `total_pct` would be `Decimal('0')` and the division would raise `InvalidOperation`.

I also noticed it didn't handle the case where percentages already summed to exactly 100 — it would run the normalization loop unnecessarily.

**What I changed:**
```python
# Added: zero guard, already-100 early exit, None guard per entry
if total_pct > 0 and abs(total_pct - Decimal('100')) > Decimal('0.01'):
    for d in split_details:
        if d.get('value') is not None:
            d['value'] = (d['value'] / total_pct * Decimal('100')).quantize(Decimal('0.01'))
```
Three lines of defensive code that prevent a crash on malformed input and avoid unnecessary computation on clean data.

---

### Case 2 — Duplicate Detection: False Positive on "Groceries"

**What AI generated:**
The near-duplicate detector used `difflib.SequenceMatcher` with a similarity threshold of 0.6:
```python
from difflib import SequenceMatcher
ratio = SequenceMatcher(None, desc_a, desc_b).ratio()
if ratio > 0.6:
    flag_as_near_duplicate(...)
```

**How I caught it:** I manually traced the detector against the full CSV. "Groceries BigBasket" (Feb 3) and "Groceries DMart" (Mar 18) have a similarity ratio of ~0.68 — above the threshold — so they were being flagged as near-duplicates. They are clearly different expenses (different shops, different months, different amounts).

The root cause: `difflib` treats character overlap as similarity. "Groceries" is 9 characters shared by both strings, dominating the ratio.

**What I changed:**
Replaced `difflib` entirely with a keyword-extraction approach:
```python
def _get_description_core(desc: str) -> str:
    # Extract alphabetic tokens ≥4 chars, sort them
    import re
    tokens = re.findall(r'[a-z]{4,}', desc.lower())
    return ' '.join(sorted(tokens))
```
"Groceries BigBasket" → `['bigbasket', 'groceries']`
"Groceries DMart" → `['dmart', 'groceries']`
Different → not flagged. ✅

"Dinner at Thalassa" → `['dinner', 'thalassa']`
"Thalassa dinner" → `['dinner', 'thalassa']`
Same → correctly flagged. ✅

---

### Case 3 — Settlement Detection: Too Many False Positives

**What AI generated:**
```python
# In anomaly_detector.py
if not split_type_raw:  # empty split_type = settlement
    is_settlement = True
```

**How I caught it:** Traced this against every CSV row. Three rows have empty `split_type`:
1. "Rohan paid Aisha back" → correctly a settlement ✅
2. "House cleaning supplies" → NOT a settlement — it's a normal expense with a missing payer ❌
3. "Sam deposit share" → NOT a settlement — it's a deposit payment ❌

The AI's logic was: "missing split_type implies settlement." That's wrong. Missing `split_type` means missing data, not a specific transaction type.

**What I changed:**
Narrowed detection to require explicit semantic signals in the text:
```python
if 'settlement' in notes.lower() or 'paid back' in desc_lower:
    is_settlement = True
    # add settlement_as_expense anomaly
```
"House cleaning supplies" now gets `missing_payer` anomaly (correct).
"Sam deposit share" now gets `deposit_as_expense` anomaly (correct).
"Rohan paid Aisha back" still gets `settlement_as_expense` anomaly (correct).

All three are now handled differently and accurately.

---

## What AI Did Well

- **Full Django scaffolding in one pass** — models, relationships, URL routing, serializers — all correct and import-clean on first try
- **Decimal arithmetic discipline** — never used `float` for monetary values; used `Decimal` and `.quantize()` throughout without being prompted
- **Design system quality** — the Tailwind component system (glass cards, gradient buttons, glow shadows) was production-ready without iteration
- **Anomaly identification** — given the full CSV and context, correctly identified all 19 problems including subtle ones (ex-member in split, deposit vs settlement, near-duplicate dinners)
- **Greedy debt simplification** — implemented correctly including edge cases (creditor and debtor of exactly equal amounts, floating point tolerance with Decimal)
