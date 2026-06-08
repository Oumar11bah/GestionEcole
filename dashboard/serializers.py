from rest_framework import serializers
from .models import Statistic, ActivityLog
from django.contrib.auth.models import User

class StatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statistic
        fields = ['id', 'name', 'value', 'date', 'description']

class ActivityLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'model_name', 'object_repr', 'timestamp']
