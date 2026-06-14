# AI_USAGE.md — AI Tool Usage Log

## Tools Used

- **Kiro (Claude-based AI IDE)** — primary development collaborator
- Used for: scaffolding, boilerplate, design system, anomaly detection logic

---

## Key Prompts Used

### 1. CSV Anomaly Analysis
```
Analyze this CSV data carefully and identify ALL data problems/anomalies.
List every single anomaly. For each: row identifier, the exact problem,
suggested handling policy.
```
Result: 19 anomalies identified. Used as the basis for SCOPE.md and the anomaly_detector.py implementation.

### 2. Balance Calculation Logic
```
Implement a balance calculation service that:
1. Credits the payer for the full amount_inr
2. Debits each participant their owed_amount from ExpenseSplit
3. Applies settlements
4. Uses greedy min-max to simplify debts into minimum transactions
```

### 3. UI Design System
```
Design a beautiful dark-mode design system using Tailwind CSS with:
- Deep space background (#0f0f1a)
- Indigo-violet brand gradient
- Glass card components
- Animated glow effects
```

---

## Cases Where AI Output Was Wrong

### Case 1: Percentage Normalization Bug
**What AI generated:**
```python
for d in split_details:
    d['value'] = d['value'] / total_pct * 100
```
**Problem:** This divided by `total_pct` which could be `Decimal('0')` if all values were None (parse errors). Also didn't handle the case where `total_pct` was already exactly 100.

**Fix applied:**
```python
if total_pct > 0 and abs(total_pct - Decimal('100')) > Decimal('0.01'):
    for d in split_details:
        if d.get('value') is not None:
            d['value'] = (d['value'] / total_pct * Decimal('100')).quantize(Decimal('0.01'))
```
Added null guard, zero guard, and early-exit when already at 100%.

---

### Case 2: Duplicate Detection False Positive
**What AI generated:**
The near-duplicate detector used Python's built-in `difflib.SequenceMatcher` with a 0.6 threshold. In testing, "Groceries BigBasket" (Feb) and "Groceries DMart" (Mar) were flagged as near-duplicates despite being clearly different expenses.

**Problem:** Both contain "Groceries" and the matcher focused on that common word, producing a false positive.

**Fix applied:**
Replaced `difflib` with keyword extraction — extract alphabetic tokens ≥4 chars and sort them. "Groceries BigBasket" → `['bigbasket', 'groceries']`. "Groceries DMart" → `['dmart', 'groceries']`. These don't match because the store names differ, which is the distinguishing signal.

---

### Case 3: Settlement Detection Over-Triggering
**What AI generated:**
The initial settlement heuristic checked `not split_type_raw` (empty split_type field) to identify settlements. This caused the "Sam deposit share" and "House cleaning supplies" rows to also be flagged as settlements — neither of which is a settlement.

**Problem:** Missing split_type is an anomaly (unknown/missing data), not evidence of a settlement. The heuristic was too broad.

**Fix applied:**
Narrowed the heuristic to require explicit semantic signals:
```python
if 'settlement' in notes or 'paid back' in desc_lower:
    is_settlement = True
```
Only rows with explicit settlement language in notes or description are auto-detected as settlements. The "Sam deposit" and "cleaning supplies" rows now get different anomaly codes (deposit_as_expense and missing_payer respectively).

---

## What AI Did Well

- Scaffolded the entire Django app structure with correct imports, model relationships, and URL routing in a single pass
- Generated a production-quality Tailwind design system with consistent component classes
- Identified all 19 CSV anomalies correctly when given the full CSV and context
- Correctly implemented the greedy debt simplification algorithm with proper Decimal arithmetic
