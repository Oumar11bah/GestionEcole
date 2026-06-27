"""
URL configuration for GestionEcole project.
"""
import os
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve as static_serve
from accounts.media_serving import serve_protected_file

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/students/', include('students.urls')),
    path('api/teachers/', include('teachers.urls')),
    path('api/classes/', include('classes.urls')),
    path('api/subjects/', include('subjects.urls')),
    path('api/grades/', include('grades.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/communication/', include('communication.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/mobile/', include('mobile_payments.urls')),
    path('api/registrations/', include('registrations.urls')),
    path('api/rooms/', include('rooms.urls')),
    path('api/results/', include('results.urls')),
    path('api/school/', include('school.urls')),
    path('api/security/', include('accounts.security_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

REACT_STATIC_ROOT = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'static')
if os.path.isdir(REACT_STATIC_ROOT):
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', static_serve,
                {'document_root': REACT_STATIC_ROOT}),
    ]

urlpatterns += [re_path(r'^.*$', TemplateView.as_view(template_name='index.html'))]
