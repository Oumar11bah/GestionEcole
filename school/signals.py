from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from datetime import date
from .models import Semester


@receiver(post_save, sender=Semester)
def sync_semester_to_term(sender, instance, **kwargs):
    from grades.models import Term

    academic_year = str(instance.academic_year) if instance.academic_year else str(date.today().year)
    tenant = instance.academic_year.tenant if instance.academic_year else None

    Term.objects.update_or_create(
        name=instance.name[:20],
        academic_year=academic_year,
        defaults={
            'start_date': instance.start_date or date.today(),
            'end_date': instance.end_date or date.today(),
            'is_active': instance.is_active,
            'tenant': tenant,
        }
    )


@receiver(post_delete, sender=Semester)
def delete_orphan_term(sender, instance, **kwargs):
    from grades.models import Term

    academic_year = str(instance.academic_year) if instance.academic_year else str(date.today().year)
    tenant = instance.academic_year.tenant if instance.academic_year else None

    Term.objects.filter(
        name=instance.name[:20],
        academic_year=academic_year,
        tenant=tenant,
    ).delete()
