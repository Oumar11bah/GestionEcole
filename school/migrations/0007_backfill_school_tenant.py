from django.db import migrations


def backfill_tenant(apps, schema_editor):
    AcademicYear = apps.get_model('school', 'AcademicYear')
    SchoolInfo = apps.get_model('school', 'SchoolInfo')
    Tenant = apps.get_model('tenants', 'Tenant')
    default_tenant = Tenant.objects.filter(subdomain='default').first()
    if not default_tenant:
        print("  Aucun tenant par défaut trouvé, backfill ignoré")
        return

    ay_updated = AcademicYear.objects.filter(tenant__isnull=True).update(tenant=default_tenant)
    if ay_updated:
        print(f"  Backfill: {ay_updated} AcademicYear(s) assigné(s)")

    si_updated = SchoolInfo.objects.filter(tenant__isnull=True).update(tenant=default_tenant)
    if si_updated:
        print(f"  Backfill: {si_updated} SchoolInfo assigné(s)")


class Migration(migrations.Migration):

    dependencies = [
        ('school', '0006_academicyear_tenant_schoolinfo_tenant_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_tenant, migrations.RunPython.noop),
    ]
