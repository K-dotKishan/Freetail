from django.db import models
from django.conf import settings


class ImportBatch(models.Model):
    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('partial', 'Partially Approved'),
    ]

    group = models.ForeignKey(
        'groups.Group', on_delete=models.CASCADE, related_name='import_batches'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    total_rows = models.IntegerField(default=0)
    valid_rows = models.IntegerField(default=0)
    anomaly_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Import #{self.id} - {self.file_name} ({self.status})"


class ImportRow(models.Model):
    """
    Each row parsed from the CSV before approval.
    Stores the raw data + parsed data + anomalies found.
    """
    DECISION_CHOICES = [
        ('pending', 'Pending User Review'),
        ('accept', 'Accept'),
        ('reject', 'Reject'),
        ('accept_modified', 'Accept with Modification'),
    ]

    batch = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, related_name='rows')
    row_number = models.IntegerField()
    raw_data = models.JSONField()          # Original CSV values
    parsed_data = models.JSONField(default=dict)  # Cleaned/normalized values
    anomalies = models.JSONField(default=list)     # List of anomaly dicts
    has_anomaly = models.BooleanField(default=False)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, default='pending')
    decision_notes = models.TextField(blank=True)
    # Link to the created expense after approval
    expense = models.ForeignKey(
        'expenses.Expense', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='import_row'
    )
    # Link if this was detected as a settlement
    settlement = models.ForeignKey(
        'settlements.Settlement', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='import_row'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['row_number']

    def __str__(self):
        return f"Row {self.row_number} of batch #{self.batch_id} ({self.decision})"
