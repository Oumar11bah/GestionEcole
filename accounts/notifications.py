from django.contrib.auth.models import User
from communication.models import Notification


def notify_admins(notification_type, title, message, request=None):
    admins = User.objects.filter(
        profile__role__in=['super_admin', 'admin'],
        is_active=True
    )
    for admin in admins:
        Notification.objects.create(
            recipient=admin,
            notification_type=notification_type,
            title=title,
            message=message,
        )
