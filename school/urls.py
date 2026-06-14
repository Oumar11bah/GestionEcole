from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicYearViewSet, SchoolInfoViewSet, SemesterViewSet

router = DefaultRouter()
router.register(r'school', SchoolInfoViewSet)
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'semesters', SemesterViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
