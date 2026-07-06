from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Registration
from .serializers import RegistrationSerializer
from students.models import Student
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import CanManageStudents
from accounts.utils import TenantAwareMixin, get_request_tenant

class RegistrationViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageStudents]
    module = 'registrations'
    queryset = Registration.objects.all().order_by('student__last_name', 'student__first_name')
    serializer_class = RegistrationSerializer
    pagination_class = None
    filterset_fields = ['academic_year', 'status', 'class_assigned', 'is_re_registration']

    @action(detail=False, methods=['post'])
    def register_student(self, request):
        student_id = request.data.get('student_id')
        class_id = request.data.get('class_assigned')
        academic_year = request.data.get('academic_year')
        is_re_registration = request.data.get('is_re_registration', False)
        previous_class_id = request.data.get('previous_class_id')

        if not student_id or not class_id:
            return Response({'error': 'student_id et class_assigned sont requis'}, status=status.HTTP_400_BAD_REQUEST)

        student = Student.objects.get(id=student_id)
        year = academic_year or '2024-2025'

        existing = Registration.objects.filter(student=student, academic_year=year).first()
        if existing:
            return Response(
                {
                    'error': f'L\'élève {student.first_name} {student.last_name} est déjà inscrit(e) pour l\'année académique {year}.',
                    'detail': 'Un doublon a été détecté. Veuillez vérifier le dossier de l\'élève ou modifier l\'inscription existante.',
                    'student_id': student.id,
                    'academic_year': year,
                    'existing_registration_id': existing.id,
                },
                status=status.HTTP_409_CONFLICT
            )

        tenant = get_request_tenant(request)
        registration = Registration.objects.create(
            student=student,
            class_assigned_id=class_id,
            academic_year=year,
            is_re_registration=is_re_registration,
            previous_class_id=previous_class_id,
            status='pending',
            tenant=tenant,
        )

        serializer = self.get_serializer(registration)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        try:
            registration = self.get_object()
            registration.status = 'approved'
            registration.save()

            student = registration.student
            student.class_assigned = registration.class_assigned
            student.academic_year = registration.academic_year
            student.save()

            serializer = self.get_serializer(registration)
            return Response(serializer.data)
        except Registration.DoesNotExist:
            return Response({'error': 'Inscription introuvable'}, status=status.HTTP_404_NOT_FOUND)