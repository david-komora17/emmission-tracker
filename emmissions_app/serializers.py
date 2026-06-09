# emmissions_project/serializers.py
from rest_framework import serializers
from .models import SystemComplaint

class SystemComplaintSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SystemComplaint
        fields = ['id', 'username', 'subject', 'message', 'created_at']