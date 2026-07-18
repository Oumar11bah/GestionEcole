import os
import django
from decimal import Decimal, InvalidOperation
from django.db import models

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()
from django.apps import apps
Tenant = apps.get_model('tenants', 'Tenant')

t = Tenant.objects.get(pk=1)
print('Tenant:', t)

for rel in Tenant._meta.related_objects:
    model = rel.related_model
    accessor = rel.get_accessor_name()
    print('REL', rel.name, 'model', model._meta.label, 'accessor', accessor)
    if not hasattr(t, accessor):
        print('  no accessor on instance')
        continue
    manager = getattr(t, accessor)
    try:
        qs = manager.all()
        cnt = qs.count()
        print('  count', cnt)
    except Exception as exc:
        print('  ERROR count', type(exc).__name__, exc)
        continue
    dec_fields = [f.name for f in model._meta.fields if isinstance(f, models.DecimalField)]
    if dec_fields:
        print('  decimal fields', dec_fields)
        for idx, obj in enumerate(qs[:50], 1):
            for field in dec_fields:
                val = getattr(obj, field)
                if val is None:
                    continue
                try:
                    Decimal(str(val))
                except (InvalidOperation, ValueError) as exc:
                    print('   BAD', model._meta.label, 'pk', getattr(obj, model._meta.pk.name), field, repr(val), type(val), exc)
                    raise
            if idx >= 10:
                break
print('done')
