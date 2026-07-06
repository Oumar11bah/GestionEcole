from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg
from django.db.models.functions import TruncMonth
from .models import Statistic, ActivityLog
from .serializers import StatisticSerializer, ActivityLogSerializer
from accounts.permissions import CanViewActivity, IsAdminOrSuperAdmin, RoleBasedPermission
from accounts.utils import get_user_role
from students.models import Student
from payments.models import Payment
from classes.models import Cycle, Class
from teachers.models import Teacher
from grades.models import Grade, StudentAverage
from tenants.models import Tenant
from tenants.serializers import TenantSerializer
from datetime import datetime, timedelta


class StatisticViewSet(viewsets.ModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        if get_user_role(self.request.user) == 'super_admin':
            return Statistic.objects.none()
        return super().get_queryset()


class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        if get_user_role(self.request.user) == 'super_admin':
            return ActivityLog.objects.none()
        return super().get_queryset()

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        user = request.user
        role = get_user_role(user)
        if role == 'super_admin':
            return Response({'deleted': 0})
        if hasattr(user, 'profile') and user.profile.tenant:
            logs = ActivityLog.objects.filter(user__profile__tenant=user.profile.tenant)
        else:
            logs = ActivityLog.objects.none()
        count = logs.count()
        logs.delete()
        return Response({'deleted': count})


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    module = 'dashboard'

    @action(detail=False, methods=['get'])
    def stats(self, request):
        role = get_user_role(request.user)

        # Super admin sees tenant-level stats (no school data)
        if role == 'super_admin':
            tenants = Tenant.objects.all()
            total = tenants.count()
            active = tenants.filter(is_active=True, is_pending=False).count()
            pending = tenants.filter(is_pending=True).count()
            inactive = tenants.filter(is_active=False, is_pending=False).count()
            recent_tenants = TenantSerializer(tenants.order_by('-created_at')[:5], many=True).data

            data = {
                'is_super_admin': True,
                'total_tenants': total,
                'active_tenants': active,
                'pending_tenants': pending,
                'inactive_tenants': inactive,
                'recent_tenants': recent_tenants,
            }
            return Response(data)

        # Filter by tenant for non-super-admin users
        tenant_filter = {}
        if hasattr(request.user, 'profile') and request.user.profile.tenant:
            tenant_filter = {'tenant': request.user.profile.tenant}

        total_students = Student.objects.filter(**tenant_filter).count()
        total_teachers = Teacher.objects.filter(is_active=True, **tenant_filter).count()
        total_payments = Payment.objects.filter(status='completed', **tenant_filter).aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
        total_classes = Class.objects.filter(**tenant_filter).count()

        students_by_cycle = {}
        for cycle in Cycle.objects.filter(**tenant_filter):
            students_by_cycle[cycle.name] = Student.objects.filter(
                class_assigned__cycle=cycle, **tenant_filter
            ).count()

        if role in ['admin', 'directeur']:
            if hasattr(request.user, 'profile') and request.user.profile.tenant:
                recent_activities_qs = ActivityLog.objects.filter(user__profile__tenant=request.user.profile.tenant)
            else:
                recent_activities_qs = ActivityLog.objects.none()
        else:
            recent_activities_qs = ActivityLog.objects.filter(user=request.user)
        recent_activities = ActivityLogSerializer(
            recent_activities_qs.order_by('-timestamp')[:10], many=True
        ).data

        enrollment_trend = []
        months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
        for i, month_name in enumerate(months[:6]):
            month_num = i + 1
            primary_count = Student.objects.filter(
                class_assigned__cycle__name='primaire',
                enrollment_date__month__lte=month_num,
                **tenant_filter
            ).count()
            college_count = Student.objects.filter(
                class_assigned__cycle__name='college',
                enrollment_date__month__lte=month_num,
                **tenant_filter
            ).count()
            lycee_count = Student.objects.filter(
                class_assigned__cycle__name='lycee',
                enrollment_date__month__lte=month_num,
                **tenant_filter
            ).count()
            enrollment_trend.append({
                'mois': month_name,
                'primaire': primary_count,
                'college': college_count,
                'lycee': lycee_count,
            })

        cycle_distribution = []
        total = total_students or 1
        for cycle in Cycle.objects.filter(**tenant_filter):
            count = students_by_cycle.get(cycle.name, 0)
            cycle_distribution.append({
                'name': cycle.get_name_display(),
                'value': round((count / total) * 100) if total else 0,
                'count': count,
            })

        success_rate = 0
        averages_qs = StudentAverage.objects.filter(**tenant_filter)
        if averages_qs.exists():
            passing = averages_qs.filter(average__gte=10).count()
            success_rate = round((passing / averages_qs.count()) * 100)

        data = {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_payments': float(total_payments),
            'total_classes': total_classes,
            'students_by_cycle': students_by_cycle,
            'recent_activities': recent_activities,
            'enrollment_trend': enrollment_trend,
            'cycle_distribution': cycle_distribution,
            'success_rate': success_rate,
        }
        return Response(data)
