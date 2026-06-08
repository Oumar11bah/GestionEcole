from django.db import models
from django.contrib.auth.models import User
from students.models import Student

class Message(models.Model):
    MESSAGE_TYPES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('urgent', 'Urgent'),
    ]
    
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200)
    content = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.subject}"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('payment', 'Paiement'),
        ('attendance', 'Absence'),
        ('grade', 'Note'),
        ('composition', 'Composition'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('general', 'Général'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.recipient}: {self.title}"
