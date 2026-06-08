from .models import ActivityLog

def log_activity(user, action, model_name, object_repr):
    if user and user.is_authenticated:
        ActivityLog.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_repr=str(object_repr)[:200],
        )
