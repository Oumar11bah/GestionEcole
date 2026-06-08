from rest_framework import serializers
from .models import ClassResult

class ClassResultSerializer(serializers.ModelSerializer):
    class_name = serializers.SerializerMethodField()
    term_name = serializers.SerializerMethodField()

    class Meta:
        model = ClassResult
        fields = ['id', 'class_assigned', 'class_name', 'term', 'term_name', 'academic_year',
                  'total_students', 'passed', 'failed', 'average', 'best_student', 'created_at']

    def get_class_name(self, obj):
        return obj.class_assigned.display_name if obj.class_assigned else ''

    def get_term_name(self, obj):
        return str(obj.term) if obj.term else ''
