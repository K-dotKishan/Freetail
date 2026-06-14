"""
CSV Parser: reads the raw CSV and normalizes field names/types.
Does NOT validate — that's the validators' job.
"""
import csv
import io
from decimal import Decimal, InvalidOperation


EXPECTED_COLUMNS = [
    'date', 'description', 'paid_by', 'amount',
    'currency', 'split_type', 'split_with', 'split_details', 'notes'
]


def parse_csv(file_content: str) -> list[dict]:
    """
    Parse CSV content into a list of raw row dicts.
    Returns list of {'row_number': int, 'raw': dict}
    """
    reader = csv.DictReader(io.StringIO(file_content))
    rows = []
    for i, row in enumerate(reader, start=2):  # row 1 is header
        raw = {k.strip().lower(): v.strip() if v else '' for k, v in row.items()}
        rows.append({'row_number': i, 'raw': raw})
    return rows


def parse_amount(value: str) -> tuple[Decimal | None, str | None]:
    """
    Parse an amount string.
    Handles: '1,200', '899.995', '0', '-30', '"1,200"'
    Returns (Decimal, None) on success or (None, error_msg) on failure.
    """
    if not value:
        return None, 'Amount is empty'
    cleaned = value.replace(',', '').replace('"', '').strip()
    try:
        amount = Decimal(cleaned)
        # Round to 2 decimal places (banker's rounding)
        return amount.quantize(Decimal('0.01')), None
    except InvalidOperation:
        return None, f"Cannot parse amount: '{value}'"


def parse_split_details(details_str: str, split_type: str) -> list[dict]:
    """
    Parse split_details field into structured list.
    Examples:
      'Rohan 700; Priya 400; Meera 400'   -> [{name, value}, ...]
      'Aisha 30%; Rohan 30%; Priya 30%; Meera 20%' -> [{name, value}, ...]
      'Aisha 1; Rohan 2; Priya 1; Dev 2'  -> [{name, value}, ...]
    """
    if not details_str:
        return []
    parts = [p.strip() for p in details_str.split(';') if p.strip()]
    result = []
    for part in parts:
        tokens = part.rsplit(' ', 1)  # split on last space
        if len(tokens) == 2:
            name = tokens[0].strip()
            raw_val = tokens[1].strip().rstrip('%')
            try:
                value = Decimal(raw_val)
                result.append({'name': name, 'value': value})
            except InvalidOperation:
                result.append({'name': name, 'value': None, 'parse_error': raw_val})
        else:
            result.append({'name': part, 'value': None})
    return result


def parse_members(split_with: str) -> list[str]:
    """Parse semicolon-separated member list, normalizing names."""
    if not split_with:
        return []
    return [m.strip() for m in split_with.split(';') if m.strip()]
