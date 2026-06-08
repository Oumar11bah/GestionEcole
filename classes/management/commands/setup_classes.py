from django.core.management.base import BaseCommand
from classes.models import Cycle, Class

DEFAULT_CLASSES = {
    'primaire': ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'],
    'college': ['6eme', '5eme', '4eme', '3eme'],
    'lycee': {
        'maths': ['Seconde A', 'Premiere A', 'Terminale A'],
        'experimental': ['Seconde D', 'Premiere D', 'Terminale D'],
        'sociales': ['Seconde G', 'Premiere G', 'Terminale G'],
    },
}

class Command(BaseCommand):
    help = 'Create default cycles and classes for EduManager'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Creating cycles and classes...'))

        cycles = {}
        for key, label in [('primaire', 'primaire'), ('college', 'college'), ('lycee', 'lycee')]:
            cycle, created = Cycle.objects.get_or_create(name=label)
            cycles[key] = cycle
            self.stdout.write(f"  Cycle: {cycle}")

        academic_year = '2024-2025'

        for cycle_key, classes_list in DEFAULT_CLASSES.items():
            cycle = cycles[cycle_key]

            if cycle_key == 'lycee':
                for specialty_key, names in classes_list.items():
                    for name in names:
                        cls, created = Class.objects.get_or_create(
                            name=name,
                            cycle=cycle,
                            specialty=specialty_key,
                            academic_year=academic_year,
                        )
                        if created:
                            self.stdout.write(f"  Created: {cls}")
            else:
                for name in classes_list:
                    cls, created = Class.objects.get_or_create(
                        name=name,
                        cycle=cycle,
                        academic_year=academic_year,
                    )
                    if created:
                        self.stdout.write(f"  Created: {cls}")

        self.stdout.write(self.style.SUCCESS('Done! All default cycles and classes created.'))
