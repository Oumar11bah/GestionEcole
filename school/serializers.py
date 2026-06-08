from rest_framework import serializers
from .models import AcademicYear, SchoolInfo

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'is_active', 'created_at']

class SchoolInfoSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model = SchoolInfo
        fields = ['id', 'name', 'acronym', 'address', 'phone', 'email', 'website', 'logo', 'logo_url',
                  'director_signature', 'signature_url', 'director_name',
                  'academic_year', 'primary_color', 'secondary_color', 'city', 'country', 'created_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_signature_url(self, obj):
        if obj.director_signature:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.director_signature.url)
            return obj.director_signature.url
        return None
