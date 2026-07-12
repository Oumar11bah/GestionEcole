from rest_framework import serializers
from .models import ExpenseCategory, Expense


class ExpenseCategorySerializer(serializers.ModelSerializer):
    expense_count = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'is_active', 'expense_count', 'tenant', 'created_at']
        read_only_fields = ['tenant', 'created_at']

    def get_expense_count(self, obj):
        return obj.expenses.count()

    def validate_name(self, value):
        request = self.context.get('request')
        tenant = None
        if request and hasattr(request.user, 'profile') and request.user.profile.tenant:
            tenant = request.user.profile.tenant
        qs = ExpenseCategory.objects.filter(name=value)
        if tenant:
            qs = qs.filter(tenant=tenant)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Une catégorie avec ce nom existe déjà.")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ['id', 'category', 'category_name', 'description', 'amount',
                  'expense_date', 'payment_method', 'reference', 'notes',
                  'tenant', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'tenant', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return ''
