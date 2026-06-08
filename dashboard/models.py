from django.db import models
from django.contrib.auth.models import User

class Statistic(models.Model):
    name = models.CharField(max_length=100)
    value = models.IntegerField()
    date = models.DateField(auto_now_add=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name}: {self.value}"

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50)
    object_repr = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name}"

    class Meta:
        ordering = ['-timestamp']
