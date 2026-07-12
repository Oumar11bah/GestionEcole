from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS
from rest_framework.decorators import action
from .models import AcademicYear, SchoolInfo, Semester
from .serializers import AcademicYearSerializer, SchoolInfoSerializer, SemesterSerializer
from accounts.permissions import CanManageSchool
from accounts.utils import get_user_role


def _get_tenant(user):
    role = get_user_role(user)
    if role == 'super_admin':
        return None
    if hasattr(user, 'profile') and user.profile.tenant:
        return user.profile.tenant
    return None


def _is_super_admin(user):
    return get_user_role(user) == 'super_admin'


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if _is_super_admin(self.request.user):
            return AcademicYear.objects.none()
        qs = AcademicYear.objects.all()
        tenant = _get_tenant(self.request.user)
        if tenant:
            qs = qs.filter(tenant=tenant)
        if self.request.query_params.get('include_archived') != 'true':
            qs = qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        if _is_super_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Les super administrateurs ne peuvent pas créer de données dans une école")
        tenant = _get_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        if get_user_role(self.request.user) != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul un administrateur peut archiver une année scolaire")
        instance.archived = True
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        role = get_user_role(request.user)
        if role == 'admin':
            tenant = _get_tenant(request.user)
            try:
                instance = AcademicYear.objects.get(pk=pk, tenant=tenant)
            except AcademicYear.DoesNotExist:
                return Response({'detail': 'Année scolaire introuvable'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'detail': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
        instance.archived = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class SchoolInfoViewSet(viewsets.ModelViewSet):
    queryset = SchoolInfo.objects.all()
    serializer_class = SchoolInfoSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAuthenticated(), CanManageSchool()]

    def get_queryset(self):
        if _is_super_admin(self.request.user):
            return SchoolInfo.objects.none()
        qs = SchoolInfo.objects.all()
        tenant = _get_tenant(self.request.user)
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        instance = qs.first()
        if not instance:
            return Response({})
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        qs = self.get_queryset()
        instance = qs.first()
        tenant = _get_tenant(request.user)
        if instance:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(tenant=tenant)
            return Response(serializer.data)
        data = request.data.copy()
        if tenant:
            data['tenant'] = tenant.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant=tenant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if _is_super_admin(self.request.user):
            return Semester.objects.none()
        qs = super().get_queryset()
        tenant = _get_tenant(self.request.user)
        if tenant:
            qs = qs.filter(academic_year__tenant=tenant)
        year = self.request.query_params.get('academic_year')
        if year:
            qs = qs.filter(academic_year__name=year)
        return qs
