from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from tenants.models import Tenant

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('comptable', 'Comptable'),
        ('directeur', 'Directeur'),
        ('surveillant', 'Surveillant'),
        ('enseignant', 'Enseignant'),
        ('secretaire', 'Secrétaire'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True,
                               related_name='user_profiles')
    role = models.CharField(max_length=50, default='secretaire')
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, choices=[('M', 'Masculin'), ('F', 'Féminin')])
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_hire = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    language = models.CharField(max_length=10, default='fr', choices=[('fr', 'Français'), ('en', 'English')])
    theme = models.CharField(max_length=10, default='light', choices=[('light', 'Clair'), ('dark', 'Sombre')])
    preferred_academic_year = models.CharField(max_length=20, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_profiles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#1e40af')
    secondary_color = models.CharField(max_length=7, default='#3b82f6')

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {Role.get_or_default(self.role).display_name}"

    class Meta:
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'

    def can_access(self, module):
        role_obj = Role.get_or_default(self.role)
        return role_obj.has_access(module)


DEFAULT_ROLE_PERMISSIONS = {
    'super_admin': ['*'],
    'admin': ['students', 'teachers', 'grades', 'results', 'payments', 'bulletins', 'classes', 'subjects', 'attendance', 'timetable', 'reports', 'dashboard', 'users', 'activity', 'security', 'registrations', 'rooms', 'settings'],
    'comptable': ['payments', 'reports', 'dashboard'],
    'directeur': ['dashboard', 'students', 'teachers', 'grades', 'results', 'bulletins', 'reports', 'activity'],
    'surveillant': ['attendance', 'students', 'dashboard'],
    'enseignant': ['timetable', 'grades', 'bulletins', 'dashboard'],
    'secretaire': ['registrations', 'students', 'reports', 'dashboard', 'rooms'],
}

class Role(models.Model):
    name = models.CharField(max_length=50)
    display_name = models.CharField(max_length=50)
    permissions = models.JSONField(default=list, blank=True,
        help_text="Liste des modules accessibles. Utilisez ['*'] pour tout accès.")
    is_system = models.BooleanField(default=False,
        help_text="Les rôles système ne peuvent pas être supprimés")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True,
        related_name='roles', verbose_name="Établissement")

    class Meta:
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'name'], name='unique_role_per_tenant')
        ]

    def __str__(self):
        return self.display_name

    def has_access(self, module):
        return '*' in self.permissions or module in self.permissions

    @classmethod
    def get_or_default(cls, role_name):
        role = cls.objects.filter(name=role_name, tenant__isnull=True).first()
        if role:
            return role
        try:
            return cls.objects.get(name=role_name)
        except cls.DoesNotExist:
            default_perms = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
            role, _ = cls.objects.get_or_create(
                name=role_name,
                tenant=None,
                defaults={
                    'display_name': dict(UserProfile.ROLE_CHOICES).get(role_name, role_name),
                    'permissions': default_perms,
                    'is_system': True,
                }
            )
            return role

    def save(self, *args, **kwargs):
        if self.name in dict(UserProfile.ROLE_CHOICES):
            self.is_system = True
            self.tenant = None
        super().save(*args, **kwargs)


class LoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    successful = models.BooleanField(default=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Tentative de connexion'
        verbose_name_plural = 'Tentatives de connexion'
        ordering = ['-timestamp']


class LoginLockout(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    attempts = models.IntegerField(default=1)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name = 'Verrouillage connexion'
        verbose_name_plural = 'Verrouillages connexion'
        unique_together = [['user', 'ip_address']]


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('view', 'Consultation'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('print', 'Impression'),
        ('other', 'Autre'),
    ]
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=100)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='account_activity_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(blank=True, null=True)

    class Meta:
        verbose_name = "Journal d'activité"
        verbose_name_plural = "Journaux d'activité"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.username} - {self.get_action_display()} - {self.module} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
