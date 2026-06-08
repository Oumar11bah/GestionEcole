from django.db import models
from classes.models import Class, Cycle
from teachers.models import Teacher

class Subject(models.Model):
    SUBJECT_TYPE_CHOICES = [
        ('obligatoire', 'Obligatoire'),
        ('optionnelle', 'Optionnelle'),
    ]

    SPECIALTY_CHOICES = [
        ('none', 'Toutes séries'),
        ('maths', 'Sciences Mathématiques'),
        ('experimental', 'Sciences Expérimentales'),
        ('sociales', 'Sciences Sociales'),
        ('lettres', 'Lettres'),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    cycle = models.ManyToManyField(Cycle, related_name='subjects')
    description = models.TextField(blank=True)
    coefficient = models.IntegerField(default=1)
    color = models.CharField(max_length=7, default='#3B82F6', help_text="Couleur hexadécimale")
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE_CHOICES, default='obligatoire')
    specialty = models.CharField(max_length=20, choices=SPECIALTY_CHOICES, default='none', blank=True, help_text="Série lycée (none = toutes séries)")
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='responsible_subjects')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class TeacherSubject(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='subject_assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='teacher_assignments')
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='subject_teachers')
    academic_year = models.CharField(max_length=9, default='2024-2025')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('teacher', 'subject', 'class_assigned', 'academic_year')
    
    def __str__(self):
        return f"{self.teacher} - {self.subject} - {self.class_assigned}"
