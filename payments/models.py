from django.db import models
from students.models import Student
from classes.models import Class
from django.contrib.auth.models import User
from tenants.models import Tenant

class FeeType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cycle = models.CharField(max_length=20, choices=[
        ('all', 'Tous'),
        ('prescolaire', 'Préscolaire'),
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
    ], default='all')
    class_assigned = models.ManyToManyField(Class, blank=True, related_name='fee_types', verbose_name='Classes concernées')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Payment(models.Model):
    STATUS_CHOICES = [
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
    receipt_number = models.CharField(max_length=50)
    notes = models.TextField(blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
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
            else:
                self.status = 'partial'
        super().save(*args, **kwargs)

class PaymentHistory(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='history')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment} - +{self.amount} FG"
