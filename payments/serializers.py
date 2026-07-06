from rest_framework import serializers
from .models import FeeType, Payment, PaymentHistory
from students.models import Student
from django.contrib.auth.models import User

class FeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeType
        fields = ['id', 'name', 'description', 'amount', 'cycle', 'is_active', 'tenant']

class PaymentHistorySerializer(serializers.ModelSerializer):
    received_by = serializers.StringRelatedField(read_only=True)
    student = serializers.SerializerMethodField()
    student_matricule = serializers.SerializerMethodField()
    fee_type = serializers.StringRelatedField(source='payment.fee_type')
    receipt_number = serializers.CharField(source='payment.receipt_number', read_only=True)
    payment_id = serializers.IntegerField(source='payment.id', read_only=True)

    class Meta:
        model = PaymentHistory
        fields = ['id', 'amount', 'payment_date', 'received_by', 'notes', 'created_at',
                  'student', 'student_matricule', 'fee_type', 'receipt_number', 'payment_id']

    def get_student(self, obj):
        return f"{obj.payment.student.first_name} {obj.payment.student.last_name}" if obj.payment and obj.payment.student else ''

    def get_student_matricule(self, obj):
        return obj.payment.student.matricule if obj.payment and obj.payment.student else ''

class PaymentSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    student_matricule = serializers.SerializerMethodField()
    student_photo_url = serializers.SerializerMethodField()
    student_id = serializers.IntegerField(write_only=True)
    fee_type = serializers.StringRelatedField(read_only=True)
    fee_type_amount = serializers.SerializerMethodField()
    fee_type_id = serializers.IntegerField(write_only=True)
    received_by = serializers.StringRelatedField(read_only=True)
    received_by_id = serializers.IntegerField(write_only=True, required=False)
    remaining_amount = serializers.SerializerMethodField(read_only=True)
    receipt_number = serializers.CharField(read_only=True)
    history = PaymentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_matricule', 'student_photo_url', 'student_id', 'fee_type', 'fee_type_amount', 'fee_type_id',
                  'total_amount', 'amount_paid', 'remaining_amount', 'payment_date',
                  'month_concerned', 'academic_year', 'payment_method', 'status',
                  'reference', 'receipt_number', 'received_by', 'received_by_id',
                  'notes', 'tenant', 'created_at', 'updated_at', 'history']

    def get_student(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student else ''

    def get_student_matricule(self, obj):
        return obj.student.matricule if obj.student else ''

    def get_student_photo_url(self, obj):
        if obj.student and obj.student.photo:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.student.photo.url)
                return obj.student.photo.url
            except Exception:
                return obj.student.photo.url
        return None

    def get_fee_type_amount(self, obj):
        if obj.fee_type:
            return float(obj.fee_type.amount)
        return None

    def get_remaining_amount(self, obj):
        return float(obj.total_amount) - float(obj.amount_paid)

    def create(self, validated_data):
        validated_data['student'] = Student.objects.get(id=validated_data.pop('student_id'))
        validated_data['fee_type'] = FeeType.objects.get(id=validated_data.pop('fee_type_id'))
        if 'received_by_id' in validated_data:
            validated_data['received_by'] = User.objects.get(id=validated_data.pop('received_by_id'))
        payment = super().create(validated_data)
        PaymentHistory.objects.create(
            payment=payment,
            amount=payment.amount_paid,
            payment_date=payment.payment_date,
            received_by=payment.received_by,
            notes=payment.notes,
        )
        return payment
