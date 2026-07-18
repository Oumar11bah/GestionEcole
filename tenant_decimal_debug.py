import os
import django
from decimal import Decimal, InvalidOperation
from django.apps import apps
from django.db import models

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()

Tenant = apps.get_model('tenants', 'Tenant')
print('Using Django models: found Tenant model', Tenant)

for model in apps.get_models():
    if model == Tenant:
        continue
    tenant_related = False
    for field in model._meta.fields:
        if getattr(field, 'remote_field', None) and field.remote_field.model == Tenant:
            tenant_related = True
            break
    if not tenant_related:
        # also check reverse relations from Tenant to this model
        for rel in model._meta.related_objects:
            if rel.related_model == Tenant:
                tenant_related = True
                break
    if not tenant_related:
        continue

    dec_fields = [f for f in model._meta.fields if isinstance(f, models.DecimalField)]
    if not dec_fields:
        continue
    print('MODEL', model._meta.app_label, model.__name__, 'decimal fields', [f.name for f in dec_fields])
    # find possible tenant filter fields on model
    tenant_fks = [f for f in model._meta.fields if getattr(f, 'remote_field', None) and f.remote_field.model == Tenant]
    if not tenant_fks:
        print('  no direct tenant FK field on model, skipping')
        continue
    for fk in tenant_fks:
        print('  tenant fk field', fk.name)
        qs = model.objects.filter(**{fk.name: 1})
        try:
            cnt = qs.count()
            print('   rows', cnt)
        except Exception as exc:
            print('   Query count error', type(exc).__name__, exc)
            raise
        for idx, obj in enumerate(qs[:50], 1):
            for field in dec_fields:
                val = getattr(obj, field.name)
                if val is None:
                    continue
                try:
                    Decimal(str(val))
                except (InvalidOperation, ValueError) as exc:
                    print('   BAD', model._meta.app_label, model.__name__, 'pk', getattr(obj, model._meta.pk.name), field.name, repr(val), type(val), exc)
                    raise
            if idx >= 10:
                break
print('done')
