from django.db import models
from teachers.models import Teacher
from tenants.models import Tenant

class Cycle(models.Model):
    CYCLE_CHOICES = [
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
        ('prescolaire', 'Préscolaire'),
    ]

    name = models.CharField(max_length=20, choices=CYCLE_CHOICES)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('name', 'tenant')

    def __str__(self):
        return self.get_name_display()

class Class(models.Model):
    SPECIALTY_CHOICES = [
        ('maths', 'Sciences Mathématiques'),
        ('experimental', 'Sciences Expérimentales'),
        ('sociales', 'Sciences Sociales'),
        ('lettres', 'Lettres'),
        ('none', 'Aucune'),
    ]

    SPECIALTY_SHORT = {
        'maths': 'SM',
        'experimental': 'SE',
        'sociales': 'SS',
        'lettres': 'L',
        'none': '',
    }

    name = models.CharField(max_length=50)
    cycle = models.ForeignKey(Cycle, on_delete=models.CASCADE, related_name='classes')
    specialty = models.CharField(max_length=20, choices=SPECIALTY_CHOICES, default='none', blank=True)
    class_teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='main_classes')
    capacity = models.IntegerField(default=40, help_text="Capacité maximale d'élèves")
    main_room = models.ForeignKey('rooms.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_classes')
    academic_year = models.CharField(max_length=9, default='2024-2025')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('name', 'cycle', 'specialty', 'academic_year', 'tenant')

    @property
    def display_name(self):
        if self.cycle.name == 'lycee' and self.specialty and self.specialty != 'none':
            short = self.SPECIALTY_SHORT.get(self.specialty, '')
            return f"{self.name} {short}"
        return self.name

    def __str__(self):
        return self.display_name

    def student_count(self):
        from students.models import Student
        return Student.objects.filter(class_assigned=self).count()

class ScheduleEntry(models.Model):
    DAY_CHOICES = [
        ('monday', 'Lundi'),
        ('tuesday', 'Mardi'),
        ('wednesday', 'Mercredi'),
        ('thursday', 'Jeudi'),
        ('friday', 'Vendredi'),
        ('saturday', 'Samedi'),
    ]

    day = models.CharField(max_length=20, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='schedule_entries')
    subject_name = models.CharField(max_length=100)
    teacher_name = models.CharField(max_length=200, blank=True)
    room = models.CharField(max_length=20, blank=True)
    observation = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.subject_name} - {self.day} {self.start_time}-{self.end_time}"

    class Meta:
        ordering = ['day', 'start_time']
