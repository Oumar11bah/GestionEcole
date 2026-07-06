from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FeeType, Payment, PaymentHistory
from .serializers import FeeTypeSerializer, PaymentSerializer, PaymentHistorySerializer
from accounts.permissions import CanManagePayments
from accounts.utils import TenantAwareMixin, get_user_role

class FeeTypeViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = FeeType.objects.all()
    serializer_class = FeeTypeSerializer
    permission_classes = [IsAuthenticated, CanManagePayments]

class PaymentViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CanManagePayments]
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        try:
            payment = self.get_object()
            additional_amount = request.data.get('additional_amount')
            if not additional_amount:
                return Response({'error': 'additional_amount is required'}, status=400)
            try:
                additional_amount = float(additional_amount)
            except (ValueError, TypeError):
                return Response({'error': 'invalid amount'}, status=400)
            if additional_amount <= 0:
                return Response({'error': 'amount must be positive'}, status=400)
            from decimal import Decimal
            payment.amount_paid = Decimal(str(float(payment.amount_paid) + additional_amount))
            payment.status = ''
            payment.save()
            PaymentHistory.objects.create(
                payment=payment,
                amount=Decimal(str(additional_amount)),
                payment_date=payment.payment_date,
                received_by=request.user,
                notes=request.data.get('notes', ''),
            )
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=500)

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('student', 'fee_type', 'received_by').prefetch_related('history')
        if hasattr(self, 'request'):
            student_id = self.request.query_params.get('student_id', None)
            academic_year = self.request.query_params.get('academic_year', None)
            status = self.request.query_params.get('status', None)
            if student_id:
                queryset = queryset.filter(student_id=student_id)
            if academic_year:
                queryset = queryset.filter(academic_year=academic_year)
            if status:
                queryset = queryset.filter(status=status)
        return queryset.order_by('-payment_date')
    
    @action(detail=False, methods=['get'])
    def student_balance(self, request):
        student_id = request.query_params.get('student_id')
        if student_id:
            payments = Payment.objects.filter(student_id=student_id, status='completed')
            total_paid = sum(p.amount_paid for p in payments)
            return Response({'total_paid': total_paid})
        return Response({'error': 'student_id required'}, status=400)

class PaymentHistoryViewSet(TenantAwareMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PaymentHistory.objects.all()
    serializer_class = PaymentHistorySerializer
    permission_classes = [IsAuthenticated, CanManagePayments]

    def get_queryset(self):
        qs = PaymentHistory.objects.all()
        qs = qs.select_related('payment__student', 'payment__fee_type', 'received_by')
        role = get_user_role(self.request.user)
        if role == 'super_admin':
            return qs.none()
        tenant = self._get_tenant()
        if tenant is not None:
            qs = qs.filter(payment__tenant=tenant)
        student_id = self.request.query_params.get('student_id')
        payment_id = self.request.query_params.get('payment_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if student_id:
            qs = qs.filter(payment__student_id=student_id)
        if payment_id:
            qs = qs.filter(payment_id=payment_id)
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)
        return qs.order_by('-created_at')