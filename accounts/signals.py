from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import ActivityLog
from communication.models import Notification


@receiver(post_save, sender=ActivityLog)
def notify_admins_on_activity(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.user or not hasattr(instance.user, 'profile'):
        return
    creator = instance.user.profile.created_by
    if creator:
        Notification.objects.create(
            recipient=creator,
            notification_type='general',
            title=f"Activité: {instance.get_action_display()}",
            message=f"{instance.username} - {instance.module}: {instance.description}",
        )
    elif instance.user.is_superuser:
        recipients = User.objects.filter(is_superuser=True, is_active=True)
        notifications = []
        for recipient in recipients:
            if recipient != instance.user:
                notifications.append(Notification(
                    recipient=recipient,
                    notification_type='general',
                    title=f"Activité: {instance.get_action_display()}",
                    message=f"{instance.username} - {instance.module}: {instance.description}",
                ))
        if notifications:
            Notification.objects.bulk_create(notifications)
