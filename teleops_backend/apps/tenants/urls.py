from django.urls import path, include
from .views.main_views import list_telecom_circles

urlpatterns = [
    path('circles/', list_telecom_circles, name='list_telecom_circles'),
    # Add other specific/static endpoints here
    # path('<uuid:pk>/', ...),  # Place variable/catch-all patterns last
]