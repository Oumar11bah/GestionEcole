from django.db import models
from django.utils.translation import gettext_lazy as _
from tenants.models import Tenant

class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('normal', _('Normale')),
        ('computer', _('Informatique')),
        ('laboratory', _('Laboratoire')),
        ('library', _('Bibliothèque')),
    ]
    STATUS_CHOICES = [
        ('available', _('Disponible')),
        ('occupied', _('Occupée')),
        ('maintenance', _('En maintenance')),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    capacity = models.IntegerField(default=30)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    building = models.CharField(max_length=100, blank=True)
    floor = models.IntegerField(null=True, blank=True)
    equipment = models.TextField(blank=True, help_text=_("Liste des équipements"))
    description = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['building', 'floor', 'name']
        unique_together = ('code', 'tenant')

    def __str__(self):
        return f"{self.name} ({self.code})"
