# SCOPE.md — Anomaly Log & Database Schema

> **Assignment:** Shared Expenses App — Spreetail Software Engineering Intern
> **CSV File:** `expenses_export.csv` (42 rows, Feb–Apr 2026)

---

## Part 1 — CSV Anomaly Log (19 Problems Found)

Every data problem in the CSV is listed below with the exact row, the problem, and the policy the importer applies.

---

### Anomaly 1 — Exact Duplicate Row: Marina Bites Dinner

| Field | Value |
|-------|-------|
| Row | 5 (08-02-2026, "dinner - marina bites") |
| Duplicate of | Row 4 (08-02-2026, "Dinner at Marina Bites") |
| Same | date, payer (Dev), amount (₹3200), participants |

**Problem:** The same dinner was logged twice — once with a capitalised description and notes, once without.

**Policy:** Auto-reject row 5. Keep row 4 (it has the note "Dev visiting for the weekend" which is useful context). The importer marks this as `decision: reject` automatically.

---

### Anomaly 2 — Near-Duplicate: Thalassa Dinner (Two People Logged Same Event)

| Field | Value |
|-------|-------|
| Row A | 23 — "Dinner at Thalassa", Aisha, ₹2400, 11-03-2026 |
| Row B | 24 — "Thalassa dinner", Rohan, ₹2450, 11-03-2026 |

**Problem:** Two flatmates logged the same dinner with different descriptions, different payers, and slightly different amounts. Row B even notes "Aisha also logged this I think hers is wrong."

**Policy:** Flag both for mandatory user review. The importer does not auto-reject because amounts differ (could be two separate bills). Recommended action: keep row B (₹2450, Rohan) as the more reliable record per the note. User must explicitly accept one and reject the other.

---

### Anomaly 3 — Amount with Embedded Comma: Electricity Feb

| Field | Value |
|-------|-------|
| Row | 6 — 10-02-2026, "Electricity Feb" |
| Raw amount | `"1,200"` (with quotes and comma in CSV) |

**Problem:** The amount field uses a thousands separator inside double quotes. A naive parser would read this as a string or fail.

**Policy:** Strip quotes and commas, parse as `1200`. Accept with info flag showing the transformation applied.

---

### Anomaly 4 — Over-Precise Amount: Cylinder Refill

| Field | Value |
|-------|-------|
| Row | 9 — 15-02-2026, "Cylinder refill" |
| Raw amount | `899.995` |

**Problem:** Three decimal places — standard currency uses two. This cannot be stored in a `DECIMAL(12,2)` column without loss.

