from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MobilePaymentProviderViewSet

router = DefaultRouter()
router.register(r'providers', MobilePaymentProviderViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('callback/', MobilePaymentProviderViewSet.as_view({'post': 'callback'}), name='mobile-callback'),
]
