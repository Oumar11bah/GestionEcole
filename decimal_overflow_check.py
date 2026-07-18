import os
import django
from decimal import Decimal, InvalidOperation
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()
from payments.models import Payment
from django.db import connection

for field_name in ['total_amount', 'amount_paid']:
    field = Payment._meta.get_field(field_name)
    print(field_name, 'max_digits', field.max_digits, 'decimal_places', field.decimal_places)

with connection.cursor() as c:
    c.execute('SELECT id, total_amount, amount_paid FROM payments_payment WHERE tenant_id = 1')
    rows = c.fetchall()
    for row in rows:
        print('ROW', row[0], row[1], row[2], type(row[1]), type(row[2]))
        for idx, field_name in enumerate(['total_amount','amount_paid'], start=1):
            val = row[idx]
            if val is None:
                continue
            try:
                d = Decimal(str(val))
                print(' ', field_name, 'Decimal', d)
                if len(d.as_tuple().digits) > Payment._meta.get_field(field_name).max_digits:
                    print('   EXCEEDS max_digits by tuple', len(d.as_tuple().digits), '>', Payment._meta.get_field(field_name).max_digits)
                if d.as_tuple().exponent < -Payment._meta.get_field(field_name).decimal_places:
                    print('   EXCEEDS decimal_places by exponent', d.as_tuple().exponent)
            except InvalidOperation as e:
                print('   InvalidOperation', e)
print('done')
