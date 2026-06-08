from django.db import models
from students.models import Student
from classes.models import Class
from grades.models import Term

class ClassResult(models.Model):
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='results')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='class_results')
    academic_year = models.CharField(max_length=9)
    total_students = models.IntegerField(default=0)
    passed = models.IntegerField(default=0)
    failed = models.IntegerField(default=0)
    average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    best_student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='best_results')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('class_assigned', 'term')
        ordering = ['-academic_year', 'class_assigned']

    def __str__(self):
        return f"{self.class_assigned} - {self.term} ({self.academic_year})"
