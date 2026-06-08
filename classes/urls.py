from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CycleViewSet, ClassViewSet, ScheduleEntryViewSet

router = DefaultRouter()
router.register(r'cycles', CycleViewSet)
router.register(r'classes', ClassViewSet)
router.register(r'schedule', ScheduleEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
