import uuid
import re
from rest_framework import serializers
from .models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'license_key',
            'is_active', 'is_pending', 'license_start', 'license_end',
            'contact_email', 'contact_phone', 'notes',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at',
                           'license_key', 'is_pending']

    def validate_subdomain(self, value):
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError(
                "Le sous-domaine ne peut contenir que des lettres minuscules, chiffres et tirets"
            )
        return value.lower()


def _generate_subdomain(name):
    base = re.sub(r'[^a-z0-9]', '-', name.lower()).strip('-')
    base = re.sub(r'-+', '-', base)[:30]
    from .models import Tenant
    subdomain = base
    n = 1
    while Tenant.objects.filter(subdomain=subdomain).exists():
        subdomain = f"{base}-{n}"
        n += 1
    return subdomain


def _generate_license_key():
    return f"LIC-{uuid.uuid4().hex[:12].upper()}"


class PublicTenantRegistrationSerializer(serializers.Serializer):
    school_name = serializers.CharField(max_length=200, label="Nom de l'école")
    admin_username = serializers.CharField(max_length=150, label="Nom d'utilisateur")
    admin_email = serializers.EmailField(label="Email")
    admin_password = serializers.CharField(min_length=8, write_only=True, label="Mot de passe")
    admin_first_name = serializers.CharField(max_length=100, label="Prénom")
    admin_last_name = serializers.CharField(max_length=100, label="Nom")
    contact_phone = serializers.CharField(max_length=15, required=False, allow_blank=True, label="Téléphone")

    def validate_school_name(self, value):
        from .models import Tenant
        if Tenant.objects.filter(name=value).exists():
            raise serializers.ValidationError("Cette école est déjà inscrite")
        return value

    def validate_admin_username(self, value):
        from django.contrib.auth.models import User
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris")
        return value