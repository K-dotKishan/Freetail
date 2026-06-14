from django.db import models
from django.conf import settings
from decimal import Decimal


class Settlement(models.Model):
    """
    Records a payment made by payer to payee to settle a debt.
    This reduces the payer's debt / payee's credit.
    """
    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='settlements'
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='settlements_paid'
    )
    payee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='settlements_received'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='settlements_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        payer_name = self.payer.effective_name if self.payer else 'Unknown'
        payee_name = self.payee.effective_name if self.payee else 'Unknown'
        return f"{payer_name} paid {payee_name} ₹{self.amount} on {self.date}"
