from django.db import models
from django.db.models import UniqueConstraint
from django.contrib.auth.models import User
from classes.models import Class
from tenants.models import Tenant
from datetime import datetime

class Parent(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile', null=True, blank=True)
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    quartier = models.CharField(max_length=100, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    profession = models.CharField(max_length=100, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

class Student(models.Model):
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('suspended', 'Suspendu'),
        ('expelled', 'Radié'),
    ]

    matricule = models.CharField(max_length=50, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    place_of_birth = models.CharField(max_length=100, blank=True)
    photo = models.ImageField(upload_to='students/', blank=True, null=True)
    parent = models.ForeignKey(Parent, on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    class_assigned = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    academic_year = models.CharField(max_length=9, default='2024-2025')
    enrollment_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    quartier = models.CharField(max_length=100, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True, default='Guinée')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
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
            qs = Student.objects.filter(matricule=matricule)
            if self.tenant:
                qs = qs.filter(tenant=self.tenant)
            if not qs.exists():
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

    class Meta:
        unique_together = ('matricule', 'tenant')
