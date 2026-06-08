from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.db import IntegrityError
import secrets
import string
from .serializers import (
    UserSerializer, UserProfileSerializer, UserDetailSerializer,
    UserListSerializer, UserCreateSerializer, UserUpdateSerializer,
    SelfProfileSerializer,
    ActivityLogSerializer, LoginAttemptSerializer,
    CustomTokenObtainPairSerializer, ChangePasswordSerializer,
    ResetPasswordSerializer, RoleSerializer,
)
from .models import UserProfile, ActivityLog, LoginAttempt, LoginLockout, Role, DEFAULT_ROLE_PERMISSIONS
from .permissions import IsSuperAdmin, IsAdminOrSuperAdmin, CanManageUsers, CanViewActivity, CanManageSchool
import string
import secrets
import json


def generate_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))


def log_activity(user, action, module, description, request=None):
    ActivityLog.objects.create(
        user=user,
        username=user.get_full_name() or user.username,
        action=action,
        module=module,
        description=description,
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
    )


MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'

class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        ip_address = request.META.get('REMOTE_ADDR', '')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            user = None

        lockout = None
        if user:
            try:
                lockout = LoginLockout.objects.get(user=user, ip_address=ip_address)
                if lockout.locked_until and lockout.locked_until > timezone.now():
                    remaining = int((lockout.locked_until - timezone.now()).total_seconds() // 60)
                    LoginAttempt.objects.create(
                        user=user, username=username, ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        successful=False
                    )
                    return Response(
                        {'error': f'Compte verrouillé. Réessayez dans {remaining} minute(s).'},
                        status=status.HTTP_423_LOCKED
                    )
                elif lockout.locked_until and lockout.locked_until <= timezone.now():
                    lockout.attempts = 0
                    lockout.locked_until = None
                    lockout.save()
            except LoginLockout.DoesNotExist:
                pass

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            if lockout:
                lockout.attempts = 0
                lockout.locked_until = None
                lockout.save()
            LoginAttempt.objects.create(
                user=user, username=username, ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                successful=True
            )
            if user:
                log_activity(user, 'login', 'Authentification',
                           f"Connexion réussie depuis {ip_address}", request)
                from .notifications import notify_admins
                role_display = user.profile.get_role_display() if hasattr(user, 'profile') else ''
                notify_admins('login',
                    f"{user.get_full_name() or user.username} ({role_display}) s'est connecté",
                    f"Connexion de {user.get_full_name() or user.username} ({role_display})")
        else:
            LoginAttempt.objects.create(
                user=user, username=username, ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                successful=False
            )
            if user:
                lockout_obj, created = LoginLockout.objects.get_or_create(
                    user=user, ip_address=ip_address,
                    defaults={'attempts': 1}
                )
                if not created:
                    lockout_obj.attempts += 1
                    if lockout_obj.attempts >= MAX_LOGIN_ATTEMPTS:
                        lockout_obj.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                    lockout_obj.save()

        return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reset_password']:
            return [IsAuthenticated(), IsAdminOrSuperAdmin()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), CanManageUsers()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = User.objects.all().select_related('profile')
        role = self.request.query_params.get('role', None)
        search = self.request.query_params.get('search', None)
        is_active = self.request.query_params.get('is_active', None)

        if role:
            queryset = queryset.filter(profile__role=role)
        if search:
            queryset = queryset.filter(
                models.Q(username__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active == 'true')
        return queryset.order_by('-date_joined')

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = serializer.validated_data.get('password')
        if not password:
            last_name = serializer.validated_data.get('last_name', '')
            phone = serializer.validated_data.get('phone_number', '')
            digits = ''.join(filter(str.isdigit, phone))[:3]
            if len(last_name) >= 2 and len(digits) == 3:
                password = last_name[:2].upper() + digits
            else:
                password = generate_password()

        try:
            user = User.objects.create_user(
                username=serializer.validated_data['username'],
                email=serializer.validated_data.get('email', ''),
                password=password,
                first_name=serializer.validated_data.get('first_name', ''),
                last_name=serializer.validated_data.get('last_name', ''),
            )
            user.is_active = serializer.validated_data.get('is_active', True)
            user.save()

            profile = user.profile
            profile.role = serializer.validated_data['role']
            profile.phone_number = serializer.validated_data.get('phone_number', '')
            profile.address = serializer.validated_data.get('address', '')
            profile.gender = serializer.validated_data.get('gender', '')
            profile.date_of_birth = serializer.validated_data.get('date_of_birth', None)
            profile.date_of_hire = serializer.validated_data.get('date_of_hire', None)
            profile.is_active = user.is_active
            profile.created_by = request.user

            if 'profile_picture' in request.FILES:
                profile.profile_picture = request.FILES['profile_picture']
            profile.save()

            log_activity(request.user, 'create', 'Utilisateurs',
                       f"A créé l'utilisateur {user.get_full_name() or user.username} ({profile.get_role_display()})",
                       request)

            return Response({
                'user': UserSerializer(user).data,
                'profile': UserProfileSerializer(profile, context={'request': request}).data,
                'message': 'Utilisateur créé avec succès',
            }, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response({'error': 'Ce nom d\'utilisateur existe déjà'}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = self.get_object()
        serializer = UserUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        if 'first_name' in serializer.validated_data:
            user.first_name = serializer.validated_data['first_name']
        if 'last_name' in serializer.validated_data:
            user.last_name = serializer.validated_data['last_name']
        if 'email' in serializer.validated_data:
            user.email = serializer.validated_data['email']
        if 'is_active' in serializer.validated_data:
            user.is_active = serializer.validated_data['is_active']
        user.save()

        profile = user.profile
        if 'role' in serializer.validated_data:
            profile.role = serializer.validated_data['role']
        if 'phone_number' in serializer.validated_data:
            profile.phone_number = serializer.validated_data['phone_number']
        if 'address' in serializer.validated_data:
            profile.address = serializer.validated_data['address']
        if 'gender' in serializer.validated_data:
            profile.gender = serializer.validated_data['gender']
        if 'date_of_birth' in serializer.validated_data:
            profile.date_of_birth = serializer.validated_data['date_of_birth']
        if 'date_of_hire' in serializer.validated_data:
            profile.date_of_hire = serializer.validated_data['date_of_hire']
        if 'profile_picture' in request.FILES:
            profile.profile_picture = request.FILES['profile_picture']
        if 'language' in serializer.validated_data:
            profile.language = serializer.validated_data['language']
        if 'preferred_academic_year' in serializer.validated_data:
            profile.preferred_academic_year = serializer.validated_data['preferred_academic_year']
        profile.is_active = user.is_active
        profile.save()

        log_activity(request.user, 'update', 'Utilisateurs',
                   f"A modifié l'utilisateur {user.get_full_name() or user.username}", request)

        return Response({
            'user': UserSerializer(user).data,
            'profile': UserProfileSerializer(profile, context={'request': request}).data,
        })

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'error': 'Vous ne pouvez pas supprimer votre propre compte'}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_superuser:
            return Response({'error': 'Impossible de supprimer un super administrateur'}, status=status.HTTP_400_BAD_REQUEST)

        name = user.get_full_name() or user.username
        user.delete()

        log_activity(request.user, 'delete', 'Utilisateurs',
                   f"A supprimé l'utilisateur {name}", request)

        return Response({'status': 'Utilisateur supprimé avec succès'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()

        if request.data and 'new_password' in request.data:
            serializer = ResetPasswordSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            new_password = serializer.validated_data['new_password']
        else:
            alphabet = string.ascii_letters + string.digits
            new_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user.set_password(new_password)
        user.save()

        log_activity(request.user, 'update', 'Sécurité',
                   f"A réinitialisé le mot de passe de {user.get_full_name() or user.username}", request)

        return Response({'new_password': new_password, 'message': 'Mot de passe réinitialisé avec succès'})

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserDetailSerializer(request.user)
            return Response(serializer.data)
        serializer = SelfProfileSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if 'first_name' in serializer.validated_data:
            user.first_name = serializer.validated_data['first_name']
        if 'last_name' in serializer.validated_data:
            user.last_name = serializer.validated_data['last_name']
        if 'email' in serializer.validated_data:
            user.email = serializer.validated_data['email']
        user.save()
        profile = user.profile
        if 'phone_number' in serializer.validated_data:
            profile.phone_number = serializer.validated_data['phone_number']
        if 'address' in serializer.validated_data:
            profile.address = serializer.validated_data['address']
        if 'gender' in serializer.validated_data:
            profile.gender = serializer.validated_data['gender']
        if 'date_of_birth' in serializer.validated_data:
            profile.date_of_birth = serializer.validated_data['date_of_birth']
        if 'language' in serializer.validated_data:
            profile.language = serializer.validated_data['language']
        if 'preferred_academic_year' in serializer.validated_data:
            profile.preferred_academic_year = serializer.validated_data['preferred_academic_year']
        if 'profile_picture' in request.FILES:
            profile.profile_picture = request.FILES['profile_picture']
        profile.save()
        log_activity(request.user, 'update', 'Utilisateurs',
                   f"A modifié son profil", request)
        return Response(UserDetailSerializer(user).data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'user': request.user})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        log_activity(request.user, 'update', 'Sécurité',
                   "A changé son mot de passe", request)

        return Response({'message': 'Mot de passe changé avec succès'})

    @action(detail=False, methods=['post'])
    def heartbeat(self, request):
        if hasattr(request.user, 'profile'):
            request.user.profile.last_activity = timezone.now()
            request.user.profile.save(update_fields=['last_activity'])
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def logout(self, request):
        if hasattr(request.user, 'profile'):
            request.user.profile.last_activity = None
            request.user.profile.save(update_fields=['last_activity'])
        log_activity(request.user, 'logout', 'Authentification',
                   f"Déconnexion depuis {request.META.get('REMOTE_ADDR', '')}", request)
        from .notifications import notify_admins
        role_display = request.user.profile.get_role_display() if hasattr(request.user, 'profile') else ''
        notify_admins('logout',
            f"{request.user.get_full_name() or request.user.username} ({role_display}) s'est déconnecté",
            f"Déconnexion de {request.user.get_full_name() or request.user.username} ({role_display})")
        return Response({'message': 'Déconnecté avec succès'})

    @action(detail=False, methods=['get'])
    def roles(self, request):
        roles_data = []
        for role_key, role_label in UserProfile.ROLE_CHOICES:
            roles_data.append({
                'role': role_key,
                'label': role_label,
            })
        serializer = RoleSerializer(data=roles_data, many=True)
        serializer.is_valid()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = User.objects.count()
        active = User.objects.filter(is_active=True).count()
        by_role = {}
        for role_key, role_label in UserProfile.ROLE_CHOICES:
            count = UserProfile.objects.filter(role=role_key).count()
            by_role[role_key] = {'label': role_label, 'count': count}
        return Response({
            'total': total,
            'active': active,
            'inactive': total - active,
            'by_role': by_role,
        })

    @action(detail=False, methods=['get'])
    def online(self, request):
        cutoff = timezone.now() - timedelta(minutes=5)
        profiles = UserProfile.objects.filter(last_activity__gte=cutoff, is_active=True).select_related('user')
        data = []
        for p in profiles:
            data.append({
                'id': p.user.id,
                'username': p.user.username,
                'full_name': p.user.get_full_name() or p.user.username,
                'role': p.role,
                'role_display': p.get_role_display(),
                'last_activity': p.last_activity,
            })
        return Response(data)


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, CanViewActivity]

    def get_queryset(self):
        queryset = ActivityLog.objects.all().select_related('user')
        action = self.request.query_params.get('action')
        module = self.request.query_params.get('module')
        user_id = self.request.query_params.get('user_id')
        days = self.request.query_params.get('days')

        if action:
            queryset = queryset.filter(action=action)
        if module:
            queryset = queryset.filter(module__icontains=module)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if days:
            try:
                from django.utils import timezone
                from datetime import timedelta
                queryset = queryset.filter(timestamp__gte=timezone.now() - timedelta(days=int(days)))
            except ValueError:
                pass
        return queryset[:200]

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        ActivityLog.objects.all().delete()
        log_activity(request.user, 'delete', 'Activités', "A vidé tous les journaux d'activité", request)
        return Response({'status': 'Journaux supprimés avec succès'})

    @action(detail=False, methods=['get'])
    def modules(self, request):
        modules = (ActivityLog.objects.values_list('module', flat=True)
                  .distinct().order_by('module'))
        return Response(list(modules))


class LoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoginAttempt.objects.all()
    serializer_class = LoginAttemptSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        queryset = LoginAttempt.objects.all()
        days = self.request.query_params.get('days')
        successful = self.request.query_params.get('successful')
        if days:
            try:
                queryset = queryset.filter(timestamp__gte=timezone.now() - timedelta(days=int(days)))
            except ValueError:
                pass
        if successful is not None:
            queryset = queryset.filter(successful=successful.lower() == 'true')
        return queryset[:100]


from rest_framework import serializers as drf_serializers

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'name'

    def get_queryset(self):
        return Role.objects.all().order_by('name')

    def perform_create(self, serializer):
        role = serializer.save()
        log_activity(self.request.user, 'create', 'Permissions',
                   f"A créé le rôle {role.display_name}", self.request)

    def perform_update(self, serializer):
        role = serializer.save()
        log_activity(self.request.user, 'update', 'Permissions',
                   f"A modifié les permissions du rôle {role.display_name}", self.request)

    def perform_destroy(self, serializer):
        role = self.get_object()
        name = role.display_name
        role.delete()
        log_activity(self.request.user, 'delete', 'Permissions',
                   f"A supprimé le rôle {name}", self.request)

    @action(detail=False, methods=['get'])
    def modules(self, request):
        modules = [
            {'key': 'students', 'label': 'Élèves', 'icon': 'Users'},
            {'key': 'teachers', 'label': 'Enseignants', 'icon': 'ChalkboardTeacher'},
            {'key': 'grades', 'label': 'Notes', 'icon': 'ClipboardList'},
            {'key': 'results', 'label': 'Résultats', 'icon': 'Award'},
            {'key': 'payments', 'label': 'Paiements', 'icon': 'DollarSign'},
            {'key': 'bulletins', 'label': 'Bulletins', 'icon': 'FileText'},
            {'key': 'classes', 'label': 'Classes', 'icon': 'BookOpen'},
            {'key': 'subjects', 'label': 'Matières', 'icon': 'Book'},
            {'key': 'attendance', 'label': 'Absences', 'icon': 'CalendarCheck'},
            {'key': 'timetable', 'label': 'Emploi du temps', 'icon': 'Clock'},
            {'key': 'reports', 'label': 'Rapports', 'icon': 'BarChart3'},
            {'key': 'dashboard', 'label': 'Tableau de bord', 'icon': 'LayoutDashboard'},
            {'key': 'users', 'label': 'Utilisateurs', 'icon': 'UserCog'},
            {'key': 'activity', 'label': 'Activités', 'icon': 'Activity'},
            {'key': 'security', 'label': 'Sécurité', 'icon': 'Shield'},
            {'key': 'registrations', 'label': 'Inscriptions', 'icon': 'ClipboardCheck'},
            {'key': 'rooms', 'label': 'Salles', 'icon': 'DoorOpen'},
        ]
        return Response(modules)

    @action(detail=True, methods=['post'])
    def reset_defaults(self, request, name=None):
        role = self.get_object()
        default_perms = DEFAULT_ROLE_PERMISSIONS.get(role.name, [])
        role.permissions = default_perms
        role.save()
        log_activity(request.user, 'update', 'Permissions',
                   f"A réinitialisé les permissions du rôle {role.display_name}", request)
        return Response(RoleSerializer(role).data)
