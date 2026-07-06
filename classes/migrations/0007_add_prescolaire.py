from django.db import migrations, models

def create_prescolaire(apps, schema_editor):
    Cycle = apps.get_model('classes', 'Cycle')
    Cycle.objects.get_or_create(name='prescolaire', defaults={'description': 'Cycle préscolaire'})

class Migration(migrations.Migration):
    dependencies = [
        ('classes', '0006_default_cycles'),
    ]
    operations = [
        migrations.RunPython(create_prescolaire, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='cycle',
            name='name',
            field=models.CharField(choices=[('primaire', 'Primaire'), ('college', 'Collège'), ('lycee', 'Lycée'), ('prescolaire', 'Préscolaire')], max_length=20, unique=True),
        ),
    ]
