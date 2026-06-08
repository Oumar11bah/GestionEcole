from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StatisticViewSet, ActivityLogViewSet, DashboardViewSet

router = DefaultRouter()
router.register(r'statistics', StatisticViewSet)
router.register(r'activities', ActivityLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardViewSet.as_view({'get': 'stats'}), name='dashboard-stats'),
]
