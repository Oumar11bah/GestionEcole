from django.db import models
from payments.models import Payment

class MobilePaymentProvider(models.Model):
    PROVIDER_CHOICES = [
        ('orange', 'Orange Money'),
        ('mtn', 'MTN Mobile Money'),
    ]
    
    name = models.CharField(max_length=20, choices=PROVIDER_CHOICES, unique=True)
    api_key = models.CharField(max_length=255, help_text="Clé API du fournisseur")
    api_secret = models.CharField(max_length=255, blank=True, help_text="Secret API (si applicable)")
    base_url = models.URLField(help_text="URL de base de l'API (ex: https://api.orange.com)")
    callback_url = models.URLField(blank=True, help_text="URL de callback pour les webhooks")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.get_name_display()

class MobilePaymentTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('success', 'Succčs'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
    ]
    
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='mobile_transaction')
    provider = models.ForeignKey(MobilePaymentProvider, on_delete=models.CASCADE, related_name='transactions')
    transaction_id = models.CharField(max_length=100, unique=True, help_text="ID de transaction du fournisseur")
    phone_number = models.CharField(max_length=15, help_text="Numéro de téléphone du payeur")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    provider_response = models.JSONField(null=True, blank=True, help_text="Réponse brute du fournisseur")
    callback_data = models.JSONField(null=True, blank=True, help_text="Données reçues via webhook")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.provider} - {self.transaction_id} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']
