from django.db import migrations


def backfill_tenant(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    Tenant = apps.get_model('tenants', 'Tenant')
    default_tenant = Tenant.objects.filter(subdomain='default').first()
    if not default_tenant:
        return
    updated = UserProfile.objects.filter(tenant__isnull=True).update(tenant=default_tenant)
    if updated:
        print(f"  Backfill: {updated} UserProfile(s) assigné(s) au tenant par défaut")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_userprofile_tenant'),
    ]

    operations = [
        migrations.RunPython(backfill_tenant, migrations.RunPython.noop),
    ]
