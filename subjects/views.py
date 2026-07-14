from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Subject, TeacherSubject
from .serializers import SubjectSerializer, TeacherSubjectSerializer
from classes.models import Class
from accounts.permissions import CanManageClasses
from accounts.utils import TenantAwareMixin

class SubjectViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Subject.objects.prefetch_related('cycle', 'teacher_assignments__teacher', 'teacher_assignments__class_assigned').select_related('teacher').all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, CanManageClasses]

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({'error': 'class_id requis'}, status=400)
        try:
            cls = Class.objects.select_related('cycle').get(id=class_id)
        except Class.DoesNotExist:
            return Response({'error': 'Classe introuvable'}, status=404)

        qs = Subject.objects.all()
        tenant = self._get_tenant()
        if tenant:
            qs = qs.filter(tenant=tenant)
        subjects = qs.filter(cycle=cls.cycle)

        if cls.cycle.name == 'lycee' and cls.specialty and cls.specialty != 'none':
            subjects = subjects.filter(specialty__in=[cls.specialty, 'none'])

        subjects = subjects.order_by('name')
        serializer = SubjectSerializer(subjects, many=True, context={'request': request})
        return Response(serializer.data)

class TeacherSubjectViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = TeacherSubject.objects.all()
    serializer_class = TeacherSubjectSerializer
    permission_classes = [IsAuthenticated, CanManageClasses]

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('teacher', 'subject', 'class_assigned')
        if hasattr(self, 'request'):
            teacher_id = self.request.query_params.get('teacher_id', None)
            class_id = self.request.query_params.get('class_id', None)
            if teacher_id:
                queryset = queryset.filter(teacher_id=teacher_id)
            if class_id:
                queryset = queryset.filter(class_assigned_id=class_id)
        return queryset
