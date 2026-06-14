from django.db import models
from django.conf import settings


class Group(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_groups',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    default_currency = models.CharField(max_length=3, default='INR')

    def __str__(self):
        return self.name

    def active_members(self, as_of=None):
        """Return users who are active members, optionally as of a specific date."""
        qs = self.memberships.filter(left_at__isnull=True)
        if as_of:
            qs = self.memberships.filter(
                joined_at__lte=as_of,
            ).filter(
                models.Q(left_at__isnull=True) | models.Q(left_at__gt=as_of)
            )
        return [m.user for m in qs.select_related('user')]


class Membership(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    joined_at = models.DateField()
    left_at = models.DateField(null=True, blank=True)
    # For guests/visitors who are not registered users
    guest_name = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ('group', 'user')
        ordering = ['joined_at']

    def __str__(self):
        status = f"left {self.left_at}" if self.left_at else "active"
        name = self.user.effective_name if self.user_id else self.guest_name
        return f"{name} in {self.group.name} ({status})"

    def is_active_on(self, date):
        if self.joined_at > date:
            return False
        if self.left_at and self.left_at <= date:
            return False
        return True
