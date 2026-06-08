from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import CanViewActivity
from accounts.models import ActivityLog, LoginAttempt, LoginLockout
from django.utils import timezone
from datetime import timedelta


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewActivity])
def security_dashboard(request):
    now = timezone.now()
    last_24h = now - timedelta(hours=24)

    recent_logins = LoginAttempt.objects.filter(timestamp__gte=last_24h).count()
    failed_logins = LoginAttempt.objects.filter(timestamp__gte=last_24h, successful=False).count()
    success_logins = LoginAttempt.objects.filter(timestamp__gte=last_24h, successful=True).count()

    error_rate = round((failed_logins / recent_logins * 100), 1) if recent_logins > 0 else 0

    locked_accounts_count = LoginLockout.objects.filter(
        locked_until__isnull=False,
        locked_until__gt=now
    ).count()

    blocked_ips = LoginLockout.objects.filter(
        locked_until__isnull=False,
        locked_until__gt=now
    ).values_list('ip_address', flat=True).distinct()

    recent_activities = ActivityLog.objects.filter(timestamp__gte=last_24h)[:20].values(
        'username', 'action', 'module', 'description', 'ip_address', 'timestamp'
    )

    total_active_today = LoginAttempt.objects.filter(
        timestamp__gte=last_24h, successful=True
    ).values('user').distinct().count()

    return Response({
        'period': '24h',
        'total_requests': recent_logins,
        'successful_logins': success_logins,
        'failed_attempts': failed_logins,
        'error_rate': error_rate,
        'locked_accounts': locked_accounts_count,
        'blocked_ips': list(blocked_ips),
        'active_users_today': total_active_today,
        'recent_activities': list(recent_activities[:10]),
    })
