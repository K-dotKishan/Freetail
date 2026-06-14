"""
Date validator: handles multiple date formats and flags ambiguous dates.
"""
from datetime import date
from dateutil import parser as dateutil_parser
import re


# Known date formats in the CSV
DATE_FORMATS_PRIORITY = [
    '%d-%m-%Y',   # 01-02-2026  ← primary format used in this CSV
    '%Y-%m-%d',
    '%d/%m/%Y',
    '%m/%d/%Y',
]


def _try_formats(date_str: str):
    from datetime import datetime
    for fmt in DATE_FORMATS_PRIORITY:
        try:
            return datetime.strptime(date_str, fmt).date(), fmt, None
        except ValueError:
            continue
    return None, None, None


def validate_date(date_str: str) -> dict:
    """
    Returns:
      {
        'parsed': date | None,
        'anomalies': list of anomaly dicts,
        'is_valid': bool,
      }
    """
    anomalies = []
    if not date_str:
        return {'parsed': None, 'anomalies': [_anomaly('missing_date', 'Date field is empty', 'error')], 'is_valid': False}

    # Check for Mon-DD pattern like "Mar-14"
    month_abbr_match = re.match(r'^([A-Za-z]{3})-(\d{1,2})$', date_str.strip())
    if month_abbr_match:
        month_str = month_abbr_match.group(1)
        day_str = month_abbr_match.group(2)
        anomalies.append(_anomaly(
            'ambiguous_date_format',
            f"Date '{date_str}' uses Mon-DD format — year assumed to be 2026.",
            'warning'
        ))
        try:
            from datetime import datetime
            # Assume 2026 since all data is from that year
            parsed = datetime.strptime(f"{day_str}-{month_str}-2026", '%d-%b-%Y').date()
            return {'parsed': parsed, 'anomalies': anomalies, 'is_valid': True}
        except ValueError:
            return {'parsed': None, 'anomalies': [_anomaly('invalid_date', f"Cannot parse date: '{date_str}'", 'error')], 'is_valid': False}

    # Try standard formats
    parsed, fmt, _ = _try_formats(date_str.strip())
    if parsed:
        # Check if date is ambiguously MM-DD-YYYY vs DD-MM-YYYY
        # e.g. 04-05-2026: could be April 5 or May 4
        parts = re.split(r'[-/]', date_str.strip())
        if len(parts) == 3:
            p1, p2 = int(parts[0]), int(parts[1])
            if p1 <= 12 and p2 <= 12 and p1 != p2:
                anomalies.append(_anomaly(
                    'ambiguous_date_format',
                    f"Date '{date_str}' could be DD-MM or MM-DD. Interpreted as DD-MM-YYYY ({parsed}).",
                    'info'
                ))
        return {'parsed': parsed, 'anomalies': anomalies, 'is_valid': True}

    return {
        'parsed': None,
        'anomalies': [_anomaly('invalid_date', f"Cannot parse date: '{date_str}'", 'error')],
        'is_valid': False,
    }


def _anomaly(code, message, severity):
    return {'code': code, 'message': message, 'severity': severity}
