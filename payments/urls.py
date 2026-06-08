from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeTypeViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'fee-types', FeeTypeViewSet)
router.register(r'payments', PaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
