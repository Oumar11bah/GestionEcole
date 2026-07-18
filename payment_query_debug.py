import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()
from django.db import connection
from payments.models import Payment

for p in Payment.objects.filter(tenant_id=1).only('id','total_amount','amount_paid'):
    print('PAYMENT', p.id, repr(p.total_amount), type(p.total_amount), repr(p.amount_paid), type(p.amount_paid))

# raw SQL inspect
with connection.cursor() as c:
    c.execute('SELECT id, total_amount, amount_paid FROM payments_payment WHERE tenant_id = 1')
    for row in c.fetchall():
        print('RAW', row)
