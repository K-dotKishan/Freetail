"""
Seed script: creates demo users and a demo group.
Run: python manage.py shell < seed_data.py
Or: python seed_data.py (with DJANGO_SETTINGS_MODULE set)
"""
import os, sys, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from apps.groups.models import Group, Membership
from datetime import date

User = get_user_model()

USERS = [
    {'username': 'aisha',  'display_name': 'Aisha',  'email': 'aisha@flat5b.com',  'password': 'password123'},
    {'username': 'rohan',  'display_name': 'Rohan',  'email': 'rohan@flat5b.com',  'password': 'password123'},
    {'username': 'priya',  'display_name': 'Priya',  'email': 'priya@flat5b.com',  'password': 'password123'},
    {'username': 'meera',  'display_name': 'Meera',  'email': 'meera@flat5b.com',  'password': 'password123'},
    {'username': 'sam',    'display_name': 'Sam',    'email': 'sam@flat5b.com',    'password': 'password123'},
    {'username': 'dev',    'display_name': 'Dev',    'email': 'dev@flat5b.com',    'password': 'password123'},
]

created_users = {}
for u_data in USERS:
    user, created = User.objects.get_or_create(
        username=u_data['username'],
        defaults={
            'display_name': u_data['display_name'],
            'email': u_data['email'],
        }
    )
    if created:
        user.set_password(u_data['password'])
        user.save()
        print(f"Created user: {user.username}")
    else:
        print(f"User exists: {user.username}")
    created_users[u_data['username']] = user

# Create the main group
group, created = Group.objects.get_or_create(
    name='Flat 5B',
    defaults={
        'description': 'Our shared flat expenses',
        'created_by': created_users['aisha'],
        'default_currency': 'INR',
    }
)
if created:
    print("Created group: Flat 5B")

# Add members with correct join/leave dates
memberships = [
    ('aisha', date(2026, 2, 1), None),
    ('rohan', date(2026, 2, 1), None),
    ('priya', date(2026, 2, 1), None),
    ('meera', date(2026, 2, 1), date(2026, 3, 31)),
    ('sam',   date(2026, 4, 8), None),
]
for username, joined, left in memberships:
    user = created_users[username]
    m, created = Membership.objects.get_or_create(
        group=group, user=user,
        defaults={'joined_at': joined, 'left_at': left}
    )
    if not created:
        m.joined_at = joined
        m.left_at = left
        m.save()
    print(f"  Membership: {username} joined {joined}, left {left}")

print("\nSeed complete!")
print("Group ID:", group.id)
print("Users: aisha, rohan, priya, meera, sam, dev — all password: password123")
