from django.db import models
from students.models import Student
from django.contrib.auth.models import User

class FeeType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cycle = models.CharField(max_length=20, choices=[
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
        ('all', 'Tous'),
    ], default='all')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('partial', 'Partiel'),
        ('completed', 'Payé'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
    ]

    PAYMENT_METHODS = [
        ('cash', 'Espèces'),
        ('bank_transfer', 'Virement bancaire'),
        ('mobile_money', 'Mobile Money'),
        ('check', 'Chèque'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='payments')
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE, related_name='payments')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    month_concerned = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=9, default='2024-2025')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reference = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_payments')
    receipt_number = models.CharField(max_length=50, unique=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.fee_type} - {self.amount_paid} FG"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import uuid
            self.receipt_number = f"RCP-{uuid.uuid4().hex[:8].upper()}"
        if not self.status:
            if self.amount_paid >= self.total_amount:
                self.status = 'completed'
            elif self.amount_paid > 0:
                self.status = 'partial'
            else:
                self.status = 'pending'
        super().save(*args, **kwargs)
