from django.db import models
from django.contrib.auth.models import User


class Tenant(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom de l'école")
    subdomain = models.CharField(
        max_length=50, unique=True,
        verbose_name="Sous-domaine",
        help_text="Ex: ecole-a (sera utilisé comme identifiant URL)"
    )
    license_key = models.CharField(
        max_length=100, unique=True,
        verbose_name="Clé de licence"
    )
    license_start = models.DateField(
        null=True, blank=True, verbose_name="Date de début de licence"
    )
    license_end = models.DateField(
        null=True, blank=True, verbose_name="Date de fin de licence"
    )
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    is_pending = models.BooleanField(
        default=True, verbose_name="En attente d'activation",
        help_text="Un nouveau tenant est en attente jusqu'à activation par le super admin"
    )
    contact_email = models.EmailField(blank=True, verbose_name="Email de contact")
    contact_phone = models.CharField(max_length=15, blank=True, verbose_name="Téléphone")
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_tenants', verbose_name="Créé par"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Client (établissement)"
        verbose_name_plural = "Clients (établissements)"
        ordering = ['-created_at']

    def __str__(self):
        status = "✓" if self.is_active else "✗"
        return f"{self.name} [{status}] ({self.subdomain})"

    def clean(self):
        pass

    def active_users_count(self):
        from accounts.models import UserProfile
        return UserProfile.objects.filter(tenant=self, is_active=True).count()

    def active_students_count(self):
        from students.models import Student
        return Student.objects.filter(tenant=self, status='active').count()

    def is_expired(self):
        if self.license_end:
            from django.utils import timezone
            return timezone.now().date() > self.license_end
        return False
