from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicYearViewSet, SchoolInfoViewSet

router = DefaultRouter()
router.register(r'school', SchoolInfoViewSet)
router.register(r'academic-years', AcademicYearViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
