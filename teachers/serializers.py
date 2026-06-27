from rest_framework import serializers
from .models import Teacher, SalaryHistory
from django.contrib.auth.models import User
from subjects.models import TeacherSubject

class TeacherSubjectInfoSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    class_name = serializers.CharField(source='class_assigned.display_name', read_only=True)
    class_id = serializers.IntegerField(source='class_assigned.id', read_only=True)
    subject_id = serializers.IntegerField(source='subject.id', read_only=True)

    class Meta:
        model = TeacherSubject
        fields = ['id', 'subject_name', 'subject_code', 'class_name', 'class_id', 'subject_id', 'academic_year']

class SalaryHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryHistory
        fields = ['id', 'teacher', 'amount', 'month', 'paid_date', 'is_paid', 'notes', 'created_at']

class TeacherSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    salary_history = SalaryHistorySerializer(many=True, read_only=True)
    matricule = serializers.CharField(read_only=True)
    teacher_subjects = TeacherSubjectInfoSerializer(source='subject_assignments', many=True, read_only=True)

    class Meta:
        model = Teacher
        fields = ['id', 'user', 'matricule', 'first_name', 'last_name', 'full_name', 'gender', 'date_of_birth',
                  'phone_number', 'email', 'address', 'photo',
                  'specialty', 'diploma', 'years_of_experience', 'hire_date', 'contract_type',
                  'salary', 'is_active',
                  'teacher_subjects', 'salary_history',
                  'created_at', 'updated_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.user:
            representation['user'] = {
                'id': instance.user.id,
                'username': instance.user.username,
                'email': instance.user.email,
                'full_name': instance.full_name
            }
        return representation
