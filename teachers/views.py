from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Teacher, SalaryHistory
from .serializers import TeacherSerializer, SalaryHistorySerializer
from accounts.permissions import CanManageTeachers, CanManageSalaries

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.prefetch_related('subject_assignments__subject', 'subject_assignments__class_assigned').all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated, CanManageTeachers]

class SalaryHistoryViewSet(viewsets.ModelViewSet):
    queryset = SalaryHistory.objects.all()
    serializer_class = SalaryHistorySerializer
    permission_classes = [IsAuthenticated, CanManageSalaries]
    filterset_fields = ['teacher', 'month', 'is_paid']
