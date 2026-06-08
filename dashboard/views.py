from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg
from django.db.models.functions import TruncMonth
from .models import Statistic, ActivityLog
from .serializers import StatisticSerializer, ActivityLogSerializer
from accounts.permissions import CanViewActivity, IsAdminOrSuperAdmin, RoleBasedPermission
from students.models import Student
from payments.models import Payment
from classes.models import Cycle, Class
from teachers.models import Teacher
from grades.models import Grade, StudentAverage
from datetime import datetime, timedelta

class StatisticViewSet(viewsets.ModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        count = ActivityLog.objects.count()
        ActivityLog.objects.all().delete()
        return Response({'deleted': count})

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    module = 'dashboard'

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_students = Student.objects.count()
        total_teachers = Teacher.objects.filter(is_active=True).count()
        total_payments = Payment.objects.filter(status='completed').aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
        total_classes = Class.objects.count()

        students_by_cycle = {}
        for cycle in Cycle.objects.all():
            students_by_cycle[cycle.name] = Student.objects.filter(
                class_assigned__cycle=cycle
            ).count()

        recent_activities = ActivityLogSerializer(
            ActivityLog.objects.order_by('-timestamp')[:10], many=True
        ).data

        enrollment_trend = []
        months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
        for i, month_name in enumerate(months[:6]):
            month_num = i + 1
            primary_count = Student.objects.filter(
                class_assigned__cycle__name='primaire',
                enrollment_date__month__lte=month_num
            ).count()
            college_count = Student.objects.filter(
                class_assigned__cycle__name='college',
                enrollment_date__month__lte=month_num
            ).count()
            lycee_count = Student.objects.filter(
                class_assigned__cycle__name='lycee',
                enrollment_date__month__lte=month_num
            ).count()
            enrollment_trend.append({
                'mois': month_name,
                'primaire': primary_count,
                'college': college_count,
                'lycee': lycee_count,
            })

        cycle_distribution = []
        total = total_students or 1
        for cycle in Cycle.objects.all():
            count = students_by_cycle.get(cycle.name, 0)
            cycle_distribution.append({
                'name': cycle.get_name_display(),
                'value': round((count / total) * 100) if total else 0,
                'count': count,
            })

        success_rate = 0
        if StudentAverage.objects.exists():
            passing = StudentAverage.objects.filter(average__gte=10).count()
            success_rate = round((passing / StudentAverage.objects.count()) * 100)

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
