from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeTypeViewSet, PaymentViewSet, PaymentHistoryViewSet

router = DefaultRouter()
router.register(r'fee-types', FeeTypeViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'payment-history', PaymentHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
