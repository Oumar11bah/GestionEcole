from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExpenseCategory, Expense
from .serializers import ExpenseCategorySerializer, ExpenseSerializer
from accounts.permissions import CanManageExpenses
from accounts.utils import TenantAwareMixin


class ExpenseCategoryViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated, CanManageExpenses]


class ExpenseViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('category', 'created_by').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, CanManageExpenses]

    def get_queryset(self):
        qs = super().get_queryset()
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(expense_date__gte=start_date)
        if end_date:
            qs = qs.filter(expense_date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        tenant = self._get_tenant()
        if tenant:
            serializer.save(created_by=self.request.user, tenant=tenant)
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        tenant = self._get_tenant()
        if not tenant:
            return Response({'total': 0, 'by_category': [], 'by_month': []})
        qs = Expense.objects.filter(tenant=tenant)
        total = qs.aggregate(Sum('amount'))['amount__sum'] or 0
        by_category = list(
            qs.values('category__name').annotate(total=Sum('amount')).order_by('-total')
        )
        by_month = list(
            qs.extra(select={'month': "strftime('%%Y-%%m', expense_date)"})
            .values('month').annotate(total=Sum('amount')).order_by('month')
        )
        return Response({
            'total': float(total),
            'by_category': by_category,
            'by_month': by_month,
        })
