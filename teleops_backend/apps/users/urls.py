from django.urls import path
from .views import (
    LoginView, LogoutView, TokenRefreshView, VerifyTokenView,
    UserProfileView, ChangePasswordView, forgot_password, reset_password,
    verify_email_and_set_password, validate_verification_token
)

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/', VerifyTokenView.as_view(), name='verify_token'),
    
    # User profile and password management
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', forgot_password, name='forgot_password'),
    path('reset-password/', reset_password, name='reset_password'),
    path('verify-email/', verify_email_and_set_password, name='verify_email_and_set_password'),
    path('verify-email/validate/', validate_verification_token, name='validate_verification_token'),
] 