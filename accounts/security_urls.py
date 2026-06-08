from django.urls import path
from .security_dashboard import security_dashboard

urlpatterns = [
    path('dashboard/', security_dashboard, name='security-dashboard'),
]
