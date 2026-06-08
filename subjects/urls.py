from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, TeacherSubjectViewSet

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'teacher-subjects', TeacherSubjectViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
