from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from threading import current_thread
from .utils import log_activity

_thread_locals = {}

def get_current_user():
    """Return the authenticated user from the current request."""
    request = _thread_locals.get('request')
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None

class CurrentUserMiddleware:
    """Stores the request in thread-local storage so signals can access the current request."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals['request'] = request
        try:
            response = self.get_response(request)
        finally:
            _thread_locals['request'] = None
        return response


# Patch DRF's Request to propagate the authenticated user back to the original Django request
# (DRF authenticates inside view dispatch, so the middleware sees AnonymousUser initially)
def _patch_drf_request():
    from rest_framework.request import Request as DRFRequest
    original = DRFRequest._authenticate
    def _patched_authenticate(self):
        original(self)
        if hasattr(self, '_user') and self._user and self._user.is_authenticated:
            self._request.user = self._user
    DRFRequest._authenticate = _patched_authenticate

_patch_drf_request()


RELEVANT_MODELS = {
    'students.models.Student': 'Élève',
    'payments.models.Payment': 'Paiement',
    'grades.models.Grade': 'Note',
    'attendance.models.Attendance': 'Absence',
    'teachers.models.Teacher': 'Enseignant',
    'classes.models.Class': 'Classe',
    'subjects.models.Subject': 'Matière',
}


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    if sender.__module__.startswith('django'):
        return
    module_path = f'{sender.__module__}.{sender.__name__}'
    if module_path not in RELEVANT_MODELS:
        return
    user = get_current_user()
    if not user or not user.is_authenticated:
        return
    repr_str = str(instance)[:100]
    action = 'create' if created else 'update'
    log_activity(user, action, sender.__name__, repr_str)


@receiver(post_delete)
def log_model_delete(sender, instance, **kwargs):
    module_path = f'{sender.__module__}.{sender.__name__}'
    if module_path not in RELEVANT_MODELS:
        return
    user = get_current_user()
    if not user or not user.is_authenticated:
        return
    repr_str = str(instance)[:100]
    log_activity(user, 'delete', sender.__name__, repr_str)


@receiver(post_save, sender='dashboard.ActivityLog')
def notify_admins_on_dashboard_activity(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.user or not hasattr(instance.user, 'profile'):
        return
    from communication.models import Notification
    creator = instance.user.profile.created_by
    action_display = dict(instance.ACTION_CHOICES).get(instance.action, instance.action)
    if creator:
        Notification.objects.create(
            recipient=creator,
            notification_type='general',
            title=f"{action_display}: {instance.model_name}",
            message=f"{instance.user.get_full_name() or instance.user.username} - {instance.object_repr}",
        )
    elif instance.user.is_superuser:
        from django.contrib.auth.models import User
        recipients = User.objects.filter(is_superuser=True, is_active=True)
        notifications = []
        for recipient in recipients:
            if recipient != instance.user:
                notifications.append(Notification(
                    recipient=recipient,
                    notification_type='general',
                    title=f"{action_display}: {instance.model_name}",
                    message=f"{instance.user.get_full_name() or instance.user.username} - {instance.object_repr}",
                ))
        if notifications:
            Notification.objects.bulk_create(notifications)
