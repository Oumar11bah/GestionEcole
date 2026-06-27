from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
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


@api_view(['POST'])
@permission_classes([AllowAny])
def setup_admin(request):
    if User.objects.filter(is_superuser=True).exists():
        return Response(
            {'error': 'Un administrateur existe déjà. Connectez-vous pour créer d\'autres utilisateurs.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    confirm_password = request.data.get('confirm_password', '')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()

    if not username or not password:
        return Response({'error': 'Nom d\'utilisateur et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({'error': 'Les mots de passe ne correspondent pas.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Ce nom d\'utilisateur existe déjà.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_superuser(
            username=username,
            password=password,
            first_name=first_name or username,
            last_name=last_name or '',
        )
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'admin'
        profile.save()

        return Response({
            'message': 'Administrateur créé avec succès. Vous pouvez maintenant vous connecter.',
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(length))


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def log_activity(user, action, module, description, request=None):
    ActivityLog.objects.create(
        user=user,
        username=user.get_full_name() or user.username if user else 'Système',
        action=action,
        module=module,
        description=description,
        ip_address=get_client_ip(request) if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
    )


MAX_NORMAL_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 30
BONUS_ATTEMPTS = 2
MAX_FAILURES_BEFORE_BLOCK = MAX_NORMAL_ATTEMPTS + BONUS_ATTEMPTS  # 7

from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '30/minute'


@api_view(['GET'])
@permission_classes([AllowAny])
def login_state(request):
    username = request.query_params.get('username', '')
    if not username:
        return Response({'state': 'clean'})

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'state': 'clean'})

    ip_address = get_client_ip(request)
    school_info = None

    if not user.is_active:
        from school.models import SchoolInfo
        school_info = SchoolInfo.objects.first()
        return Response({
            'state': 'blocked',
            'blocked': True,
            'error': 'Compte temporairement bloqué',
            'admin_contact': {
                'phone': school_info.phone if school_info else '',
                'email': school_info.email if school_info else '',
            }
        })

    try:
        lockout = LoginLockout.objects.get(user=user, ip_address=ip_address)
        remaining = max(0, MAX_FAILURES_BEFORE_BLOCK - lockout.attempts)

        if lockout.locked_until and lockout.locked_until > timezone.now():
            remaining_seconds = int((lockout.locked_until - timezone.now()).total_seconds())
            return Response({
                'state': 'locked',
                'locked': True,
                'lockout_seconds': remaining_seconds,
                'error': f"Requête ralentie. Disponible à nouveau dans {remaining_seconds} seconde(s).",
            })

        if lockout.attempts >= MAX_FAILURES_BEFORE_BLOCK:
            return Response({
                'state': 'blocked',
                'blocked': True,
                'error': 'Compte bloqué après plusieurs tentatives échouées',
            })
    except LoginLockout.DoesNotExist:
        pass

    return Response({'state': 'clean'})


class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        ip_address = get_client_ip(request)
        from school.models import SchoolInfo

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            user = None

        # Permanently blocked user
        if user and not user.is_active:
            school_info = SchoolInfo.objects.first()
            return Response({
                'error': 'Compte bloqué après plusieurs tentatives échouées',
                'blocked': True,
                'attempts_remaining': 0,
                'admin_contact': {
                    'phone': school_info.phone if school_info else '',
                    'email': school_info.email if school_info else '',
                }
            }, status=status.HTTP_403_FORBIDDEN)

        lockout = None
        if user:
            try:
                lockout = LoginLockout.objects.get(user=user, ip_address=ip_address)

                # Active temp lockout (45s delay)
                if lockout.locked_until and lockout.locked_until > timezone.now():
                    remaining_seconds = int((lockout.locked_until - timezone.now()).total_seconds())
                    LoginAttempt.objects.create(
                        user=user, username=username, ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        successful=False
                    )
                    return Response({
                        'error': f"Requête ralentie. Disponible à nouveau dans {remaining_seconds} seconde(s).",
                        'locked': True,
                        'lockout_seconds': remaining_seconds,
                    }, status=status.HTTP_423_LOCKED)

                # Lockout expired — unlock and let them try bonus attempts
                elif lockout.locked_until and lockout.locked_until <= timezone.now():
                    lockout.locked_until = None
                    lockout.save()
            except LoginLockout.DoesNotExist:
                pass

        # Attempt authentication
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Login success — reset everything
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
            return response

        # --- Login failed ---
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
                lockout_obj.save()

            attempts = lockout_obj.attempts
            remaining = max(0, MAX_FAILURES_BEFORE_BLOCK - attempts)
            is_last_attempt = (remaining == 1)

            if attempts > MAX_FAILURES_BEFORE_BLOCK:
                # Permanent block
                user.is_active = False
                user.save()
                log_activity(None, 'other', 'Sécurité',
                    f"Blocage automatique du compte {user.username} après {attempts} échecs de connexion depuis {ip_address}",
                    request)
                from .notifications import notify_admins
                notify_admins('security',
                    f"🔒 Compte bloqué : {user.get_full_name() or user.username}",
                    f"Le compte {user.username} a été automatiquement bloqué après {attempts} tentatives échouées depuis {ip_address}.")
                school_info = SchoolInfo.objects.first()
                return Response({
                    'error': 'Compte bloqué après plusieurs tentatives échouées',
                    'blocked': True,
                    'attempts_remaining': 0,
                    'admin_contact': {
                        'phone': school_info.phone if school_info else '',
                        'email': school_info.email if school_info else '',
                    }
                }, status=status.HTTP_403_FORBIDDEN)

            if attempts == MAX_NORMAL_ATTEMPTS + 1:
                # Trigger 30s lockout
                lockout_obj.locked_until = timezone.now() + timedelta(seconds=LOCKOUT_DURATION_SECONDS)
                lockout_obj.save()
                return Response({
                    'error': f"Requête ralentie. Disponible à nouveau dans {LOCKOUT_DURATION_SECONDS} secondes.",
                    'locked': True,
                    'lockout_seconds': LOCKOUT_DURATION_SECONDS,
                    'attempts_remaining': BONUS_ATTEMPTS,
                }, status=status.HTTP_423_LOCKED)

            # Normal or bonus-zone failure
            err_msg = "Nom d'utilisateur ou mot de passe incorrect"
            if attempts > MAX_NORMAL_ATTEMPTS:
                err_msg = f"Tentative échouée. Il vous reste {remaining} tentative(s)."

            response_data = {
                'error': err_msg,
                'attempts_remaining': remaining,
                'locked': False,
                'is_last_attempt': is_last_attempt if attempts > MAX_NORMAL_ATTEMPTS else False,
            }
            return Response(response_data, status=status.HTTP_401_UNAUTHORIZED)

        # User doesn't exist in DB — generic error
        return Response({
            'error': "Nom d'utilisateur ou mot de passe incorrect",
            'attempts_remaining': 0,
            'locked': False,
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_contact(request):
    from school.models import SchoolInfo
    school_info = SchoolInfo.objects.first()
    return Response({
        'phone': school_info.phone if school_info else '',
        'email': school_info.email if school_info else '',
    })


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
                   f"Déconnexion depuis {get_client_ip(request)}", request)
        from .notifications import notify_admins
        role_display = request.user.profile.get_role_display() if hasattr(request.user, 'profile') else ''
        notify_admins('logout',
            f"{request.user.get_full_name() or request.user.username} ({role_display}) s'est déconnecté",
            f"Déconnexion de {request.user.get_full_name() or request.user.username} ({role_display})")
        return Response({'message': 'Déconnecté avec succès'})

    @action(detail=False, methods=['get'])
    def roles(self, request):
        assigned_roles = set()
        for role_key, _ in UserProfile.ROLE_CHOICES:
            if UserProfile.objects.filter(role=role_key).exists():
                assigned_roles.add(role_key)
        roles_data = []
        for role_key, role_label in UserProfile.ROLE_CHOICES:
            if role_key in assigned_roles:
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

    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()

        LoginLockout.objects.filter(user=user).delete()

        log_activity(request.user, 'update', 'Sécurité',
                   f"A débloqué le compte de {user.get_full_name() or user.username}", request)
        from .notifications import notify_admins
        notify_admins('security',
            f"🔓 Compte débloqué : {user.get_full_name() or user.username}",
            f"Le compte {user.username} a été débloqué par {request.user.get_full_name() or request.user.username}.")

        profile = UserProfile.objects.get(user=user)
        return Response({
            'message': f"Compte de {user.get_full_name() or user.username} débloqué avec succès.",
            'user': UserSerializer(user).data,
            'profile': UserProfileSerializer(profile, context={'request': request}).data,
        })


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        user = self.request.user
        if user.profile.role not in ['super_admin', 'admin', 'directeur']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les administrateurs peuvent supprimer des activités")
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        if user.profile.role in ['super_admin', 'admin', 'directeur']:
            queryset = ActivityLog.objects.all().select_related('user')
        else:
            queryset = ActivityLog.objects.filter(user=user).select_related('user')
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

    @action(detail=False, methods=['delete', 'post'])
    def clear_all(self, request):
        user = request.user
        if user.profile.role not in ['super_admin', 'admin', 'directeur']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les administrateurs peuvent vider les journaux")
        ActivityLog.objects.all().delete()
        from dashboard.models import ActivityLog as DashboardActivityLog
        DashboardActivityLog.objects.all().delete()
        return Response({'status': 'Journaux supprimés avec succès'})

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Aucun ID fourni'}, status=status.HTTP_400_BAD_REQUEST)
        count = ActivityLog.objects.filter(id__in=ids).delete()[0]
        return Response({'status': f'{count} activité(s) supprimée(s)'})

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
