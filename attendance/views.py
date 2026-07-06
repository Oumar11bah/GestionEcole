from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Attendance
from .serializers import AttendanceSerializer
from accounts.permissions import CanManageAttendance
from accounts.utils import TenantAwareMixin

class AttendanceViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, CanManageAttendance]

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self, 'request'):
            student_id = self.request.query_params.get('student_id', None)
            date = self.request.query_params.get('date', None)
            if student_id:
                queryset = queryset.filter(student_id=student_id)
            if date:
                queryset = queryset.filter(date=date)
        return queryset