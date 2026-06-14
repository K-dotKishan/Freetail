"""
Balance calculation service.

Core logic:
- For each expense, the payer is owed the total amount_inr.
- Each participant (split) owes their owed_amount.
- Net balance per user = sum(paid) - sum(owed)
- Positive balance = others owe you; negative = you owe others.

Settlement simplification uses a greedy min-max approach.
"""
from decimal import Decimal
from collections import defaultdict

from apps.expenses.models import Expense, ExpenseSplit
from apps.settlements.models import Settlement


def calculate_balances(group):
    """
    Returns:
      balances: {user_id: Decimal net_balance}
      user_names: {user_id: str}
      expense_breakdown: {user_id: [list of (expense_id, description, date, amount, role)]}
    """
    balances = defaultdict(Decimal)
    user_names = {}
    expense_breakdown = defaultdict(list)

    # Collect all non-deleted expenses in the group
    expenses = (
        Expense.objects
        .filter(group=group, is_deleted=False)
        .prefetch_related('splits__user', 'splits')
        .select_related('paid_by')
    )

    for expense in expenses:
        # Credit the payer
        if expense.paid_by_id:
            uid = expense.paid_by_id
            balances[uid] += expense.amount_inr
            user_names[uid] = expense.paid_by.effective_name
            expense_breakdown[uid].append({
                'expense_id': expense.id,
                'description': expense.description,
                'date': str(expense.date),
                'amount': float(expense.amount_inr),
                'role': 'paid',
                'currency': expense.currency,
                'original_amount': float(expense.amount),
            })

        # Debit each participant their share
        for split in expense.splits.all():
            if split.user_id:
                uid = split.user_id
                balances[uid] -= split.owed_amount
                user_names[uid] = split.user.effective_name
                expense_breakdown[uid].append({
                    'expense_id': expense.id,
                    'description': expense.description,
                    'date': str(expense.date),
                    'amount': float(split.owed_amount),
                    'role': 'owes',
                    'currency': expense.currency,
                    'original_amount': float(expense.amount),
                })

    # Apply settlements
    settlements = Settlement.objects.filter(group=group)
    for s in settlements:
        if s.payer_id:
            balances[s.payer_id] -= s.amount
        if s.payee_id:
            balances[s.payee_id] += s.amount

    return dict(balances), user_names, dict(expense_breakdown)


def simplify_debts(balances):
    """
    Given a dict of {user_id: net_balance}, produce the minimum set of
    transactions to settle all debts.

    Returns list of {'from_user': id, 'to_user': id, 'amount': Decimal}
    """
    # Separate creditors (positive) and debtors (negative)
    creditors = sorted(
        [(uid, bal) for uid, bal in balances.items() if bal > Decimal('0.01')],
        key=lambda x: -x[1]
    )
    debtors = sorted(
        [(uid, -bal) for uid, bal in balances.items() if bal < Decimal('-0.01')],
        key=lambda x: -x[1]
    )

    transactions = []
    i, j = 0, 0

    creditors = list(creditors)
    debtors = list(debtors)

    while i < len(creditors) and j < len(debtors):
        cred_id, cred_amt = creditors[i]
        debt_id, debt_amt = debtors[j]

        transfer = min(cred_amt, debt_amt)
        transfer = transfer.quantize(Decimal('0.01'))

        if transfer > Decimal('0'):
            transactions.append({
                'from_user': debt_id,
                'to_user': cred_id,
                'amount': transfer,
            })

        cred_amt -= transfer
        debt_amt -= transfer

        if cred_amt <= Decimal('0.01'):
            i += 1
        else:
            creditors[i] = (cred_id, cred_amt)

        if debt_amt <= Decimal('0.01'):
            j += 1
        else:
            debtors[j] = (debt_id, debt_amt)

    return transactions
