from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Extended user model. The username is the canonical identifier;
    display_name is used for matching CSV names (case-insensitive).
    """
    display_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.display_name or self.username

    @property
    def effective_name(self):
        return self.display_name or self.username
