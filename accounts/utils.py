from .models import UserProfile

def get_user_role(user):
    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        return None

def has_profile_access(user, module):
    try:
        return user.profile.can_access(module)
    except UserProfile.DoesNotExist:
        return False


def get_request_tenant(request):
    """Returns the tenant for the request user, or None for super_admin."""
    user = request.user
    if user.is_anonymous:
        return None
    role = get_user_role(user)
    if role == 'super_admin':
        return None
    try:
        return user.profile.tenant
    except UserProfile.DoesNotExist:
        return None


class TenantAwareMixin:
    """Mixin for viewsets that should be scoped to the current user's tenant.
    super_admin users see no school data (empty queryset).
    """

    def _get_tenant(self):
        return get_request_tenant(self.request)

    def get_queryset(self):
        qs = super().get_queryset()
        role = get_user_role(self.request.user)
        if role == 'super_admin':
            return qs.none()
        tenant = self._get_tenant()
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        return qs

    def perform_create(self, serializer):
        role = get_user_role(self.request.user)
        if role == 'super_admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Les super administrateurs ne peuvent pas créer de données dans une école")
        tenant = self._get_tenant()
        if tenant is not None:
            serializer.save(tenant=tenant)
        else:
            serializer.save()
