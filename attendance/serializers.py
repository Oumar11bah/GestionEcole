from rest_framework import serializers
from .models import Attendance
from students.models import Student
from teachers.models import Teacher

class StudentBasicSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'matricule', 'class_assigned', 'photo', 'photo_url']

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

class AttendanceSerializer(serializers.ModelSerializer):
    student = StudentBasicSerializer(read_only=True)
    student_id = serializers.IntegerField()
    recorded_by = serializers.StringRelatedField(read_only=True)
    recorded_by_id = serializers.IntegerField(required=False)
    
    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_id', 'date', 'status', 'recorded_by', 'recorded_by_id', 'comment', 'tenant', 'created_at']
    
    def create(self, validated_data):
        validated_data['student'] = Student.objects.get(id=validated_data.pop('student_id'))
        if 'recorded_by_id' in validated_data:
            validated_data['recorded_by'] = Teacher.objects.get(id=validated_data.pop('recorded_by_id'))
        return super().create(validated_data)
