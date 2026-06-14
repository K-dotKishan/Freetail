# SCOPE.md — Anomaly Log & Database Schema

## All CSV Anomalies Detected (19 total)

### 1. Exact Duplicate Row — Marina Bites Dinner
- **Row:** 08-02-2026, "dinner - marina bites", Dev, ₹3200
- **Problem:** Identical to row above (same date, payer, amount, participants)
- **Policy:** Auto-reject the second row. Keep the first (row 4, with notes "Dev visiting for the weekend")

### 2. Near-Duplicate — Thalassa Dinner
- **Rows:** Row 23 (Aisha, ₹2400) and Row 24 (Rohan, ₹2450) — same date, same event
- **Problem:** Two people logged the same dinner with different amounts and different payers
- **Policy:** Flag both for user review. Recommendation: keep the higher amount (₹2450) as the more likely accurate total. Note in anomaly log.

### 3. Amount with Comma — Electricity Feb
- **Row:** 10-02-2026, amount: `"1,200"`
- **Problem:** Amount field contains a thousands separator inside quotes
- **Policy:** Strip commas and quotes, parse as 1200. Accept.

### 4. Over-Precise Amount — Cylinder Refill
- **Row:** 15-02-2026, amount: `899.995`
- **Problem:** Three decimal places — cannot represent in standard currency
- **Policy:** Round to 2dp (₹900.00). Flag as info.

### 5. Missing Payer — House Cleaning Supplies
- **Row:** 22-02-2026, paid_by: empty
- **Problem:** Cannot determine who paid ₹780
- **Policy:** Flag for user review. Row cannot be imported without a payer.

### 6. Settlement Logged as Expense — Rohan Paid Aisha Back
- **Row:** 25-02-2026, "Rohan paid Aisha back", ₹5000
- **Problem:** Notes say "this is a settlement not an expense??" — split_type is empty
- **Policy:** Import as a Settlement record (Rohan → Aisha, ₹5000), not an Expense

### 7. Percentage Sum ≠ 100% — Pizza Friday
- **Row:** 28-02-2026, split: Aisha 30% + Rohan 30% + Priya 30% + Meera 20% = 110%
- **Problem:** Percentages sum to 110%, not 100%
- **Policy:** Normalize proportionally to 100% (each % / 110 × 100). Flag as warning.

### 8. Name Variation — "Priya S" / "priya" / "rohan "
- **Rows:** 18-02-2026 (Priya S), 14-02-2026 (priya), 26th row (rohan with trailing space)
- **Problem:** Case differences and name suffix don't match canonical "Priya" / "Rohan"
- **Policy:** Normalize via alias mapping. "Priya S" → Priya. "priya" → Priya. "rohan " → Rohan. Flag as info.

### 9. Ambiguous Date Format — "Mar-14"
- **Row:** Airport cab, paid by rohan
- **Problem:** Date is "Mar-14" — Mon-DD format, missing year
- **Policy:** Assume year 2026 (consistent with all surrounding data). Parse as 2026-03-14. Flag as warning.

### 10. Ambiguous Date — Deep Cleaning Service
- **Row:** 04-05-2026, "is this April 5 or May 4? format is a mess"
- **Problem:** DD-MM vs MM-DD ambiguity. Notes even acknowledge this.
- **Policy:** Use DD-MM-YYYY consistently (all other dates use this format). Interpret as 4 May 2026. Flag as info.

### 11. Missing Currency — Groceries DMart (Mar 15)
- **Row:** 15-03-2026, currency: empty
- **Problem:** Currency field blank
- **Policy:** Default to group's default currency (INR). Flag as warning.

### 12. Foreign Currency (USD) — Goa Trip Expenses
- **Rows:** Goa villa (USD 540), Beach shack lunch (USD 84), Parasailing (USD 150), Parasailing refund (USD -30)
- **Problem:** CSV has USD amounts but the main ledger is INR. The original CSV treats dollars as rupees.
- **Policy:** Apply conversion at 1 USD = ₹84 (configured in .env). Store original amount + exchange rate. Flag all USD rows as info.

### 13. Guest Participant — Parasailing
- **Row:** 11-03-2026, "Dev's friend Kabir" in split_with
- **Problem:** Kabir is not a registered member of any group
- **Policy:** Include as named participant. Track owed amount by name only (no user account). Flag as info.

