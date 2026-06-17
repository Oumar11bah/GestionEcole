from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import ActivityLog
from communication.models import Notification


@receiver(post_save, sender=ActivityLog)
def notify_admins_on_activity(sender, instance, created, **kwargs):
    if not created:
        return
    admins = User.objects.filter(
        profile__role__in=['super_admin', 'admin'],
        is_active=True
    )
    if not admins.exists():
        return
    notifications = []
    for admin in admins:
        notifications.append(Notification(
            recipient=admin,
            notification_type='general',
            title=f"Activité: {instance.get_action_display()}",
            message=f"{instance.username} - {instance.module}: {instance.description}",
        ))
    Notification.objects.bulk_create(notifications)
