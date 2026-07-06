from rest_framework import serializers
from .models import Cycle, Class, ScheduleEntry
from teachers.models import Teacher

class CycleSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Cycle
        fields = ['id', 'name', 'display_name', 'description', 'tenant']

    def get_display_name(self, obj):
        return obj.get_name_display()

class ClassSerializer(serializers.ModelSerializer):
    cycle = CycleSerializer(read_only=True)
    cycle_name = serializers.CharField(write_only=True, required=False)
    student_count = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = Class
        fields = ['id', 'name', 'display_name', 'cycle', 'cycle_name',
                  'specialty', 'capacity', 'academic_year', 'tenant',
                  'class_teacher', 'student_count', 'created_at']
    
    def get_student_count(self, obj):
        return obj.student_count()
    
    def create(self, validated_data):
        cycle_name = validated_data.pop('cycle_name', None)
        if cycle_name:
            validated_data['cycle'], _ = Cycle.objects.get_or_create(name=cycle_name)
        # Handle specialty
        if 'specialty' in validated_data and validated_data['specialty'] == 'none':
            validated_data['specialty'] = ''
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        cycle_name = validated_data.pop('cycle_name', None)
        if cycle_name:
            instance.cycle, _ = Cycle.objects.get_or_create(name=cycle_name)
        # Handle specialty
        if 'specialty' in validated_data:
            if validated_data['specialty'] == 'none':
                validated_data['specialty'] = ''
            instance.specialty = validated_data.get('specialty', instance.specialty)
        return super().update(instance, validated_data)

class ScheduleEntrySerializer(serializers.ModelSerializer):
    class_assigned = serializers.StringRelatedField(read_only=True)
    class_assigned_id = serializers.IntegerField()
    subject_name = serializers.CharField(required=True)
    teacher_name = serializers.CharField(required=False, allow_blank=True)
    room = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = ScheduleEntry
        fields = ['id', 'class_assigned', 'class_assigned_id', 'subject_name', 'teacher_name',
                  'room', 'day', 'start_time', 'end_time', 'observation', 'tenant']

    def validate(self, attrs):
        instance_id = self.instance.id if self.instance else None
        day = attrs.get('day', self.instance.day if self.instance else None)
        start_time = attrs.get('start_time', self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time', self.instance.end_time if self.instance else None)
        room = attrs.get('room', self.instance.room if self.instance else '')
        teacher_name = attrs.get('teacher_name', self.instance.teacher_name if self.instance else '')
        class_assigned_id = attrs.get('class_assigned_id', self.instance.class_assigned_id if self.instance else None)

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("L'heure de fin doit être après l'heure de début")

        conflicts = []

        if room and day and start_time and end_time:
            room_qs = ScheduleEntry.objects.filter(day=day, room=room)
            if instance_id:
                room_qs = room_qs.exclude(id=instance_id)
            for entry in room_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    conflicts.append({
                        'type': 'room',
                        'message': f"Salle déjà occupée : {room}",
                        'detail': f"{entry.subject_name} - {entry.class_assigned} ({entry.start_time:%Hh%M}-{entry.end_time:%Hh%M})",
                    })
                    break

        if teacher_name and day and start_time and end_time:
            teacher_qs = ScheduleEntry.objects.filter(day=day, teacher_name=teacher_name)
            if instance_id:
                teacher_qs = teacher_qs.exclude(id=instance_id)
            for entry in teacher_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    conflicts.append({
                        'type': 'teacher',
                        'message': f"Enseignant déjà occupé : {teacher_name}",
                        'detail': f"{entry.subject_name} - {entry.class_assigned} ({entry.start_time:%Hh%M}-{entry.end_time:%Hh%M})",
                    })
                    break

        if class_assigned_id and day and start_time and end_time:
            class_qs = ScheduleEntry.objects.filter(day=day, class_assigned_id=class_assigned_id)
            if instance_id:
                class_qs = class_qs.exclude(id=instance_id)
            for entry in class_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    conflicts.append({
                        'type': 'class',
                        'message': f"Classe déjà occupée",
                        'detail': f"{entry.subject_name} - {entry.start_time:%Hh%M}-{entry.end_time:%Hh%M}",
                    })
                    break

        if conflicts:
            raise serializers.ValidationError({'conflicts': conflicts})

        return attrs

    def create(self, validated_data):
        class_id = validated_data.pop('class_assigned_id', None)
        if class_id:
            validated_data['class_assigned'] = Class.objects.get(id=class_id)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        class_id = validated_data.pop('class_assigned_id', None)
        if class_id:
            instance.class_assigned = Class.objects.get(id=class_id)
        return super().update(instance, validated_data)
