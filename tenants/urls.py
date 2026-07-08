from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, reset_tenant_admin_password

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tenants/<int:tenant_id>/reset_admin_password/', reset_tenant_admin_password, name='tenant-reset-admin-password'),
]
