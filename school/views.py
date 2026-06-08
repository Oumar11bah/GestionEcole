from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AcademicYear, SchoolInfo
from .serializers import AcademicYearSerializer, SchoolInfoSerializer
from accounts.permissions import CanManageSchool

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if self.request.user.profile.role != 'super_admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul un Super Admin peut supprimer une année scolaire")
        year_name = instance.name
        with transaction.atomic():
            from registrations.models import Registration
            from classes.models import Class
            from students.models import Student
            from payments.models import Payment
            from subjects.models import TeacherSubject
            from grades.models import Term
            from results.models import ClassResult
            from accounts.models import UserProfile

            Registration.objects.filter(academic_year=year_name).delete()
            Class.objects.filter(academic_year=year_name).delete()
            Student.objects.filter(academic_year=year_name).delete()
            Payment.objects.filter(academic_year=year_name).delete()
            TeacherSubject.objects.filter(academic_year=year_name).delete()
            Term.objects.filter(academic_year=year_name).delete()
            ClassResult.objects.filter(academic_year=year_name).delete()
            UserProfile.objects.filter(preferred_academic_year=year_name).update(preferred_academic_year='')
            SchoolInfo.objects.filter(academic_year=year_name).update(academic_year='')
            instance.delete()

class SchoolInfoViewSet(viewsets.ModelViewSet):
    queryset = SchoolInfo.objects.all()
    serializer_class = SchoolInfoSerializer

    def list(self, request, *args, **kwargs):
        instance = SchoolInfo.objects.first()
        if not instance:
            return Response({})
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        instance = SchoolInfo.objects.first()
        if instance:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)
