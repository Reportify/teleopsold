from rest_framework import serializers
from teleops_internal.users.models import InternalProfile

class InternalUserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class InternalUserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalProfile
        fields = '__all__' 