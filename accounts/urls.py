from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    CustomTokenObtainPairView, UserViewSet, UserProfileViewSet,
    ActivityLogViewSet, LoginAttemptViewSet, RoleViewSet,
    setup_admin, login_state, admin_contact,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'profiles', UserProfileViewSet)
router.register(r'activities', ActivityLogViewSet, basename='activity')
router.register(r'login-attempts', LoginAttemptViewSet, basename='login-attempt')
router.register(r'roles', RoleViewSet)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('me/', UserViewSet.as_view({'get': 'me', 'patch': 'me'}), name='user-me'),
    path('change-password/', UserViewSet.as_view({'post': 'change_password'}), name='change_password'),
    path('logout/', UserViewSet.as_view({'post': 'logout'}), name='logout'),
    path('heartbeat/', UserViewSet.as_view({'post': 'heartbeat'}), name='heartbeat'),
    path('setup-admin/', setup_admin, name='setup-admin'),
    path('login-state/', login_state, name='login-state'),
    path('admin-contact/', admin_contact, name='admin-contact'),
    path('', include(router.urls)),
]
