from django.db import models
from tenants.models import Tenant

class AcademicYear(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True,
                               related_name='academic_years')
    name = models.CharField(max_length=9, help_text="Ex: 2024-2025")
    is_active = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Année académique"
        verbose_name_plural = "Années académiques"
        ordering = ['-name']
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'name'], name='unique_academic_year_per_tenant')
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_active:
            AcademicYear.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

class Semester(models.Model):
    name = models.CharField(max_length=50, help_text="Ex: Semestre 1, Trimestre 1")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='semesters')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0, help_text="Ordre d'affichage")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Semestre"
        verbose_name_plural = "Semestres"
        ordering = ['academic_year', 'order']

    def __str__(self):
        return f"{self.name} ({self.academic_year})"

    def save(self, *args, **kwargs):
        if self.is_active:
            Semester.objects.filter(academic_year=self.academic_year, is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

class SchoolInfo(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True,
                               related_name='school_info')
    name = models.CharField(max_length=200, default="École")
    acronym = models.CharField(max_length=20, blank=True, help_text="Sigle de l'école")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='school/', blank=True, null=True)
    director_signature = models.ImageField(upload_to='school/', blank=True, null=True)
    director_name = models.CharField(max_length=200, blank=True)
    academic_year = models.CharField(max_length=9, default='2024-2025')
    primary_color = models.CharField(max_length=7, default='#1e40af', help_text="Couleur primaire (hex)")
    secondary_color = models.CharField(max_length=7, default='#3b82f6', help_text="Couleur secondaire (hex)")
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Guinée')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Information de l'école"
        verbose_name_plural = "Informations de l'école"
        unique_together = ['tenant', 'id']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
