from django.utils import timezone
from django.contrib.auth.models import User
from django.db import close_old_connections


class UpdateLastActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            profile = request.user.profile
            now = timezone.now()
            if not profile.last_activity or (now - profile.last_activity).total_seconds() > 60:
                profile.last_activity = now
                profile.save(update_fields=['last_activity'])
        return self.get_response(request)
