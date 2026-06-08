from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile, ActivityLog, LoginAttempt, Role

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined', 'last_login']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    role_display = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'role', 'role_display', 'phone_number', 'address',
                  'profile_picture',
                  'gender', 'date_of_birth', 'date_of_hire', 'is_active',
                  'language', 'preferred_academic_year', 'last_activity',
                  'permissions',
                  'created_by', 'created_at', 'updated_at']
        read_only_fields = ['profile_picture', 'created_at', 'updated_at', 'created_by']

    def get_role_display(self, obj):
        return obj.get_role_display()

    def get_permissions(self, obj):
        role_obj = Role.get_or_default(obj.role)
        return role_obj.permissions


class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login', 'profile']


class UserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.CharField()

    def validate_role(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Le rôle '{value}' n'existe pas")
        return value
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False)
    gender = serializers.ChoiceField(choices=[('M', 'Masculin'), ('F', 'Féminin')], required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    date_of_hire = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    generated_password = serializers.CharField(read_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà")
        return value

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for f in ['date_of_birth', 'date_of_hire']:
            if f in data and not data.get(f):
                data[f] = None
        return super().to_internal_value(data)


class UserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    is_active = serializers.BooleanField(required=False)
    role = serializers.CharField(required=False)

    def validate_role(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Le rôle '{value}' n'existe pas")
        return value
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False)
    gender = serializers.ChoiceField(choices=[('M', 'Masculin'), ('F', 'Féminin')], required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    date_of_hire = serializers.DateField(required=False, allow_null=True)
    language = serializers.CharField(max_length=10, required=False, allow_blank=True)
    preferred_academic_year = serializers.CharField(max_length=20, required=False, allow_blank=True)


class SelfProfileSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False)
    gender = serializers.ChoiceField(choices=[('M', 'Masculin'), ('F', 'Féminin')], required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    language = serializers.CharField(max_length=10, required=False, allow_blank=True)
    preferred_academic_year = serializers.CharField(max_length=20, required=False, allow_blank=True)


class UserListSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    last_login_formatted = serializers.SerializerMethodField()
    date_joined_formatted = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'date_joined', 'date_joined_formatted', 'last_login', 'last_login_formatted', 'profile', 'created_by_name']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_last_login_formatted(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%d/%m/%Y %H:%M')
        return 'Jamais'

    def get_date_joined_formatted(self, obj):
        return obj.date_joined.strftime('%d/%m/%Y')

    def get_created_by_name(self, obj):
        if hasattr(obj, 'profile') and obj.profile.created_by:
            return obj.profile.created_by.get_full_name() or obj.profile.created_by.username
        return '-'


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_name', 'username', 'action', 'module',
                  'description', 'ip_address', 'timestamp']
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return obj.username


class LoginAttemptSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LoginAttempt
        fields = ['id', 'user', 'user_name', 'username', 'ip_address',
                  'successful', 'timestamp']
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return obj.username


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise AuthenticationFailed("Nom d'utilisateur ou mot de passe incorrect")
        data['user'] = UserSerializer(self.user).data
        data['profile'] = UserProfileSerializer(self.user.profile).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_current_password(self, value):
        user = self.context.get('user')
        if user and not user.check_password(value):
            raise serializers.ValidationError("Le mot de passe actuel est incorrect")
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return data


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return data


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    label = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['name', 'label', 'display_name', 'permissions', 'is_system', 'user_count']
        read_only_fields = ['is_system', 'user_count']
        extra_kwargs = {
            'name': {'required': True, 'allow_blank': False},
        }

    def get_label(self, obj):
        return obj.display_name

    def get_user_count(self, obj):
        return UserProfile.objects.filter(role=obj.name).count()

    def get_label(self, obj):
        return obj.display_name

    def get_user_count(self, obj):
        return UserProfile.objects.filter(role=obj.name).count()
