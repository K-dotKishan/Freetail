from django.db import models
from django.conf import settings
from decimal import Decimal


SPLIT_TYPES = [
    ('equal', 'Equal'),
    ('unequal', 'Unequal (fixed amounts)'),
    ('percentage', 'Percentage'),
    ('share', 'Share-based'),
]

CURRENCIES = [
    ('INR', 'Indian Rupee'),
    ('USD', 'US Dollar'),
]


class Expense(models.Model):
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='expenses'
    )
    description = models.CharField(max_length=500)
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR', choices=CURRENCIES)
    # Exchange rate at time of entry (for non-default currencies)
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=4, default=Decimal('1.0000'),
        help_text="Rate to convert currency to group default (INR)"
    )
    # amount_inr = amount * exchange_rate, stored for fast balance queries
    amount_inr = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))

    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='expenses_paid', blank=True
    )
    # For unregistered payers (e.g., guests)
    paid_by_name = models.CharField(max_length=100, blank=True)

    split_type = models.CharField(max_length=20, choices=SPLIT_TYPES, default='equal')
    notes = models.TextField(blank=True)

    # Import metadata
    imported_from = models.ForeignKey(
        'imports.ImportBatch', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses'
    )
    is_deleted = models.BooleanField(default=False)  # soft delete for audit trail

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='expenses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.date} - {self.description} ({self.amount} {self.currency})"

    def save(self, *args, **kwargs):
        # Keep amount_inr in sync
        self.amount_inr = (self.amount * self.exchange_rate).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    @property
    def payer_name(self):
        if self.paid_by:
            return self.paid_by.effective_name
        return self.paid_by_name or 'Unknown'


class ExpenseSplit(models.Model):
    """
    One row per participant in an expense.
    owed_amount: how much this participant owes for this expense (in INR).
    """
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='expense_splits', blank=True
    )
    # For guests not in the system
    participant_name = models.CharField(max_length=100, blank=True)
    owed_amount = models.DecimalField(max_digits=12, decimal_places=2)
    # Raw split input (share count, percentage, or fixed amount)
    split_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)

    class Meta:
        unique_together = ('expense', 'user')

    def __str__(self):
        name = self.user.effective_name if self.user else self.participant_name
        return f"{name} owes {self.owed_amount} for {self.expense.description}"

    @property
    def member_name(self):
        if self.user:
            return self.user.effective_name
        return self.participant_name
