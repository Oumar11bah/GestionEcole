from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nom')
    description = models.TextField(blank=True, null=True, verbose_name='Description')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['name']

class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nom du produit')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', verbose_name='Catégorie')
    description = models.TextField(blank=True, null=True, verbose_name='Description')
    barcode = models.CharField(max_length=50, blank=True, null=True, unique=True, verbose_name='Code-barres')
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Prix d\'achat')
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Prix de vente')
    quantity = models.IntegerField(default=0, verbose_name='Quantité en stock')
    alert_threshold = models.IntegerField(default=5, verbose_name='Seuil d\'alerte')
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name='Image')
    is_active = models.BooleanField(default=True, verbose_name='Actif')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.quantity} en stock)"
    
    def is_low_stock(self):
        return self.quantity <= self.alert_threshold
    
    class Meta:
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'
        ordering = ['name']
