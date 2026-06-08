from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassResultViewSet

router = DefaultRouter()
router.register(r'results', ClassResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
