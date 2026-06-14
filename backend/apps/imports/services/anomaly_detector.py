"""
Anomaly detector: orchestrates all validators on a parsed row and
applies the policy decisions documented in SCOPE.md / IMPORT_POLICIES.md.

Each anomaly dict:
  code: str (machine-readable)
  message: str (human-readable, shown in UI)
  severity: 'error' | 'warning' | 'info'
  policy: str (what the system does)
  field: str (which CSV field caused it)
"""
from decimal import Decimal
from apps.imports.parsers.csv_parser import (
    parse_amount, parse_split_details, parse_members
)
from apps.imports.validators.date_validator import validate_date
from apps.imports.validators.currency_validator import validate_currency
from apps.imports.validators.member_validator import resolve_name, validate_split_members
from apps.imports.validators.split_validator import validate_split


def detect_anomalies(raw: dict, row_number: int, group=None) -> dict:
    """
    Given one raw CSV row dict, run all validators and return:
    {
      'parsed_data': dict,   # normalized, usable values
      'anomalies': list,     # all detected anomalies
      'has_anomaly': bool,
      'is_settlement': bool, # True if this looks like a settlement
      'auto_decision': str,  # 'accept', 'reject', 'flag' — system suggestion
    }
    """
    anomalies = []
    parsed = {}
    is_settlement = False
    auto_decision = 'accept'

    # 1. DATE
    date_result = validate_date(raw.get('date', ''))
    parsed['date'] = date_result['parsed']
    anomalies.extend([{**a, 'field': 'date'} for a in date_result['anomalies']])
    if not date_result['is_valid']:
        auto_decision = 'flag'

    # 2. DESCRIPTION
    description = raw.get('description', '').strip()
    if not description:
        anomalies.append({
            'code': 'missing_description',
            'message': 'Description is empty.',
            'severity': 'error',
            'field': 'description',
            'policy': 'reject row',
        })
        auto_decision = 'reject'
    parsed['description'] = description

    # 3. PAID_BY
    paid_by_raw = raw.get('paid_by', '').strip()
    if not paid_by_raw:
        anomalies.append({
            'code': 'missing_payer',
            'message': "paid_by is empty — cannot determine who paid. Row flagged for manual review.",
            'severity': 'warning',
            'field': 'paid_by',
            'policy': 'flag for review',
        })
        auto_decision = 'flag'
        parsed['paid_by_name'] = ''
        parsed['paid_by_user'] = None
    else:
        payer_result = resolve_name(paid_by_raw, group)
        parsed['paid_by_name'] = payer_result['canonical_name']
        parsed['paid_by_user'] = payer_result['user']
        parsed['paid_by_is_guest'] = payer_result['is_guest']
        anomalies.extend([{**a, 'field': 'paid_by'} for a in payer_result['anomalies']])

    # 4. AMOUNT
    amount_str = raw.get('amount', '')
    amount, amount_err = parse_amount(amount_str)

    if amount_err:
        anomalies.append({
            'code': 'invalid_amount',
            'message': amount_err,
            'severity': 'error',
            'field': 'amount',
            'policy': 'reject row',
        })
        auto_decision = 'reject'
    elif amount == Decimal('0'):
        anomalies.append({
            'code': 'zero_amount',
            'message': "Amount is 0. This expense has no financial impact. Row will be skipped.",
            'severity': 'warning',
            'field': 'amount',
            'policy': 'reject (zero-value placeholder)',
        })
        auto_decision = 'reject'
    elif amount < Decimal('0'):
        anomalies.append({
            'code': 'negative_amount',
            'message': (
                f"Negative amount ({amount}). Treated as a refund — "
                "splits will reverse the original expense shares."
            ),
            'severity': 'info',
            'field': 'amount',
            'policy': 'accept as refund',
        })
    parsed['amount'] = amount

    # Check for over-precise amount (e.g. 899.995)
    if amount is not None:
        original_str = amount_str.replace(',', '').replace('"', '').strip()
        try:
            original_decimal = Decimal(original_str)
            if original_decimal != amount:
                anomalies.append({
                    'code': 'amount_rounded',
                    'message': (
                        f"Amount '{original_str}' rounded to {amount} (2 decimal places)."
                    ),
                    'severity': 'info',
                    'field': 'amount',
                    'policy': 'accept with rounding',
                })
        except Exception:
            pass

    # 5. CURRENCY
    group_default = group.default_currency if group else 'INR'
    currency_result = validate_currency(raw.get('currency', ''), group_default)
    parsed['currency'] = currency_result['parsed']
    anomalies.extend([{**a, 'field': 'currency'} for a in currency_result['anomalies']])

    # 6. EXCHANGE RATE for non-INR currencies
    from django.conf import settings
    if parsed.get('currency') == 'USD':
        exchange_rate = Decimal(str(getattr(settings, 'USD_TO_INR', 84.0)))
        parsed['exchange_rate'] = exchange_rate
        anomalies.append({
            'code': 'foreign_currency',
            'message': (
                f"Expense is in USD. Converting at 1 USD = ₹{exchange_rate}. "
                "Verify rate is accurate for the transaction date."
            ),
            'severity': 'info',
            'field': 'currency',
            'policy': 'accept with conversion',
        })
    else:
        parsed['exchange_rate'] = Decimal('1.0')

    # 7. SETTLEMENT DETECTION
    # Heuristic: notes say 'settlement', split_type is empty, description mentions 'paid back' etc.
    notes = raw.get('notes', '').lower()
    split_type_raw = raw.get('split_type', '').strip().lower()
    desc_lower = description.lower()
    if (
        'settlement' in notes or 'paid back' in desc_lower or 'paid aisha back' in desc_lower
        or (not split_type_raw and amount and amount > Decimal('0') and 'deposit' not in desc_lower)
    ):
        if 'settlement' in notes or 'paid back' in desc_lower:
            is_settlement = True
            anomalies.append({
                'code': 'settlement_as_expense',
                'message': (
                    "This row appears to be a settlement/payment between members, "
                    "not a shared expense. It will be imported as a Settlement record, not an Expense."
                ),
                'severity': 'warning',
                'field': 'description',
                'policy': 'import as settlement',
            })
            auto_decision = 'flag'  # Require user confirmation

    # Sam deposit: also flag as non-standard expense
    if 'deposit' in desc_lower:
        anomalies.append({
            'code': 'deposit_as_expense',
            'message': (
                "This looks like a security deposit payment, not a shared expense. "
                "It will be imported as-is but flagged — consider recording separately."
            ),
            'severity': 'info',
            'field': 'description',
            'policy': 'accept with flag',
        })

    # 8. SPLIT_WITH + SPLIT_TYPE + SPLIT_DETAILS
    split_with_raw = raw.get('split_with', '')
    member_names = parse_members(split_with_raw)
    members_result = validate_split_members(member_names, group)
    parsed['participants'] = members_result['resolved']
    parsed['participant_names'] = member_names
    anomalies.extend([{**a, 'field': 'split_with'} for a in members_result['anomalies']])

    # Check for Meera in April expenses (she left end of March)
    if parsed.get('date'):
        from datetime import date
        meera_left = date(2026, 3, 31)
        if parsed['date'] > meera_left:
            meera_in_split = any(
                'meera' in n.lower() for n in member_names
            )
            if meera_in_split:
                anomalies.append({
                    'code': 'ex_member_in_split',
                    'message': (
                        "Meera is included in the split but she left the flat on 31-Mar-2026. "
                        "Her share will be removed and redistributed equally among active members."
                    ),
                    'severity': 'warning',
                    'field': 'split_with',
                    'policy': 'remove ex-member from split',
                })
                # Remove Meera from participants
                parsed['participants'] = [
                    p for p in parsed['participants']
                    if 'meera' not in (p.get('canonical_name') or '').lower()
                ]
                parsed['participant_names'] = [
                    n for n in member_names
                    if 'meera' not in n.lower()
                ]

    split_details_raw = raw.get('split_details', '')
    split_details = parse_split_details(split_details_raw, split_type_raw)
    parsed['split_details'] = split_details

    split_result = validate_split(
        split_type_raw,
        split_details,
        member_names,
        parsed.get('amount')
    )
    parsed['split_type'] = split_result['normalized_split_type']
    anomalies.extend([{**a, 'field': 'split_type'} for a in split_result['anomalies']])

    # Normalize percentages if they don't sum to 100
    if parsed['split_type'] == 'percentage' and split_details:
        total_pct = sum(d['value'] for d in split_details if d.get('value') is not None)
        if total_pct > 0 and abs(total_pct - Decimal('100')) > Decimal('0.01'):
            for d in split_details:
                if d.get('value') is not None:
                    d['value'] = (d['value'] / total_pct * Decimal('100')).quantize(Decimal('0.01'))

    parsed['notes'] = raw.get('notes', '').strip()

    has_anomaly = len(anomalies) > 0
    # Errors force a flag or reject
    error_anomalies = [a for a in anomalies if a.get('severity') == 'error']
    if error_anomalies and auto_decision == 'accept':
        auto_decision = 'flag'

    return {
        'parsed_data': parsed,
        'anomalies': anomalies,
        'has_anomaly': has_anomaly,
        'is_settlement': is_settlement,
        'auto_decision': auto_decision,
    }
