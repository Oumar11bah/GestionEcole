from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, ParentViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'parents', ParentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
