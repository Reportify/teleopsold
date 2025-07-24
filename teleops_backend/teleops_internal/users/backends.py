from django.contrib.auth.backends import ModelBackend
from apps.users.models import User

class InternalUserBackend(ModelBackend):
    """
    Custom backend to authenticate only internal (teleops) users.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(email=username, user_type='teleops')
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except User.DoesNotExist:
            return None 