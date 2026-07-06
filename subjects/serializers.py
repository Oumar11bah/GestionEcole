from rest_framework import serializers
from .models import Subject, TeacherSubject
from classes.models import Class, Cycle
from classes.serializers import CycleSerializer
from teachers.models import Teacher

class SubjectSerializer(serializers.ModelSerializer):
    cycle = serializers.PrimaryKeyRelatedField(many=True, queryset=Cycle.objects.all(), required=True)
    cycle_details = CycleSerializer(source='cycle', many=True, read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'description', 'coefficient', 'cycle', 'cycle_details',
                  'color', 'subject_type', 'specialty', 'teacher', 'tenant', 'created_at']

    def create(self, validated_data):
        cycles = validated_data.pop('cycle', [])
        instance = super().create(validated_data)
        instance.cycle.set(cycles)
        return instance

    def update(self, instance, validated_data):
        cycles = validated_data.pop('cycle', None)
        instance = super().update(instance, validated_data)
        if cycles is not None:
            instance.cycle.set(cycles)
        return instance

class TeacherSubjectSerializer(serializers.ModelSerializer):
    teacher = serializers.StringRelatedField(read_only=True)
    teacher_id = serializers.IntegerField(required=False)
    subject = serializers.StringRelatedField(read_only=True)
    subject_id = serializers.IntegerField(required=False)
    class_assigned = serializers.StringRelatedField(read_only=True)
    class_assigned_id = serializers.IntegerField(required=False)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_assigned.display_name', read_only=True)

    class Meta:
        model = TeacherSubject
        fields = ['id', 'teacher', 'teacher_id', 'subject', 'subject_id', 'subject_name',
                  'class_assigned', 'class_assigned_id', 'class_name', 'academic_year', 'tenant', 'created_at']

    def create(self, validated_data):
        validated_data['teacher'] = Teacher.objects.get(id=validated_data.pop('teacher_id'))
        validated_data['subject'] = Subject.objects.get(id=validated_data.pop('subject_id'))
        validated_data['class_assigned'] = Class.objects.get(id=validated_data.pop('class_assigned_id'))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'teacher_id' in validated_data:
            validated_data['teacher'] = Teacher.objects.get(id=validated_data.pop('teacher_id'))
        if 'subject_id' in validated_data:
            validated_data['subject'] = Subject.objects.get(id=validated_data.pop('subject_id'))
        if 'class_assigned_id' in validated_data:
            validated_data['class_assigned'] = Class.objects.get(id=validated_data.pop('class_assigned_id'))
        return super().update(instance, validated_data)
