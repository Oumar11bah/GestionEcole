from django.contrib.auth.models import User
from communication.models import Notification


def notify_admins(notification_type, title, message, request=None, trigger_user=None):
    if trigger_user and hasattr(trigger_user, 'profile'):
        creator = trigger_user.profile.created_by
        if creator:
            Notification.objects.create(
                recipient=creator,
                notification_type=notification_type,
                title=title,
                message=message,
            )
            return
        if trigger_user.is_superuser:
            recipients = User.objects.filter(is_superuser=True, is_active=True)
            for recipient in recipients:
                if recipient != trigger_user:
                    Notification.objects.create(
                        recipient=recipient,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                    )
            return
    recipients = User.objects.filter(is_superuser=True, is_active=True)
    for recipient in recipients:
        Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
        )
