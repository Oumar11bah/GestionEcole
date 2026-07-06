from rest_framework import serializers
from .models import Term, Grade, GradeHistory, StudentAverage
from students.models import Student
from subjects.models import TeacherSubject

class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = ['id', 'name', 'academic_year', 'start_date', 'end_date', 'is_active', 'tenant']

class StudentBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'matricule']

class GradeSerializer(serializers.ModelSerializer):
    student = StudentBasicSerializer(read_only=True)
    student_id = serializers.IntegerField()
    teacher_subject = serializers.PrimaryKeyRelatedField(read_only=True)
    teacher_subject_name = serializers.SerializerMethodField()
    teacher_subject_id = serializers.IntegerField()
    term = serializers.StringRelatedField(read_only=True)
    term_id = serializers.IntegerField()
    average = serializers.ReadOnlyField()
    appreciation = serializers.ReadOnlyField()
    cycle_max_score = serializers.ReadOnlyField()

    class Meta:
        model = Grade
        fields = ['id', 'student', 'student_id', 'teacher_subject', 'teacher_subject_name', 'teacher_subject_id',
                  'term', 'term_id', 'homework1', 'homework2', 'composition',
                  'max_score', 'cycle_max_score', 'average', 'appreciation',
                  'date_recorded', 'comment', 'locked', 'tenant',
                  'created_at', 'updated_at']
        read_only_fields = ['max_score', 'average', 'appreciation', 'cycle_max_score', 'locked']

    def get_teacher_subject_name(self, obj):
        return obj.teacher_subject.subject.name

    def validate_homework1(self, value):
        return self._validate_note(value, 'Devoir 1')

    def validate_homework2(self, value):
        return self._validate_note(value, 'Devoir 2')

    def validate_composition(self, value):
        return self._validate_note(value, 'Composition')

    def _validate_note(self, value, field_name):
        if value is None:
            return value
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError(f"{field_name} doit être un nombre valide.")
        instance = getattr(self, 'instance', None)
        if instance:
            max_score = float(instance.cycle_max_score)
        else:
            student_id = self.initial_data.get('student_id')
            if student_id:
                try:
                    student = Student.objects.get(id=student_id)
                    cycle_name = student.class_assigned.cycle.name if student.class_assigned and student.class_assigned.cycle else None
                    max_score = 10 if cycle_name == 'primaire' else 20
                except Student.DoesNotExist:
                    max_score = 20
            else:
                max_score = 20
        if v < 0 or v > max_score:
            raise serializers.ValidationError(
                f"{field_name} doit être entre 0 et {max_score} pour ce cycle."
            )
        return value

    def create(self, validated_data):
        validated_data['student'] = Student.objects.get(id=validated_data.pop('student_id'))
        validated_data['teacher_subject'] = TeacherSubject.objects.get(id=validated_data.pop('teacher_subject_id'))
        validated_data['term'] = Term.objects.get(id=validated_data.pop('term_id'))
        return super().create(validated_data)

class GradeHistorySerializer(serializers.ModelSerializer):
    grade_detail = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = GradeHistory
        fields = ['id', 'grade', 'grade_detail', 'user', 'user_name', 'field_name', 'old_value', 'new_value', 'tenant', 'created_at']
        read_only_fields = fields

    def get_grade_detail(self, obj):
        return str(obj.grade)

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username if obj.user else 'Système'

class StudentAverageSerializer(serializers.ModelSerializer):
    student = serializers.StringRelatedField(read_only=True)
    student_id = serializers.IntegerField(write_only=True)
    term = serializers.StringRelatedField(read_only=True)
    term_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = StudentAverage
        fields = ['id', 'student', 'student_id', 'term', 'term_id', 'average', 'rank', 'tenant', 'calculated_at']

    def create(self, validated_data):
        validated_data['student'] = Student.objects.get(id=validated_data.pop('student_id'))
        validated_data['term'] = Term.objects.get(id=validated_data.pop('term_id'))
        return super().create(validated_data)
