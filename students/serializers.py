from rest_framework import serializers
from django.conf import settings
from .models import Student, Parent


FIELD_LABELS = {
    'first_name': 'Prénom',
    'last_name': 'Nom',
    'date_of_birth': 'Date de naissance',
    'gender': 'Sexe',
    'class_assigned_id': 'Classe',
    'parent_full_name': 'Nom du parent',
    'parent_phone_number': 'Téléphone du parent',
    'matricule': 'Matricule',
    'place_of_birth': 'Lieu de naissance',
    'academic_year': 'Année scolaire',
    'quartier': 'Quartier',
    'commune': 'Commune',
}


def humanize_error(field, message):
    label = FIELD_LABELS.get(field, field)
    return f'{label} : {message}'


class ParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parent
        fields = ['id', 'full_name', 'phone_number', 'email', 'address', 'quartier', 'commune', 'city', 'country', 'profession']


class StudentSerializer(serializers.ModelSerializer):
    matricule = serializers.CharField(read_only=True)
    parent_details = ParentSerializer(source='parent', read_only=True)
    class_assigned_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    class_assigned_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    parent_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    parent_full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    parent_phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    parent_profession = serializers.CharField(write_only=True, required=False, allow_blank=True)
    parent_quartier = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'id', 'matricule', 'first_name', 'last_name', 'gender', 'date_of_birth',
            'place_of_birth', 'photo', 'photo_url', 'status',
            'quartier', 'commune', 'city', 'country',
            'class_assigned', 'class_assigned_name', 'class_assigned_id',
            'parent', 'parent_details', 'parent_id',
            'parent_full_name', 'parent_phone_number', 'parent_profession', 'parent_quartier',
            'academic_year', 'enrollment_date', 'created_at', 'updated_at',
        ]

    def get_class_assigned_name(self, obj):
        if obj.class_assigned:
            return obj.class_assigned.display_name
        return None

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def to_internal_value(self, data):
        try:
            return super().to_internal_value(data)
        except serializers.ValidationError as exc:
            errors = {}
            for field, messages in exc.detail.items():
                label = FIELD_LABELS.get(field, field)
                if isinstance(messages, list):
                    msgs = [f'{label} : {str(m)}' for m in messages]
                else:
                    msgs = [f'{label} : {str(messages)}']
                errors[field] = msgs if len(msgs) > 1 else msgs[0]
            raise serializers.ValidationError(errors)

    def create(self, validated_data):
        class_id = validated_data.pop('class_assigned_id', None)
        parent_id = validated_data.pop('parent_id', None)
        parent_full_name = validated_data.pop('parent_full_name', None)
        parent_phone_number = validated_data.pop('parent_phone_number', None)
        parent_profession = validated_data.pop('parent_profession', None)
        parent_quartier = validated_data.pop('parent_quartier', None)
        
        if class_id:
            from classes.models import Class
            try:
                validated_data['class_assigned'] = Class.objects.get(id=class_id)
            except Class.DoesNotExist:
                raise serializers.ValidationError(
                    'La classe sélectionnée n\'existe plus. Rechargez la page et réessayez.'
                )
        
        if parent_full_name and parent_phone_number:
            parent, created = Parent.objects.get_or_create(
                full_name=parent_full_name,
                phone_number=parent_phone_number,
                defaults={
                    'quartier': parent_quartier or '',
                    'profession': parent_profession or ''
                }
            )
            if not created:
                if parent_quartier:
                    parent.quartier = parent_quartier
                if parent_profession:
                    parent.profession = parent_profession
                parent.save()
            validated_data['parent'] = parent
        elif parent_id:
            try:
                validated_data['parent'] = Parent.objects.get(id=parent_id)
            except Parent.DoesNotExist:
                raise serializers.ValidationError(
                    'Le parent sélectionné n\'existe plus. Rechargez la page et réessayez.'
                )
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        class_id = validated_data.pop('class_assigned_id', None)
        parent_id = validated_data.pop('parent_id', None)
        parent_full_name = validated_data.pop('parent_full_name', None)
        parent_phone_number = validated_data.pop('parent_phone_number', None)
        parent_profession = validated_data.pop('parent_profession', None)
        parent_quartier = validated_data.pop('parent_quartier', None)
        
        if class_id:
            from classes.models import Class
            try:
                instance.class_assigned = Class.objects.get(id=class_id)
            except Class.DoesNotExist:
                raise serializers.ValidationError(
                    'La classe sélectionnée n\'existe plus. Rechargez la page et réessayez.'
                )
        
        if parent_full_name and parent_phone_number:
            parent, created = Parent.objects.get_or_create(
                full_name=parent_full_name,
                phone_number=parent_phone_number,
                defaults={
                    'quartier': parent_quartier or '',
                    'profession': parent_profession or ''
                }
            )
            if not created:
                if parent_quartier:
                    parent.quartier = parent_quartier
                if parent_profession:
                    parent.profession = parent_profession
                parent.save()
            instance.parent = parent
        elif parent_id:
            try:
                instance.parent = Parent.objects.get(id=parent_id)
            except Parent.DoesNotExist:
                raise serializers.ValidationError(
                    'Le parent sélectionné n\'existe plus. Rechargez la page et réessayez.'
                )
        
        return super().update(instance, validated_data)
