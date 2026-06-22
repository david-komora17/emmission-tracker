# emmissions_app/serializers.py
import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.conf import settings
from .models import SystemComplaint, UserProfile

# -------------------------------------------------------------------
# 1. Login Serializer
# -------------------------------------------------------------------
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Standard login serializer appending roles dynamically for the UI context.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        # Inject the account role variant straight into the response dictionary
        data['role'] = "ADMIN" if self.user.is_staff else "USER"
        return data


# -------------------------------------------------------------------
# 2. Strict Registration Serializer
# -------------------------------------------------------------------
class CustomRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    email = serializers.EmailField(required=True) # Automatically checks format and '@' symbol
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    signup_secret = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        cleaned_username = value.strip()
        
        # Rule: Prevent signing up with only one name
        if len(cleaned_username.split()) < 2:
            raise serializers.ValidationError("Please provide both your first and last name.")
        
        if User.objects.filter(username=cleaned_username).exists():
            raise serializers.ValidationError("Username already exists.")
            
        return cleaned_username

    def validate_password(self, value):
        # Rule: Minimum 6 characters
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        
        # Rule: Must include at least one special character
        # Matches symbols: ! @ # $ % ^ & * ( ) , . ? " : { } | < > _ - + = ` ~ [ ] ' \
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=`~[\]'\\]", value):
            raise serializers.ValidationError("Password must contain at least one special character.")
            
        return value

    def validate_phone_number(self, value):
        if value:
            cleaned_phone = str(value).strip()
            if cleaned_phone:
                if UserProfile.objects.filter(phone_number=cleaned_phone).exists():
                    raise serializers.ValidationError("This phone number is already linked to another account.")
                return cleaned_phone
        return None

    def validate(self, data):
        # Verify the signup secret BEFORE writing anything to the database pool
        secret = data.get('signup_secret', '')
        # Fallback inline string fallback used if your settings variable isn't fully bound yet
        configured_secret = getattr(settings, 'ADMIN_SIGNUP_SECRET', "ClimatiqaSecureAdmin2026!Create")
        
        if secret and secret != configured_secret:
            raise serializers.ValidationError({"signup_secret": "Invalid Sign-Up Secret."})
            
        return data


# -------------------------------------------------------------------
# 3. Complaints Serializer
# -------------------------------------------------------------------
class SystemComplaintSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SystemComplaint
        fields = ['id', 'username', 'subject', 'message', 'created_at']