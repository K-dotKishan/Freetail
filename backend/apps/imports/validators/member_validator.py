"""
Member validator: resolves CSV name strings to User objects.
Handles: case differences, trailing spaces, aliases, unknown names.
"""
from django.contrib.auth import get_user_model

# Known aliases / name variations from the CSV
# Maps lowercase CSV name -> canonical name
NAME_ALIASES = {
    'priya s': 'priya',       # Row 18-02: 'Priya S' is Priya
    'rohan ': 'rohan',        # Trailing space
    'rohan': 'rohan',
    'priya': 'priya',
    'aisha': 'aisha',
    'meera': 'meera',
    'sam': 'sam',
    'dev': 'dev',
}

# Names that are guests (not registered users) — won't have accounts
KNOWN_GUESTS = {'dev', "dev's friend kabir", 'kabir'}


def resolve_name(name: str, group=None) -> dict:
    """
    Attempt to resolve a CSV name to a User.
    Returns:
      {
        'user': User | None,
        'canonical_name': str,
        'is_guest': bool,
        'anomalies': list,
      }
    """
    User = get_user_model()
    anomalies = []

    if not name or not name.strip():
        return {
            'user': None,
            'canonical_name': '',
            'is_guest': False,
            'anomalies': [{'code': 'missing_payer', 'message': 'Payer name is empty.', 'severity': 'warning'}],
        }

    normalized = name.strip().lower()
    canonical = NAME_ALIASES.get(normalized, normalized)

    if canonical != normalized:
        anomalies.append({
            'code': 'name_normalized',
            'message': f"Name '{name}' normalized to '{canonical}'.",
            'severity': 'info',
        })

    # Check if guest
    is_guest = canonical in KNOWN_GUESTS
    if is_guest:
        return {
            'user': None,
            'canonical_name': canonical.title(),
            'is_guest': True,
            'anomalies': anomalies,
        }

    # Try to find user by display_name or username (case-insensitive)
    users = User.objects.filter(display_name__iexact=canonical) | \
            User.objects.filter(username__iexact=canonical)
    user = users.first()

    if not user:
        anomalies.append({
            'code': 'unknown_member',
            'message': f"Member '{name}' not found in system. Will be stored as name only.",
            'severity': 'warning',
        })

    return {
        'user': user,
        'canonical_name': canonical.title(),
        'is_guest': False,
        'anomalies': anomalies,
    }


def validate_split_members(member_names: list, group=None) -> dict:
    """Resolve all participants in a split."""
    resolved = []
    anomalies = []
    for name in member_names:
        result = resolve_name(name, group)
        resolved.append(result)
        anomalies.extend(result['anomalies'])

    # Check for non-member participants specifically flagged in notes
    guest_names = [r['canonical_name'] for r in resolved if r['is_guest']]
    if guest_names:
        anomalies.append({
            'code': 'guest_participant',
            'message': f"Guest participant(s) in split: {', '.join(guest_names)}. They will be tracked by name only.",
            'severity': 'info',
        })

    return {'resolved': resolved, 'anomalies': anomalies}
