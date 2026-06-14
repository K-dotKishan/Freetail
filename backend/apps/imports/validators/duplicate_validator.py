"""
Duplicate validator: detects likely duplicate rows within the import batch
and against existing expenses in the database.
"""
from decimal import Decimal


def detect_duplicates_in_batch(parsed_rows: list) -> list:
    """
    Detect duplicate rows within the batch itself.
    A duplicate is a row where (date, description_normalized, amount) match another row.

    Marks rows with anomaly and returns the list with duplicates flagged.
    Also handles the special case of near-duplicate dinner entries
    (same description ~, same date, slightly different amounts).
    """
    # Build signature map
    seen = {}  # signature -> row index
    for idx, row in enumerate(parsed_rows):
        pd = row.get('parsed_data', {})
        date = pd.get('date', '')
        desc = (pd.get('description') or '').strip().lower()
        amount = pd.get('amount')

        # Normalize description for fuzzy matching
        desc_normalized = _normalize_description(desc)
        signature = (str(date), desc_normalized, str(amount))

        if signature in seen:
            prev_idx = seen[signature]
            # Mark both as duplicates
            _add_anomaly(row, {
                'code': 'duplicate_row',
                'message': (
                    f"This row appears to be an exact duplicate of row {parsed_rows[prev_idx]['row_number']}. "
                    "Policy: reject this row, keep the earlier one."
                ),
                'severity': 'error',
                'duplicate_of_row': parsed_rows[prev_idx]['row_number'],
                'policy': 'reject',
            })
            # Auto-set decision to reject for exact duplicates
            row['auto_decision'] = 'reject'
        else:
            seen[signature] = idx

    # Second pass: near-duplicate detection (same dinner, different amounts)
    # e.g. "Dinner at Thalassa" (Aisha, 2400) and "Thalassa dinner" (Rohan, 2450)
    date_desc_groups = {}
    for idx, row in enumerate(parsed_rows):
        pd = row.get('parsed_data', {})
        date = pd.get('date', '')
        desc = (pd.get('description') or '').strip().lower()
        desc_core = _get_description_core(desc)
        key = (str(date), desc_core)
        if key not in date_desc_groups:
            date_desc_groups[key] = []
        date_desc_groups[key].append(idx)

    for key, indices in date_desc_groups.items():
        if len(indices) > 1:
            # Check if they look like the same event
            rows_in_group = [parsed_rows[i] for i in indices]
            amounts = [r['parsed_data'].get('amount') for r in rows_in_group]
            payers = [r['parsed_data'].get('paid_by_name', '') for r in rows_in_group]

            # If same payer exact dup already caught above, skip
            if len(set(str(a) for a in amounts)) == 1 and len(set(payers)) == 1:
                continue  # exact dup, already handled

            # Different payers logging same event
            for i, row in enumerate(rows_in_group):
                if not any(a['code'] == 'near_duplicate_row' for a in row.get('anomalies', [])):
                    other_rows = [r for j, r in enumerate(rows_in_group) if j != i]
                    other_desc = ', '.join(
                        f"row {r['row_number']} ({r['parsed_data'].get('description', '')} "
                        f"by {r['parsed_data'].get('paid_by_name', '')} "
                        f"for {r['parsed_data'].get('amount', '')})"
                        for r in other_rows
                    )
                    _add_anomaly(row, {
                        'code': 'near_duplicate_row',
                        'message': (
                            f"Possible duplicate entry for same event on same date. "
                            f"Similar row(s): {other_desc}. "
                            "Policy: flag for user review. Keep the row with the highest amount (payer likely most accurate)."
                        ),
                        'severity': 'warning',
                        'policy': 'flag_for_review',
                    })

    return parsed_rows


def _normalize_description(desc: str) -> str:
    """Strip common words for near-duplicate detection."""
    stopwords = {'at', 'the', '-', 'order', 'dinner', 'lunch'}
    words = desc.lower().split()
    return ' '.join(w for w in words if w not in stopwords)


def _get_description_core(desc: str) -> str:
    """Extract key noun-like words from description for grouping."""
    # Very simple: take alphabetic tokens longer than 3 chars
    import re
    tokens = re.findall(r'[a-z]{4,}', desc.lower())
    return ' '.join(sorted(tokens))  # Sort to catch reorderings


def _add_anomaly(row: dict, anomaly: dict):
    if 'anomalies' not in row:
        row['anomalies'] = []
    row['anomalies'].append(anomaly)
    row['has_anomaly'] = True
