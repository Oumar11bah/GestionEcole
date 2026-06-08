from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

class Teacher(models.Model):
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    CONTRACT_CHOICES = [
        ('full_time', 'Temps plein'),
        ('part_time', 'Partiel'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile', null=True, blank=True)
    matricule = models.CharField(max_length=50, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to='teachers/', blank=True, null=True)
    specialty = models.CharField(max_length=100, blank=True)
    diploma = models.CharField(max_length=200, blank=True)
    years_of_experience = models.IntegerField(default=0)
    hire_date = models.DateField(auto_now_add=True)
    contract_type = models.CharField(max_length=20, choices=CONTRACT_CHOICES, default='full_time')
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_first_name = self.first_name
        self._original_last_name = self.last_name
        self._original_date_of_birth = self.date_of_birth

    def _generate_matricule(self):
        import random
        dob = self.date_of_birth
        if isinstance(dob, str):
            dob = datetime.strptime(dob, '%Y-%m-%d').date()
        base = self.first_name[-2:].upper() + str(dob.year)[-2:] + self.last_name[-1:].upper()
        while True:
            matricule = base + str(random.randint(10, 99))
            if not Teacher.objects.filter(matricule=matricule).exists():
                return matricule

    def save(self, *args, **kwargs):
        fields_changed = (
            self.first_name != self._original_first_name
            or self.last_name != self._original_last_name
            or str(self.date_of_birth) != str(self._original_date_of_birth)
        )
        if not self.matricule or fields_changed:
            self.matricule = self._generate_matricule()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.matricule})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class SalaryHistory(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='salary_history')
    month = models.CharField(max_length=7, help_text="Mois (YYYY-MM)")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_date = models.DateField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-month', 'teacher']
        unique_together = ('teacher', 'month')

    def __str__(self):
        return f"{self.teacher} - {self.month} - {self.amount} FCFA"
