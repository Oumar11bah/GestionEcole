from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import FeeType, Payment
from .serializers import FeeTypeSerializer, PaymentSerializer
from accounts.permissions import CanManagePayments

class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.all()
    serializer_class = FeeTypeSerializer
    permission_classes = [IsAuthenticated, CanManagePayments]

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CanManagePayments]
    
    def get_queryset(self):
        queryset = Payment.objects.select_related('student', 'fee_type', 'received_by')
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
