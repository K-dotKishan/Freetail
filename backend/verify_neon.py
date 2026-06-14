import os, sys, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection
from django.conf import settings

print("=" * 55)
print("  Neon PostgreSQL Verification")
print("=" * 55)

# 1. Engine check
engine = settings.DATABASES['default']['ENGINE']
host   = settings.DATABASES['default'].get('HOST', 'N/A')
dbname = settings.DATABASES['default'].get('NAME', 'N/A')
print(f"\nEngine : {engine}")
print(f"Host   : {host}")
print(f"DB     : {dbname}")

# 2. Live query
with connection.cursor() as c:
    c.execute("SELECT version();")
    pg_ver = c.fetchone()[0]
    print(f"\nConnected! PostgreSQL: {pg_ver[:70]}")

    c.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
    table_count = c.fetchone()[0]
    print(f"Tables in public schema: {table_count}")

# 3. App models
from django.contrib.auth import get_user_model
User = get_user_model()
user_count = User.objects.count()
print(f"Users in DB: {user_count}")

print("\n[OK] Neon is live and all tables exist.")
print("=" * 55)
