from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import Tenant
from .serializers import TenantSerializer, PublicTenantRegistrationSerializer, _generate_subdomain, _generate_license_key
from accounts.permissions import IsSuperAdmin
from accounts.utils import get_user_role


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['register', 'check_subdomain']:
            return [AllowAny()]
        return [IsAuthenticated(), IsSuperAdmin()]

    def get_serializer_class(self):
        if self.action == 'register':
            return PublicTenantRegistrationSerializer
        return TenantSerializer

    def get_queryset(self):
        qs = Tenant.objects.all()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        from accounts.utils import get_request_tenant
        role = get_user_role(user)
        if role != 'super_admin':
            tenant = get_request_tenant(self.request)
            if tenant:
                qs = qs.filter(id=tenant.id)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        from .serializers import _generate_license_key
        tenant = serializer.save(created_by=self.request.user, license_key=_generate_license_key())
        # Create admin user for the new tenant
        admin_username = self.request.data.get('admin_username')
        admin_password = self.request.data.get('admin_password')
        admin_email = self.request.data.get('admin_email', '')
        admin_first_name = self.request.data.get('admin_first_name', '')
        admin_last_name = self.request.data.get('admin_last_name', '')

        if admin_username and admin_password:
            from django.contrib.auth.models import User
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                first_name=admin_first_name,
                last_name=admin_last_name,
            )
            admin_user.is_active = True
            admin_user.save()
            profile = admin_user.profile
            profile.role = 'admin'
            profile.tenant = tenant
            profile.is_active = True
            profile.save()

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = PublicTenantRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        subdomain = _generate_subdomain(data['school_name'])
        license_key = _generate_license_key()

        tenant = Tenant.objects.create(
            name=data['school_name'],
            subdomain=subdomain,
            license_key=license_key,
            is_pending=True,
            is_active=False,
            contact_email=data['admin_email'],
            contact_phone=data.get('contact_phone', ''),
        )

        admin_user = User.objects.create_user(
            username=data['admin_username'],
            email=data['admin_email'],
            password=data['admin_password'],
            first_name=data['admin_first_name'],
            last_name=data['admin_last_name'],
        )
        profile = admin_user.profile
        profile.role = 'admin'
        profile.tenant = tenant
        profile.is_active = True
        profile.save()

        return Response({
            'message': 'Inscription réussie. Votre compte est en attente d\'activation par l\'administrateur.',
            'tenant': TenantSerializer(tenant).data,
            'admin_username': data['admin_username'],
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def check_subdomain(self, request):
        name = request.query_params.get('name', '')
        subdomain = _generate_subdomain(name)
        return Response({'subdomain': subdomain})

    @action(detail=True, methods=['post'])
    def toggle_activation(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_active = not tenant.is_active
        if tenant.is_active:
            tenant.is_pending = False
        tenant.save(update_fields=['is_active', 'is_pending'])
        return Response(TenantSerializer(tenant).data)

    @action(detail=True, methods=['get', 'post'])
    def check_license(self, request, pk=None):
        tenant = self.get_object()
        return Response({
            'id': tenant.id,
            'name': tenant.name,
            'is_active': tenant.is_active,
            'is_expired': tenant.is_expired(),
            'license_start': tenant.license_start,
            'license_end': tenant.license_end,
            'users_used': tenant.active_users_count(),
            'students_used': tenant.active_students_count(),
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        tenant = self.get_object()
        tenant.is_pending = False
        tenant.is_active = True
        tenant.save(update_fields=['is_pending', 'is_active'])
        return Response(TenantSerializer(tenant).data)