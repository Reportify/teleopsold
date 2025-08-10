from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentInventoryItemViewSet, TechnologyTagViewSet

router = DefaultRouter()
router.register(r'items', EquipmentInventoryItemViewSet, basename='equipment-items')
router.register(r'technologies', TechnologyTagViewSet, basename='technology-tags')

urlpatterns = [
    path('', include(router.urls)),
]


