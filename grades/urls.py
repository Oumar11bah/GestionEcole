from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TermViewSet, GradeViewSet, GradeHistoryViewSet, StudentAverageViewSet

router = DefaultRouter()
router.register(r'terms', TermViewSet)
router.register(r'grades', GradeViewSet)
router.register(r'history', GradeHistoryViewSet)
router.register(r'averages', StudentAverageViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
