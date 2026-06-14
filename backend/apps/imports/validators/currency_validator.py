"""
Currency validator: flags missing currency, unknown currencies.
"""
SUPPORTED_CURRENCIES = {'INR', 'USD'}
DEFAULT_CURRENCY = 'INR'


def validate_currency(currency_str: str, group_default: str = DEFAULT_CURRENCY) -> dict:
    """
    Returns:
      {
        'parsed': str currency code,
        'anomalies': list,
        'is_valid': bool,
      }
    """
    anomalies = []
    if not currency_str or not currency_str.strip():
        anomalies.append({
            'code': 'missing_currency',
            'message': f"Currency is missing. Defaulting to '{group_default}'.",
            'severity': 'warning',
        })
        return {'parsed': group_default, 'anomalies': anomalies, 'is_valid': True}

    normalized = currency_str.strip().upper()
    if normalized not in SUPPORTED_CURRENCIES:
        anomalies.append({
            'code': 'unsupported_currency',
            'message': f"Currency '{currency_str}' is not supported. Defaulting to '{group_default}'.",
            'severity': 'error',
        })
        return {'parsed': group_default, 'anomalies': anomalies, 'is_valid': False}

    return {'parsed': normalized, 'anomalies': anomalies, 'is_valid': True}
