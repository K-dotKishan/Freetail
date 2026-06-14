"""
Approval service: takes user decisions on ImportRows and creates
Expense / Settlement objects accordingly.
"""
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.imports.models import ImportBatch, ImportRow
from apps.expenses.models import Expense, ExpenseSplit
from apps.settlements.models import Settlement
from apps.audit.services import log_action

User = get_user_model()


def apply_decisions(batch_id: int, decisions: list, approved_by) -> dict:
    """
    decisions: list of {row_id, decision, notes}
    Returns summary of what was created.
    """
    batch = ImportBatch.objects.get(id=batch_id)
    created_expenses = []
    created_settlements = []
    rejected_rows = []
    errors = []

    for dec in decisions:
        row = ImportRow.objects.get(id=dec['row_id'], batch=batch)
        row.decision = dec['decision']
        row.decision_notes = dec.get('notes', '')
        row.save()

    # Now process all accepted rows
    accepted_rows = ImportRow.objects.filter(
        batch=batch,
        decision__in=['accept', 'accept_modified'],
    ).order_by('row_number')

    for row in accepted_rows:
        try:
            pd = row.parsed_data
            if pd.get('is_settlement'):
                settlement = _create_settlement(pd, batch, approved_by)
                row.settlement = settlement
                row.save()
                created_settlements.append(row.id)
            else:
                expense = _create_expense(pd, batch, approved_by)
                row.expense = expense
                row.save()
                created_expenses.append(row.id)
        except Exception as e:
            errors.append({'row_id': row.id, 'error': str(e)})

    # Update batch status
    rejected = ImportRow.objects.filter(batch=batch, decision='reject').count()
    pending = ImportRow.objects.filter(batch=batch, decision='pending').count()
    if pending > 0:
        batch.status = 'partial'
    elif rejected == batch.total_rows:
        batch.status = 'rejected'
    else:
        batch.status = 'approved'
    batch.approved_at = timezone.now()
    batch.save()

    log_action(
        approved_by, 'approved', 'ImportBatch', batch.id,
        f"Approved import batch #{batch.id}: "
        f"{len(created_expenses)} expenses, {len(created_settlements)} settlements, "
        f"{len(errors)} errors."
    )

    return {
        'batch_id': batch.id,
        'created_expenses': len(created_expenses),
        'created_settlements': len(created_settlements),
        'rejected': rejected,
        'errors': errors,
    }


def _create_expense(pd: dict, batch: ImportBatch, created_by) -> Expense:
    from datetime import date as date_type
    date_val = pd.get('date')
    if isinstance(date_val, str):
        from datetime import datetime
        date_val = datetime.strptime(date_val, '%Y-%m-%d').date()

    paid_by = None
    if pd.get('paid_by_user_id'):
        try:
            paid_by = User.objects.get(id=pd['paid_by_user_id'])
        except User.DoesNotExist:
            pass

    amount = Decimal(str(pd.get('amount') or '0'))
    exchange_rate = Decimal(str(pd.get('exchange_rate') or '1.0'))

    expense = Expense.objects.create(
        group=batch.group,
        description=pd.get('description', ''),
        date=date_val,
        amount=amount,
        currency=pd.get('currency', 'INR'),
        exchange_rate=exchange_rate,
        paid_by=paid_by,
        paid_by_name=pd.get('paid_by_name', '') if not paid_by else '',
        split_type=pd.get('split_type', 'equal'),
        notes=pd.get('notes', ''),
        imported_from=batch,
        created_by=created_by,
    )

    # Create splits
    participants = pd.get('participants', [])
    split_details = pd.get('split_details', [])
    split_type = pd.get('split_type', 'equal')
    total_inr = expense.amount_inr
    n = len(participants)

    if n == 0:
        return expense

    split_detail_map = {d['name'].lower(): Decimal(str(d['value'])) for d in split_details if d.get('value')}

    for idx, p in enumerate(participants):
        user = None
        if p.get('user_id'):
            try:
                user = User.objects.get(id=p['user_id'])
            except User.DoesNotExist:
                pass

        name = p.get('canonical_name', '')
        owed = _calculate_share(split_type, total_inr, n, idx, name, split_detail_map, exchange_rate)

        ExpenseSplit.objects.create(
            expense=expense,
            user=user,
            participant_name=name if not user else '',
            owed_amount=owed,
            split_value=split_detail_map.get(name.lower()),
        )

    return expense


def _calculate_share(split_type, total_inr, n, idx, name, split_detail_map, exchange_rate):
    name_lower = name.lower()
    if split_type == 'equal':
        each = (total_inr / n).quantize(Decimal('0.01'))
        remainder = total_inr - each * n
        return each + (remainder if idx == 0 else Decimal('0'))
    elif split_type == 'unequal':
        raw_val = split_detail_map.get(name_lower, Decimal('0'))
        return (raw_val * exchange_rate).quantize(Decimal('0.01'))
    elif split_type == 'percentage':
        pct = split_detail_map.get(name_lower, Decimal('0'))
        return (total_inr * pct / Decimal('100')).quantize(Decimal('0.01'))
    elif split_type == 'share':
        total_shares = sum(split_detail_map.values()) if split_detail_map else Decimal(n)
        if total_shares == 0:
            total_shares = Decimal(n)
        share = split_detail_map.get(name_lower, Decimal('1'))
        return (total_inr * share / total_shares).quantize(Decimal('0.01'))
    else:
        each = (total_inr / n).quantize(Decimal('0.01'))
        return each


def _create_settlement(pd: dict, batch: ImportBatch, created_by) -> Settlement:
    from datetime import datetime
    date_val = pd.get('date')
    if isinstance(date_val, str):
        date_val = datetime.strptime(date_val, '%Y-%m-%d').date()

    payer = None
    if pd.get('paid_by_user_id'):
        try:
            payer = User.objects.get(id=pd['paid_by_user_id'])
        except User.DoesNotExist:
            pass

    # Payee is the first participant (who received the payment)
    payee = None
    participants = pd.get('participants', [])
    if participants and participants[0].get('user_id'):
        try:
            payee = User.objects.get(id=participants[0]['user_id'])
        except User.DoesNotExist:
            pass

    return Settlement.objects.create(
        group=batch.group,
        payer=payer,
        payee=payee,
        amount=Decimal(str(pd.get('amount') or '0')),
        date=date_val,
        notes=pd.get('notes', '') + ' [imported from CSV]',
        created_by=created_by,
    )
