from django.db import models
from students.models import Student
from classes.models import Class
from tenants.models import Tenant

class Registration(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('cancelled', 'Annulé'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Non payé'),
        ('partial', 'Partiel'),
        ('paid', 'Payé'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='registrations')
    registration_date = models.DateField(auto_now_add=True)
    academic_year = models.CharField(max_length=9, default='2024-2025')
    class_assigned = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, blank=True, related_name='registrations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    registration_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    is_re_registration = models.BooleanField(default=False)
    previous_class = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, blank=True, related_name='previous_registrations')
    notes = models.TextField(blank=True)
    validated_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-registration_date']
        unique_together = ('student', 'academic_year')

    def __str__(self):
        return f"{self.student} - {self.academic_year} ({self.get_status_display()})"
