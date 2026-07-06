from django.db import models
from students.models import Student
from teachers.models import Teacher
from tenants.models import Tenant

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Présent'),
        ('absent', 'Absent'),
        ('late', 'En retard'),
        ('excused', 'Excusé'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    recorded_by = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, related_name='recorded_attendances')
    comment = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('student', 'date')
    
    def __str__(self):
        return f"{self.student} - {self.date}: {self.get_status_display()}"