**Policy:** Round to 2 decimal places → ₹900.00 (standard banker's rounding). Flag as info so the user can see the rounding occurred.

---

### Anomaly 5 — Missing Payer: House Cleaning Supplies

| Field | Value |
|-------|-------|
| Row | 12 — 22-02-2026, "House cleaning supplies" |
| paid_by | *(empty)* |
| Note | "can't remember who paid" |

**Problem:** The `paid_by` field is blank. Balance calculation requires knowing who paid — without a payer, no one gets credited.

**Policy:** Flag as warning, set decision to `pending`. Row cannot be auto-accepted. User must either assign a payer or reject the row before import can proceed.

---

### Anomaly 6 — Settlement Logged as Expense: Rohan Paid Aisha Back

| Field | Value |
|-------|-------|
| Row | 13 — 25-02-2026, "Rohan paid Aisha back" |
| Amount | ₹5000 |
| split_type | *(empty)* |
| Note | "this is a settlement not an expense??" |

**Problem:** This is a debt repayment between two people, not a shared expense. If imported as an expense, it would incorrectly affect everyone's balance. The note even flags the ambiguity.

**Policy:** Detect via note text containing "settlement" and description containing "paid back". Import as a `Settlement` record (payer: Rohan, payee: Aisha, ₹5000) rather than an `Expense`. Flag for user confirmation — the user must explicitly accept this reclassification.

---

### Anomaly 7 — Percentages Don't Sum to 100%: Pizza Friday

| Field | Value |
|-------|-------|
| Row | 14 — 28-02-2026, "Pizza Friday" |
| Split | Aisha 30% + Rohan 30% + Priya 30% + Meera 20% = **110%** |
| Note | "percentages might be off" |

**Problem:** The split percentages add up to 110%, not 100%. The amounts calculated from these percentages would exceed the total expense.

**Policy:** Normalize proportionally to 100%:
- Each corrected % = (original % ÷ 110) × 100
- Aisha: 27.27%, Rohan: 27.27%, Priya: 27.27%, Meera: 18.18%

Flag as warning. The user can see both the original and normalized values.

---

### Anomaly 8 — Name Variations: "Priya S", "priya", "rohan " (trailing space)

| Raw Name | Found In | Canonical Name |
|----------|----------|----------------|
| `Priya S` | Row 10 (18-02-2026 Groceries DMart) | Priya |
| `priya` | Row 8 (14-02-2026 Movie night snacks) | Priya |
| `rohan ` | Row 26 (Mar-14 Airport cab) | Rohan |

**Problem:** Same person, different capitalisation or suffix. Without normalisation the system would create duplicate user records or fail to match the payer.

**Policy:** Apply alias mapping at parse time (case-insensitive, strip whitespace). All variations resolve to their canonical name. Flag as info showing the normalisation applied.

---

### Anomaly 9 — Non-Standard Date Format: "Mar-14"

| Field | Value |
|-------|-------|
| Row | 26 — "Airport cab" |
| Raw date | `Mar-14` |

**Problem:** All other dates use `DD-MM-YYYY`. This date uses `Mon-DD` with no year — a completely different format.

**Policy:** Detect via regex `^[A-Za-z]{3}-\d{1,2}$`. Parse month abbreviation + day. Assume year 2026 (all surrounding data is from 2026). Resulting date: 14-Mar-2026. Flag as warning.

---

### Anomaly 10 — Ambiguous Date: Deep Cleaning Service

| Field | Value |
|-------|-------|
| Row | 33 — "Deep cleaning service" |
| Raw date | `04-05-2026` |
| Note | "is this April 5 or May 4? format is a mess" |

**Problem:** With DD-MM-YYYY, this is 4 May 2026. With MM-DD-YYYY, it's 5 April 2026. The note acknowledges the ambiguity. The date appears out of sequence in the file (after March entries, before April rent).

**Policy:** Use DD-MM-YYYY consistently (all other unambiguous dates in the CSV use this format). Interpret as **4 May 2026**. Flag as info noting the ambiguity and the interpretation applied.

---

### Anomaly 11 — Missing Currency: Groceries DMart (Mar 15)

| Field | Value |
|-------|-------|
| Row | 27 — 15-03-2026, "Groceries DMart" |
| currency | *(empty)* |
| Note | "forgot to set currency" |

**Problem:** Currency field is blank. Without a currency, the amount cannot be correctly converted or stored.

**Policy:** Default to the group's default currency (INR). Flag as warning showing the default applied.

---

### Anomaly 12 — Foreign Currency (USD): Goa Trip Expenses

| Row | Description | Amount | Currency |
|-----|-------------|--------|----------|
| 19 | Goa villa booking | 540 | USD |
| 20 | Beach shack lunch | 84 | USD |
| 22 | Parasailing | 150 | USD |
| 25 | Parasailing refund | -30 | USD |

**Problem:** These four rows are in USD. The original spreadsheet treated them as if USD = INR (Priya's complaint: "Half the trip was in dollars. The sheet pretends a dollar is a rupee. That can't be right."). Storing raw USD values as INR would severely distort balances.

**Policy:** Convert at 1 USD = ₹84.00 (configurable via `EXCHANGE_RATE_USD_TO_INR` environment variable). Store both the original amount and the exchange rate per expense so the conversion is always auditable. Flag all USD rows as info.

---

### Anomaly 13 — Guest/Non-Member Participant: "Dev's friend Kabir"

| Field | Value |
|-------|-------|
| Row | 22 — 11-03-2026, "Parasailing" |
| split_with | `Aisha;Rohan;Priya;Dev;Dev's friend Kabir` |
| Note | "Kabir joined for the day" |

**Problem:** "Dev's friend Kabir" is not a registered user or flat member. The system cannot link this name to a user account or calculate their balance in the app.

**Policy:** Parse as a guest participant. Create an `ExpenseSplit` record with `user=NULL` and `participant_name="Kabir"`. His share is tracked for the expense but does not appear in group balance calculations (he's a one-off guest). Flag as info.

---

### Anomaly 14 — Negative Amount: Parasailing Refund

| Field | Value |
|-------|-------|
| Row | 25 — 12-03-2026, "Parasailing refund" |
| Amount | -30 USD |
| Note | "one slot got cancelled" |

**Problem:** Negative amount. Could be a data entry error or a legitimate refund.

**Policy:** Accept as a refund. The note confirms it's intentional. Negative amount means splits are reversed — each participant receives their proportional share back rather than owing it. Flag as info.

---

### Anomaly 15 — Zero Amount Placeholder: Dinner Order Swiggy

| Field | Value |
|-------|-------|
| Row | 30 — 22-03-2026, "Dinner order Swiggy" |
| Amount | 0 |
| Note | "counted twice earlier - fixing later" |

**Problem:** Zero-value expense. The note confirms this was a placeholder to cancel a double-entry, not a real expense.

**Policy:** Auto-reject. A zero-amount expense has no financial effect and the note confirms it should not be imported. Decision set to `reject` automatically.

---

### Anomaly 16 — Ex-Member in Split: April Groceries

| Field | Value |
|-------|-------|
| Row | 35 — 02-04-2026, "Groceries BigBasket" |
| split_with | `Aisha;Rohan;Priya;Meera` |
| Note | "oops Meera still in the group list" |

**Problem:** Meera moved out on 31 March 2026. She appears in an April expense split. Sam's requirement directly addresses this: "I moved in mid-April. Why would March electricity affect my balance?"

**Policy:** Remove Meera from the split. Redistribute her share equally among the active members at that date (Aisha, Rohan, Priya). The note even acknowledges the error. Flag as warning showing Meera was removed and the redistribution applied.

---

### Anomaly 17 — Deposit Logged as Expense: Sam Deposit Share

| Field | Value |
|-------|-------|
| Row | 38 — 08-04-2026, "Sam deposit share" |
| Amount | ₹15000 |
| split_with | Aisha only |
| Note | "Sam moving in! paid Aisha his deposit" |

**Problem:** This is a security deposit payment from Sam to Aisha, not a shared flat expense. Treating it as an expense would incorrectly affect all flatmates' balances.

**Policy:** Flag as info (deposit_as_expense). Accept as-is but highlight that this is a two-person transaction (Sam → Aisha). Could alternatively be modelled as a Settlement. User makes the final call.

---

### Anomaly 18 — Split Type Conflict: Furniture for Common Room

| Field | Value |
|-------|-------|
| Row | 42 — 18-04-2026, "Furniture for common room" |
| split_type | `equal` |
| split_details | `Aisha 1; Rohan 1; Priya 1; Sam 1` |

**Problem:** Contradictory fields — `split_type` says "equal" but `split_details` also provides share values (all equal to 1). If split_details had unequal values this would be a real conflict.

**Policy:** Since all share values are identical (1 each), the result of either interpretation is identical. Accept as equal split, ignore the redundant split_details. Flag as info.

---

### Anomaly 19 — Unregistered Guest Name Format: "Dev's friend Kabir"

*(Same row as Anomaly 13 — logged separately as a distinct problem type)*

**Problem:** The participant string "Dev's friend Kabir" uses a possessive + first-name format. It is not a recognisable name format for the member resolver.

**Policy:** Strip possessive prefix ("Dev's friend "), extract "Kabir" as the guest name. Track as named guest participant.

---

## Part 2 — Database Schema

All tables use PostgreSQL via Neon. All monetary values stored as `DECIMAL(12,2)`.

---

### `accounts_user` (extends Django's AbstractUser)

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | auto |
| username | VARCHAR(150) | login credential, unique |
| display_name | VARCHAR(100) | shown in UI, used for CSV name matching |
| email | VARCHAR(254) | |
| password | VARCHAR(128) | bcrypt hash |
| first_name, last_name | VARCHAR | Django defaults |
| is_active, is_staff | BOOL | Django defaults |

---

### `groups_group`

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| name | VARCHAR(200) | e.g. "Flat 5B" |
| description | TEXT | optional |
| default_currency | VARCHAR(3) | INR / USD |
| created_by | FK → accounts_user | |
| created_at | TIMESTAMP | auto |
| updated_at | TIMESTAMP | auto |

---

### `groups_membership`

Tracks who is in which group and when they joined/left. This is the key table for Sam and Meera's requirements.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| group_id | FK → groups_group | |
| user_id | FK → accounts_user | |
| joined_at | DATE | membership start date |
| left_at | DATE | NULL = still active |
| guest_name | VARCHAR(100) | for non-registered guests |

**Constraint:** `UNIQUE(group_id, user_id)`

---

### `expenses_expense`

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| group_id | FK → groups_group | |
| description | VARCHAR(500) | |
| date | DATE | |
| amount | DECIMAL(12,2) | original currency (e.g. USD 84) |
| currency | VARCHAR(3) | INR or USD |
| exchange_rate | DECIMAL(10,4) | rate to INR at time of entry; 1.0 for INR |
| amount_inr | DECIMAL(12,2) | `amount × exchange_rate` — stored for fast balance queries |
| paid_by_id | FK → accounts_user (nullable) | NULL if payer unknown |
| paid_by_name | VARCHAR(100) | fallback for unregistered payers (e.g. Dev) |
| split_type | VARCHAR(20) | `equal` / `unequal` / `percentage` / `share` |
| notes | TEXT | |
| imported_from_id | FK → imports_importbatch (nullable) | set when row was imported from CSV |
| is_deleted | BOOL | soft delete — never hard-delete |
| created_by_id | FK → accounts_user | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### `expenses_expensesplit`

One row per participant per expense. The sum of all `owed_amount` values for an expense equals `amount_inr`.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| expense_id | FK → expenses_expense | CASCADE delete |
| user_id | FK → accounts_user (nullable) | NULL for guests |
| participant_name | VARCHAR(100) | used when user_id is NULL |
| owed_amount | DECIMAL(12,2) | this person's share in INR |
| split_value | DECIMAL(10,4) | raw input: %, share count, or fixed amount |

**Constraint:** `UNIQUE(expense_id, user_id)`

---

### `settlements_settlement`

Records a payment made between two members to settle a debt.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| group_id | FK → groups_group | |
| payer_id | FK → accounts_user | who sent money |
| payee_id | FK → accounts_user | who received money |
| amount | DECIMAL(12,2) | always in INR |
| date | DATE | |
| notes | TEXT | |
| created_by_id | FK → accounts_user | |
| created_at | TIMESTAMP | |

---

### `imports_importbatch`

One record per CSV upload. Tracks the overall status and aggregated counts.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| group_id | FK → groups_group | |
| uploaded_by_id | FK → accounts_user | |
| file_name | VARCHAR(255) | |
| status | VARCHAR(20) | `pending_review` / `approved` / `rejected` / `partial` |
| total_rows | INT | |
| valid_rows | INT | rows with zero anomalies |
| anomaly_count | INT | rows with at least one anomaly |
| created_at | TIMESTAMP | |
| approved_at | TIMESTAMP | nullable |

---

### `imports_importrow`

One record per CSV row. Stores raw input, parsed output, all detected anomalies, and the user's decision. This is the core of Meera's requirement ("I want to approve anything the app deletes or changes").

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| batch_id | FK → imports_importbatch | |
| row_number | INT | original CSV line number |
| raw_data | JSONB | verbatim CSV field values |
| parsed_data | JSONB | cleaned, normalised values the importer computed |
| anomalies | JSONB | array of `{code, message, severity, policy, field}` |
| has_anomaly | BOOL | fast filter |
| decision | VARCHAR(20) | `pending` / `accept` / `reject` / `accept_modified` |
| decision_notes | TEXT | user explanation |
| expense_id | FK → expenses_expense (nullable) | set after approval |
| settlement_id | FK → settlements_settlement (nullable) | set if reclassified |
| created_at | TIMESTAMP | |

---

### `audit_auditlog`

Append-only log of all significant actions in the system.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| user_id | FK → accounts_user | who performed the action |
| action | VARCHAR(20) | `created` / `updated` / `deleted` / `imported` / `approved` / `rejected` |
| model_name | VARCHAR(100) | e.g. `Expense`, `ImportBatch` |
| object_id | INT | PK of the affected object |
| description | TEXT | human-readable summary |
| extra_data | JSONB | arbitrary additional context |
| timestamp | TIMESTAMP | auto, indexed |

---

## Part 3 — Entity Relationship Summary

```
accounts_user
    │
    ├── groups_membership ──── groups_group
    │                               │
    ├── expenses_expense ───────────┤
    │       │                       │
    │       └── expenses_expensesplit    imports_importbatch
    │                                           │
    ├── settlements_settlement             imports_importrow
    │                                       ├── expenses_expense
    └── audit_auditlog                      └── settlements_settlement
```
