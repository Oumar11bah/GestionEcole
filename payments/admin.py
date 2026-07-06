from django.contrib import admin
from .models import FeeType, Payment, PaymentHistory

admin.site.register(FeeType)
admin.site.register(Payment)
admin.site.register(PaymentHistory)
