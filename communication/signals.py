from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import Notification


def notify_staff(notification_type, title, message, related_student=None):
    staff_users = User.objects.filter(is_staff=True)
    for user in staff_users:
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_student=related_student,
        )


@receiver(post_save, sender='payments.Payment')
def payment_notification(sender, instance, created, **kwargs):
    student = instance.student
    status_display = dict(instance.STATUS_CHOICES).get(instance.status, instance.status)
    if created:
        notify_staff(
            'payment',
            f"Nouveau paiement - {student}",
            f"{student.first_name} {student.last_name} - {instance.fee_type} : {instance.amount_paid} FG ({status_display})",
            related_student=student,
        )
    elif instance.status in ('completed', 'failed', 'cancelled'):
        notify_staff(
            'payment',
            f"Mise à jour paiement - {student}",
            f"{student.first_name} {student.last_name} - {instance.fee_type} : {status_display}",
            related_student=student,
        )


@receiver(post_save, sender='attendance.Attendance')
def attendance_notification(sender, instance, created, **kwargs):
    if instance.status == 'absent':
        student = instance.student
        notify_staff(
            'attendance',
            f"Absence - {student}",
            f"{student.first_name} {student.last_name} est absent le {instance.date}",
            related_student=student,
        )


@receiver(post_save, sender='grades.Grade')
def grade_notification(sender, instance, created, **kwargs):
    student = instance.student
    subject = instance.teacher_subject.subject
    avg = instance.average
    avg_str = f"{avg}/20" if avg is not None else "N/A"
    if created:
        notify_staff(
            'grade',
            f"Nouvelle note - {student}",
            f"{student.first_name} {student.last_name} - {subject} : {avg_str}",
            related_student=student,
        )
    else:
        notify_staff(
            'grade',
            f"Note modifiée - {student}",
            f"{student.first_name} {student.last_name} - {subject} : {avg_str}",
            related_student=student,
        )
