import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()
from django.db import connection

path = os.path.join(os.getcwd(), 'db.sqlite3')
print('DB exists:', os.path.exists(path))
with connection.cursor() as c:
    c.execute('SELECT id, total_amount, amount_paid, typeof(total_amount), typeof(amount_paid) FROM payments_payment WHERE tenant_id = 1')
    for row in c.fetchall():
        print('RAW', row)
        for i, val in enumerate(row):
            print('  idx', i, 'type', type(val), 'repr', repr(val))
