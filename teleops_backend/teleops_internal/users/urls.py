from django.urls import path
from .views import InternalUserLoginView

urlpatterns = [
    path('login/', InternalUserLoginView.as_view(), name='internal_user_login'),
] 