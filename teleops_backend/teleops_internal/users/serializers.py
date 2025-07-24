from rest_framework import serializers
from .models import InternalProfile

class InternalUserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        if email and password:
            try:
                user = InternalProfile.objects.get(email=email)
                if not user.check_password(password):
                    raise serializers.ValidationError('Invalid email or password.')
            except InternalProfile.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
            return attrs
        raise serializers.ValidationError('Must include "email" and "password".') 