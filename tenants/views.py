import secrets
import string
import logging
from django.db import transaction, connection
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .models import Tenant
from .serializers import TenantSerializer, PublicTenantRegistrationSerializer, _generate_subdomain, _generate_license_key
from accounts.permissions import IsSuperAdmin
from accounts.utils import get_user_role

logger = logging.getLogger(__name__)


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['register', 'check_subdomain']:
            return [AllowAny()]
        return [IsAuthenticated(), IsSuperAdmin()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        tenant_id = int(instance.id)
        logger.info(f"Deleting tenant {tenant_id} ({instance.name})")
        try:
            cursor = connection.cursor()
            try:
                cursor.execute("PRAGMA foreign_keys = OFF")
            except Exception:
                pass

            user_ids = [
                r[0] for r in cursor.execute(
                    f"SELECT u.id FROM auth_user u INNER JOIN accounts_userprofile p ON p.user_id = u.id WHERE p.tenant_id = {tenant_id}"
                ).fetchall()
            ]

            def _in_clause(ids):
                return ','.join(str(int(i)) for i in ids) if ids else '0'

            payment_ids = [r[0] for r in cursor.execute(
                f"SELECT id FROM payments_payment WHERE tenant_id = {tenant_id}").fetchall()]
            if payment_ids:
                cursor.execute(f"DELETE FROM payments_paymenthistory WHERE payment_id IN ({_in_clause(payment_ids)})")
                cursor.execute(f"DELETE FROM mobile_payments_mobilepaymenttransaction WHERE payment_id IN ({_in_clause(payment_ids)})")

            student_ids = [r[0] for r in cursor.execute(
                f"SELECT id FROM students_student WHERE tenant_id = {tenant_id}").fetchall()]
            if student_ids:
                cursor.execute(f"DELETE FROM grades_gradehistory WHERE grade_id IN (SELECT id FROM grades_grade WHERE student_id IN ({_in_clause(student_ids)}))")
                cursor.execute(f"DELETE FROM grades_studentaverage WHERE student_id IN ({_in_clause(student_ids)})")
                cursor.execute(f"DELETE FROM attendance_attendance WHERE student_id IN ({_in_clause(student_ids)})")
                cursor.execute(f"DELETE FROM communication_notification WHERE related_student_id IN ({_in_clause(student_ids)})")

            teacher_ids = [r[0] for r in cursor.execute(
                f"SELECT id FROM teachers_teacher WHERE tenant_id = {tenant_id}").fetchall()]
            if teacher_ids:
                cursor.execute(f"DELETE FROM teachers_salaryhistory WHERE teacher_id IN ({_in_clause(teacher_ids)})")

            class_ids = [r[0] for r in cursor.execute(
                f"SELECT id FROM classes_class WHERE tenant_id = {tenant_id}").fetchall()]
            if class_ids:
                cursor.execute(f"DELETE FROM payments_feetype_class_assigned WHERE class_id IN ({_in_clause(class_ids)})")

            term_ids = [r[0] for r in cursor.execute(
                f"SELECT id FROM grades_term WHERE tenant_id = {tenant_id}").fetchall()]
            if term_ids:
                cursor.execute(f"DELETE FROM results_classresult WHERE term_id IN ({_in_clause(term_ids)})")

            cursor.execute(f"DELETE FROM payments_payment WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM grades_grade WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM grades_gradehistory WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM grades_studentaverage WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM communication_notification WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM communication_message WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM expenses_expense WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM expenses_expensecategory WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM registrations_registration WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM students_parent WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM students_student WHERE tenant_id = {tenant_id}")

            cursor.execute(f"DELETE FROM subjects_teachersubject WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM subjects_subject_cycle WHERE subject_id IN (SELECT id FROM subjects_subject WHERE tenant_id = {tenant_id})")
            cursor.execute(f"DELETE FROM subjects_subject WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM classes_scheduleentry WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM classes_class WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM classes_cycle WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM rooms_room WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM teachers_teacher WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM payments_feetype WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM grades_term WHERE tenant_id = {tenant_id}")

            cursor.execute(f"DELETE FROM school_semester WHERE academic_year_id IN (SELECT id FROM school_academicyear WHERE tenant_id = {tenant_id})")
            cursor.execute(f"DELETE FROM school_academicyear WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM school_schoolinfo WHERE tenant_id = {tenant_id}")

            cursor.execute(f"DELETE FROM dashboard_statistic WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM dashboard_activitylog WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM accounts_activitylog WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM accounts_loginattempt WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM accounts_loginlockout WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM accounts_role WHERE tenant_id = {tenant_id}")
            cursor.execute(f"DELETE FROM accounts_userprofile WHERE tenant_id = {tenant_id}")

            cursor.execute(f"UPDATE tenants_tenant SET created_by_id = NULL WHERE id = {tenant_id}")
            if user_ids:
                user_clause = _in_clause(user_ids)
                cursor.execute(f"DELETE FROM django_admin_log WHERE user_id IN ({user_clause})")
                cursor.execute(f"DELETE FROM auth_user_groups WHERE user_id IN ({user_clause})")
                cursor.execute(f"DELETE FROM auth_user_user_permissions WHERE user_id IN ({user_clause})")
                cursor.execute(f"DELETE FROM auth_user WHERE id IN ({user_clause})")

            cursor.execute(f"DELETE FROM tenants_tenant WHERE id = {tenant_id}")

            try:
                cursor.execute("PRAGMA foreign_keys = ON")
            except Exception:
                pass

        except Exception as e:
            logger.error(f"Failed to delete tenant {tenant_id}: {e}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_204_NO_CONTENT)

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
            if User.objects.filter(username=admin_username).exists():
                return
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

        if User.objects.filter(username=data['admin_username']).exists():
            return Response(
                {'admin_username': ["Ce nom d'utilisateur est déjà pris."]},
                status=status.HTTP_400_BAD_REQUEST
            )

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


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def reset_tenant_admin_password(request, tenant_id):
    tenant = get_object_or_404(Tenant, id=tenant_id)
    admin = User.objects.filter(profile__tenant=tenant, profile__role='admin').first()
    if not admin:
        return Response({'error': "Aucun administrateur trouvé pour cet établissement"}, status=status.HTTP_404_NOT_FOUND)
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    admin.set_password(new_password)
    admin.save()
    return Response({'new_password': new_password, 'message': 'Mot de passe réinitialisé avec succès'})