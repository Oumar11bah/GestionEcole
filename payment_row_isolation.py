import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()
from payments.models import Payment

ids = [1, 2, 4, 5, 6]
for pk in ids:
    print('TRY PK', pk)
    try:
        p = Payment.objects.get(pk=pk)
        print(' OK', p.pk, type(p.total_amount), repr(p.total_amount), type(p.amount_paid), repr(p.amount_paid))
    except Exception as exc:
        print(' EXC', pk, type(exc).__name__, exc)
        import traceback; traceback.print_exc()
        break
print('done')
