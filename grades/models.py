from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from students.models import Student
from subjects.models import Subject, TeacherSubject
from tenants.models import Tenant
from django.db.models import Sum, Count, F

class Term(models.Model):
    name = models.CharField(max_length=20)
    academic_year = models.CharField(max_length=9, default='2024-2025')
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.academic_year}"

    class Meta:
        unique_together = ('name', 'academic_year')

class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    teacher_subject = models.ForeignKey(TeacherSubject, on_delete=models.CASCADE, related_name='grades')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='grades')
    homework1 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Devoir 1')
    homework2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Devoir 2')
    composition = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Composition')
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    locked = models.BooleanField(default=False)
    date_recorded = models.DateField(auto_now_add=True)
    comment = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'teacher_subject', 'term')

    def __str__(self):
        return f"{self.student} - {self.teacher_subject.subject} - {self.average}/20"

    @property
    def cycle_max_score(self):
        try:
            cycle_name = self.student.class_assigned.cycle.name if self.student.class_assigned and self.student.class_assigned.cycle else None
            return 10 if cycle_name == 'primaire' else 20
        except:
            return 20

    @property
    def average(self):
        scores = []
        coefficients = []

        if self.homework1 is not None:
            scores.append(float(self.homework1))
            coefficients.append(1)
        if self.homework2 is not None:
            scores.append(float(self.homework2))
            coefficients.append(1)
        if self.composition is not None:
            scores.append(float(self.composition))
            coefficients.append(2)

        if not scores:
            return None

        max_score = float(self.cycle_max_score)
        total_weighted_score = sum(s * c for s, c in zip(scores, coefficients))
        total_coeff = sum(coefficients)

        if total_coeff == 0:
            return None

        return round((total_weighted_score / (max_score * total_coeff)) * max_score, 2)

    @property
    def appreciation(self):
        avg = self.average
        if avg is None:
            return '\u2014'
        max_score = self.cycle_max_score
        half = max_score / 2
        if avg >= max_score * 0.8:
            return 'Tr\u00e8s bien'
        elif avg >= max_score * 0.7:
            return 'Bien'
        elif avg >= max_score * 0.6:
            return 'Assez bien'
        elif avg >= half:
            return 'Passable'
        else:
            return 'Insuffisant'

class StudentAverage(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='averages')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='student_averages')
    average = models.DecimalField(max_digits=5, decimal_places=2)
    rank = models.IntegerField(null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'term')

    def __str__(self):
        return f"{self.student} - {self.term}: {self.average}"

    @classmethod
    def calculate_average(cls, student, term):
        grades = Grade.objects.filter(student=student, term=term)
        if not grades.exists():
            return None
        total_weighted = sum(
            (float(grade.average or 0) / float(grade.max_score)) * grade.teacher_subject.subject.coefficient
            for grade in grades if grade.average is not None
        )
        total_coeffs = sum(grade.teacher_subject.subject.coefficient for grade in grades if grade.average is not None)
        if total_coeffs == 0:
            return None
        average = (total_weighted / total_coeffs) * 20
        return round(average, 2)

    @classmethod
    def update_rankings(cls, term, tenant=None):
        averages = cls.objects.filter(term=term)
        if tenant:
            averages = averages.filter(tenant=tenant)
        averages = averages.order_by('-average')
        for rank, avg in enumerate(averages, start=1):
            cls.objects.filter(id=avg.id).update(rank=rank)

class GradeHistory(models.Model):
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    field_name = models.CharField(max_length=50)
    old_value = models.CharField(max_length=50, null=True, blank=True)
    new_value = models.CharField(max_length=50, null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.grade} - {self.field_name}: {self.old_value} -> {self.new_value}"

@receiver(post_save, sender=Grade)
@receiver(post_delete, sender=Grade)
def update_student_average(sender, instance, **kwargs):
    student = instance.student
    term = instance.term
    tenant = instance.tenant
    average = StudentAverage.calculate_average(student, term)
    if average is not None:
        defaults = {'average': average}
        if tenant:
            defaults['tenant'] = tenant
        StudentAverage.objects.update_or_create(
            student=student,
            term=term,
            defaults=defaults
        )
    else:
        StudentAverage.objects.filter(student=student, term=term).delete()
    StudentAverage.update_rankings(term, tenant=tenant)