### 14. Negative Amount — Parasailing Refund
- **Row:** 12-03-2026, amount: -30 USD
- **Problem:** Negative amount — could be an error or a refund
- **Policy:** Accept as refund. Splits are reversed (each participant receives their proportional share back).

### 15. Zero Amount — Dinner Order Swiggy
- **Row:** 22-03-2026, amount: 0
- **Problem:** Zero-value expense with note "counted twice earlier - fixing later"
- **Policy:** Auto-reject. Zero-value expenses have no financial effect and the note confirms it's a placeholder.

### 16. Ex-Member in Split — April Groceries
- **Row:** 02-04-2026, Meera in split_with despite leaving 31 March
- **Problem:** Meera moved out 31 March. She appears in April splits.
- **Policy:** Remove Meera from the split and redistribute equally among active members (Aisha, Rohan, Priya). Flag as warning.

### 17. Non-Expense — Sam Deposit
- **Row:** 08-04-2026, "Sam deposit share", Sam pays Aisha ₹15000
- **Problem:** This is a security deposit payment, not a shared expense
- **Policy:** Accept as-is but flag. Could be modelled as a settlement (Sam → Aisha). User decides.

### 18. Split Type Conflict — Furniture for Common Room
- **Row:** 18-04-2026, split_type="equal" but split_details also provided (Aisha 1; Rohan 1; Priya 1; Sam 1)
- **Problem:** Contradictory fields — equal split but share values also given (which are all 1, so equivalent)
- **Policy:** Since all share values are equal (1 each), the result is identical. Accept as equal split. Log as info.

### 19. Name Mismatch — "Dev's friend Kabir"
- **Row:** 11-03-2026, Parasailing
- **Problem:** Participant name contains possessive + first name — unusual format
- **Policy:** Parse as guest "Kabir". Track by name only.

---

## Database Schema

### accounts_user
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| username | varchar | login identifier |
| display_name | varchar | shown in UI, matched to CSV names |
| email | varchar | |
| password | hash | bcrypt via Django |

### groups_group
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| name | varchar | |
| description | text | |
| default_currency | varchar(3) | INR / USD |
| created_by | FK → User | |

### groups_membership
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| group | FK → Group | |
| user | FK → User | |
| joined_at | date | membership start |
| left_at | date | NULL = still active |
| guest_name | varchar | for unregistered guests |

### expenses_expense
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| group | FK → Group | |
| description | varchar | |
| date | date | |
| amount | decimal(12,2) | original currency amount |
| currency | varchar(3) | INR or USD |
| exchange_rate | decimal(10,4) | rate to INR at time of entry |
| amount_inr | decimal(12,2) | amount × exchange_rate (computed) |
| paid_by | FK → User (nullable) | NULL for missing payer |
| paid_by_name | varchar | fallback for unregistered payers |
| split_type | enum | equal/unequal/percentage/share |
| notes | text | |
| imported_from | FK → ImportBatch (nullable) | |
| is_deleted | bool | soft delete |

### expenses_expensesplit
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| expense | FK → Expense | |
| user | FK → User (nullable) | NULL for guests |
| participant_name | varchar | fallback name |
| owed_amount | decimal(12,2) | this person's share in INR |
| split_value | decimal(10,4) | raw input (%, share count, or amount) |

### settlements_settlement
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| group | FK → Group | |
| payer | FK → User | who sent money |
| payee | FK → User | who received money |
| amount | decimal(12,2) | |
| date | date | |
| notes | text | |

### imports_importbatch
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| group | FK → Group | |
| uploaded_by | FK → User | |
| file_name | varchar | |
| status | enum | pending_review/approved/rejected/partial |
| total_rows | int | |
| valid_rows | int | |
| anomaly_count | int | |

### imports_importrow
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| batch | FK → ImportBatch | |
| row_number | int | CSV row number |
| raw_data | JSON | original CSV values |
| parsed_data | JSON | cleaned/normalized values |
| anomalies | JSON | list of anomaly dicts |
| has_anomaly | bool | |
| decision | enum | pending/accept/reject/accept_modified |
| expense | FK → Expense (nullable) | created after approval |
| settlement | FK → Settlement (nullable) | |

### audit_auditlog
| Field | Type | Notes |
|-------|------|-------|
| id | PK | |
| user | FK → User | |
| action | enum | created/updated/deleted/imported/approved/rejected |
| model_name | varchar | |
| object_id | int | |
| description | text | |
| extra_data | JSON | |
| timestamp | datetime | auto |
