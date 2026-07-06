from rest_framework import serializers
from .models import Registration

class RegistrationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_matricule = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()

    class Meta:
        model = Registration
        fields = ['id', 'student', 'student_name', 'student_matricule', 'registration_date',
                  'class_assigned', 'class_name',
                  'academic_year', 'is_re_registration', 'previous_class', 'status',
                  'registration_fees', 'payment_status', 'notes', 'validated_by',
                  'tenant', 'created_at', 'updated_at']

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student else ''

    def get_student_matricule(self, obj):
        return obj.student.matricule if obj.student else ''

    def get_class_name(self, obj):
        return obj.class_assigned.display_name if obj.class_assigned else ''
