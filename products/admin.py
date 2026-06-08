from django.contrib import admin
from .models import Category, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'selling_price', 'quantity', 'is_low_stock_display', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'barcode']
    list_editable = ['selling_price', 'quantity']
    
    def is_low_stock_display(self, obj):
        return obj.is_low_stock()
    is_low_stock_display.boolean = True
    is_low_stock_display.short_description = 'Stock faible'
