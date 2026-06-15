from django.core.management.base import BaseCommand
from django.db.models import Q


class Command(BaseCommand):
    help = "Supprime les Term (grades) qui n'ont pas de Semester correspondant (school)"

    def handle(self, *args, **options):
        from school.models import Semester
        from grades.models import Term

        terms = Term.objects.all()
        deleted = 0
        kept = 0
        skipped_with_grades = 0

        for term in terms:
            try:
                year = term.academic_year
                semester = Semester.objects.filter(
                    name__iexact=term.name,
                    academic_year__name=year,
                ).first()
                if not semester:
                    if term.grades.exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f"  ⚠  {term} ({term.id}) a des notes liées → supprimé quand même"
                            )
                        )
                        skipped_with_grades += 1
                    count, _ = term.delete()
                    deleted += count
                else:
                    kept += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ {term} : {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"Termes orphelins supprimés : {deleted} | Conservés : {kept} | Avec notes (supprimés aussi) : {skipped_with_grades}"
        ))

