import json
import requests
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import MobilePaymentProvider, MobilePaymentTransaction
from payments.models import Payment, FeeType
from students.models import Student
from django.conf import settings
from accounts.permissions import CanManagePayments, IsSuperAdmin

class MobilePaymentProviderViewSet(viewsets.ModelViewSet):
    queryset = MobilePaymentProvider.objects.all()
    serializer_class = None  # À créer si nacessaire
    permission_classes = [IsAuthenticated, CanManagePayments]
    
    @action(detail=False, methods=['post'])
    def initiate_payment(self, request):
        """
        Initie un paiement mobile via Orange Money ou MTN.
        Données attendues:
        - provider: 'orange' ou 'mtn'
        - phone_number: numéro du client
        - amount: montant
        - student_id: ID de l'étudiant
        - fee_type_id: ID du type de frais
        """
        provider_name = request.data.get('provider')
        phone_number = request.data.get('phone_number')
        amount = request.data.get('amount')
        student_id = request.data.get('student_id')
        fee_type_id = request.data.get('fee_type_id')
        
        if not all([provider_name, phone_number, amount, student_id, fee_type_id]):
            return Response({'error': 'Missing required fields'}, status=400)
        
        try:
            provider = MobilePaymentProvider.objects.get(name=provider_name, is_active=True)
            student = Student.objects.get(id=student_id)
            fee_type = FeeType.objects.get(id=fee_type_id)
        except (MobilePaymentProvider.DoesNotExist, Student.DoesNotExist, FeeType.DoesNotExist) as e:
            return Response({'error': str(e)}, status=404)
        
        # Créer l'enregistrement de paiement local
        payment = Payment.objects.create(
            student=student,
            fee_type=fee_type,
            amount_paid=amount,
            total_amount=fee_type.amount,
            payment_method='mobile_money',
            payment_date=timezone.now().date(),
            status='pending',
            tenant=student.tenant,
            received_by=request.user if request.user.is_authenticated else None,
        )
        
        # Initier la transaction mobile
        transaction = MobilePaymentTransaction.objects.create(
            payment=payment,
            provider=provider,
            phone_number=phone_number,
            amount=amount,
        )
        
        # Appel API réel selon le fournisseur
        try:
            if provider.name == 'orange':
                result = self._initiate_orange_payment(provider, transaction, phone_number, amount)
            elif provider.name == 'mtn':
                result = self._initiate_mtn_payment(provider, transaction, phone_number, amount)
            else:
                return Response({'error': 'Unsupported provider'}, status=400)
            
            transaction.transaction_id = result.get('transaction_id', '')
            transaction.provider_response = result
            transaction.save()
            
            return Response({
                'status': 'initiated',
                'transaction_id': transaction.transaction_id,
                'payment_id': payment.id
            })
            
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            transaction.status = 'failed'
            transaction.save()
            return Response({'error': str(e)}, status=500)
    
    def _initiate_orange_payment(self, provider, transaction, phone, amount):
        """
        Intégration réelle Orange Money API.
        Documentation: https://developers.orange.com/products/mobile-payment
        """
        headers = {
            'Authorization': f'Bearer {provider.api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'merchant_key': provider.api_key,
            'currency': 'GNF',  # Franc Guinéen
            'order_id': str(transaction.id),
            'amount': str(amount),
            'description': f'Paiement scolaire - {transaction.payment.student}',
            'return_url': provider.callback_url or 'http://localhost:8000/api/mobile/callback/',
            'cancel_url': provider.callback_url or 'http://localhost:8000/api/mobile/cancel/',
            'customer_phone': phone,
        }
        
        response = requests.post(
            f'{provider.base_url}/api/v1/payment/create',
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    
    def _initiate_mtn_payment(self, provider, transaction, phone, amount):
        """
        Intégration réelle MTN Mobile Money API.
        Documentation: https://momodeveloper.mtn.com/
        """
        headers = {
            'Authorization': f'Bearer {provider.api_key}',
            'X-Reference-Id': str(transaction.id),
            'Content-Type': 'application/json',
            'X-Target-Environment': 'sandbox',  # ou 'production'
        }
        payload = {
            'amount': str(amount),
            'currency': 'GNF',
            'externalId': str(transaction.id),
            'payer': {
                'partyIdType': 'MSISDN',
                'partyId': phone,
            },
            'payerMessage': f'Paiement scolaire - {transaction.payment.student}',
            'payeeNote': f'Paiement {transaction.payment.fee_type}',
        }
        
        response = requests.post(
            f'{provider.base_url}/collection/v1_0/requesttopay',
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def callback(self, request):
        """
        Webhook pour recevoir les notifications de paiement (Orange Money / MTN).
        """
        data = request.data
        transaction_id = data.get('transaction_id') or data.get('externalId')
        
        try:
            transaction = MobilePaymentTransaction.objects.get(
                transaction_id=transaction_id
            )
        except MobilePaymentTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=404)
        
        transaction.callback_data = data
        transaction.save()
        
        # Vérifier le statut du paiement
        status_from_provider = data.get('status') or data.get('state')
        
        if status_from_provider in ['SUCCESSFUL', 'SUCCESS', 'success']:
            transaction.status = 'success'
            transaction.payment.status = 'completed'
        elif status_from_provider in ['FAILED', 'failed', 'FAILED']:
            transaction.status = 'failed'
            transaction.payment.status = 'failed'
        else:
            transaction.status = 'pending'
            transaction.payment.status = 'pending'
        
        transaction.save()
        transaction.payment.save()
        
        return Response({'status': 'callback processed'})
