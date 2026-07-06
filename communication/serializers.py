from rest_framework import serializers
from .models import Message, Notification
from django.contrib.auth.models import User
from students.models import Student

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField(read_only=True)
    sender_id = serializers.IntegerField(write_only=True)
    recipient = serializers.StringRelatedField(read_only=True)
    recipient_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_id', 'recipient', 'recipient_id', 'subject', 'content', 'message_type', 'is_read', 'tenant', 'created_at']
    
    def create(self, validated_data):
        validated_data['sender'] = User.objects.get(id=validated_data.pop('sender_id'))
        validated_data['recipient'] = User.objects.get(id=validated_data.pop('recipient_id'))
        return super().create(validated_data)

class NotificationSerializer(serializers.ModelSerializer):
    recipient = serializers.StringRelatedField(read_only=True)
    recipient_id = serializers.IntegerField(write_only=True)
    related_student = serializers.StringRelatedField(read_only=True)
    related_student_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'recipient_id', 'notification_type', 'title', 'message', 'is_read', 'related_student', 'related_student_id', 'tenant', 'created_at']
    
    def create(self, validated_data):
        validated_data['recipient'] = User.objects.get(id=validated_data.pop('recipient_id'))
        if 'related_student_id' in validated_data:
            validated_data['related_student'] = Student.objects.get(id=validated_data.pop('related_student_id'))
        return super().create(validated_data)
