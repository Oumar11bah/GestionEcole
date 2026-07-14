from rest_framework import serializers
from .models import Room

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'code', 'capacity', 'room_type', 'status', 'building', 'floor', 'equipment', 'description', 'tenant', 'created_at', 'updated_at']
        read_only_fields = ['tenant']
