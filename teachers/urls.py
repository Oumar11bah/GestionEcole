from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherViewSet, SalaryHistoryViewSet

router = DefaultRouter()
router.register(r'teachers', TeacherViewSet)
router.register(r'salary-history', SalaryHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
