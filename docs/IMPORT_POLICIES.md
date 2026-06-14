# IMPORT_POLICIES.md — Data Import Policies

## Overview

The CSV importer runs every row through 6 validator modules before presenting results for user review.
No data is committed to the database until the user explicitly approves each row.

## Anomaly Severity Levels

| Severity | Meaning | Default Action |
|----------|---------|----------------|
| `error` | Row cannot be safely imported as-is | Flag for mandatory review |
| `warning` | Row can be imported but may have incorrect data | Flag for review |
| `info` | Row imported with an automatic transformation applied | Auto-accept |

## Per-Anomaly Policies

### Duplicate Rows (`duplicate_row`)
- **Detection:** Exact match on (date, normalized_description, amount)
- **Policy:** Auto-reject the second occurrence. Keep the first row.
- **Reasoning:** Same expense cannot be charged twice.

### Near-Duplicate Rows (`near_duplicate_row`)
- **Detection:** Same date, overlapping description keywords (≥4 char tokens, sorted)
- **Policy:** Flag both rows for user review. Recommend keeping higher amount.
- **Reasoning:** Could be the same event logged by two people. Thalassa dinner is the canonical example.

### Missing Payer (`missing_payer`)
- **Policy:** Flag as warning. Row cannot be auto-accepted.
- **Reasoning:** Balance calculation requires knowing who paid.

### Settlement as Expense (`settlement_as_expense`)
- **Policy:** Import as Settlement record, not Expense. Requires user confirmation.
- **Reasoning:** Settlements affect balances differently than expenses — they reduce existing debt.

### Percentage Sum Invalid (`percentage_sum_invalid`)
- **Policy:** Normalize proportionally to 100%. Flag as warning.
- **Reasoning:** Preserves intent (relative proportions) even when absolute numbers are wrong.

### Missing Currency (`missing_currency`)
- **Policy:** Default to group's default currency (INR). Flag as warning.

### Foreign Currency (`foreign_currency`)
- **Policy:** Convert using rate from settings (USD_TO_INR = 84.0). Store original amount + rate. Flag as info.

### Ambiguous Date (`ambiguous_date_format`)
- **Policy:** Use DD-MM-YYYY interpretation (consistent with majority of rows). Flag as info.

### Ex-Member in Split (`ex_member_in_split`)
- **Policy:** Remove ex-member from split. Redistribute their share equally among active members. Flag as warning.

### Zero Amount (`zero_amount`)
- **Policy:** Auto-reject. Zero expenses have no financial impact.

### Negative Amount (`negative_amount`)
- **Policy:** Accept as refund. Splits are reversed (participants receive money back).

### Amount Rounded (`amount_rounded`)
- **Policy:** Round to 2 decimal places. Flag as info.

### Guest Participant (`guest_participant`)
- **Policy:** Accept. Track by name only (no user account required).

### Name Normalized (`name_normalized`)
- **Policy:** Apply canonical name. Flag as info.

### Split Type Conflict (`equal_split_with_details`)
- **Policy:** Use equal split, ignore details (unless details result in equal shares anyway). Flag as info.

## User Approval Flow

1. Upload CSV → system parses and runs all validators
2. User sees full row list with anomalies highlighted
3. User reviews flagged rows individually:
   - ✅ Accept — row will be imported
   - ❌ Reject — row is skipped
   - ✏️ Accept Modified — row is imported with user notes
4. "Accept Clean Rows" button auto-accepts all rows with no anomalies
5. All rows must have a decision before final import
6. After import: downloadable report lists every action taken
