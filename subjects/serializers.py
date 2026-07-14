from rest_framework import serializers
from .models import Subject, TeacherSubject
from classes.models import Class, Cycle
from classes.serializers import CycleSerializer
from teachers.models import Teacher

class SubjectSerializer(serializers.ModelSerializer):
    cycle = serializers.PrimaryKeyRelatedField(many=True, required=True, queryset=Cycle.objects.all())
    cycle_details = CycleSerializer(source='cycle', many=True, read_only=True)
    teacher_name = serializers.SerializerMethodField()
    assigned_teachers = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'profile') and request.user.profile.tenant:
            self.fields['cycle'].queryset = Cycle.objects.filter(tenant=request.user.profile.tenant)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'description', 'coefficient', 'cycle', 'cycle_details',
                  'color', 'subject_type', 'specialty', 'teacher', 'teacher_name', 'assigned_teachers', 'tenant', 'created_at']
        read_only_fields = ['tenant']

    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.first_name} {obj.teacher.last_name}"
        return None

    def get_assigned_teachers(self, obj):
        assignments = obj.teacher_assignments.select_related('teacher').all()
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'profile') and request.user.profile.tenant:
            assignments = assignments.filter(tenant=request.user.profile.tenant)
        seen = set()
        result = []
        for a in assignments:
            if a.teacher_id and a.teacher_id not in seen:
                seen.add(a.teacher_id)
                result.append({'id': a.teacher_id, 'name': f"{a.teacher.first_name} {a.teacher.last_name}", 'class_name': a.class_assigned.display_name if a.class_assigned else ''})
        return result

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
        read_only_fields = ['tenant']

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
