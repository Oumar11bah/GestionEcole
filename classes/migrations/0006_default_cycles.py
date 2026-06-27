from django.db import migrations

def create_default_cycles(apps, schema_editor):
    Cycle = apps.get_model('classes', 'Cycle')
    default_cycles = [
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
    ]
    for name, _ in default_cycles:
        Cycle.objects.get_or_create(name=name, defaults={'description': ''})

class Migration(migrations.Migration):
    dependencies = [
        ('classes', '0005_scheduleentry_observation'),
    ]
    operations = [
        migrations.RunPython(create_default_cycles, migrations.RunPython.noop),
    ]
