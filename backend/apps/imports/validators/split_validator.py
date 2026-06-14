"""
Split validator: checks that split_details are internally consistent.
"""
from decimal import Decimal, InvalidOperation


VALID_SPLIT_TYPES = {'equal', 'unequal', 'percentage', 'share'}


def validate_split(split_type: str, split_details: list, members: list, amount: Decimal) -> dict:
    """
    Validate the split configuration for an expense.

    split_details: parsed list from csv_parser.parse_split_details()
    members: list of member names from split_with
    amount: the expense amount (in original currency)

    Returns:
      {
        'is_valid': bool,
        'anomalies': list,
        'normalized_split_type': str,
      }
    """
    anomalies = []
    normalized_type = (split_type or '').strip().lower()

    if not normalized_type:
        anomalies.append({
            'code': 'missing_split_type',
            'message': 'split_type is empty. Defaulting to "equal".',
            'severity': 'warning',
        })
        normalized_type = 'equal'

    if normalized_type not in VALID_SPLIT_TYPES:
        anomalies.append({
            'code': 'invalid_split_type',
            'message': f"Unknown split_type '{split_type}'. Defaulting to 'equal'.",
            'severity': 'warning',
        })
        normalized_type = 'equal'

    if normalized_type == 'percentage' and split_details:
        total_pct = sum(
            d['value'] for d in split_details if d.get('value') is not None
        )
        if abs(total_pct - Decimal('100')) > Decimal('1'):
            anomalies.append({
                'code': 'percentage_sum_invalid',
                'message': (
                    f"Percentages sum to {total_pct}%, not 100%. "
                    "Will normalize proportionally to 100%."
                ),
                'severity': 'warning',
            })

    if normalized_type == 'unequal' and split_details:
        total_stated = sum(
            d['value'] for d in split_details if d.get('value') is not None
        )
        if amount and abs(total_stated - amount) > Decimal('1'):
            anomalies.append({
                'code': 'unequal_sum_mismatch',
                'message': (
                    f"Unequal split amounts sum to {total_stated} "
                    f"but expense amount is {amount}. Difference: {amount - total_stated}."
                ),
                'severity': 'warning',
            })

    # Check for conflict: split_type='equal' but split_details also provided
    if normalized_type == 'equal' and split_details:
        anomalies.append({
            'code': 'equal_split_with_details',
            'message': 'split_type is "equal" but split_details are also present. Ignoring split_details, using equal split.',
            'severity': 'info',
        })

    return {
        'is_valid': len([a for a in anomalies if a['severity'] == 'error']) == 0,
        'anomalies': anomalies,
        'normalized_split_type': normalized_type,
    }
