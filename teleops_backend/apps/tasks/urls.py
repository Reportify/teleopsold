from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TaskViewSet, TaskCommentViewSet, TaskTemplateViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-comments', TaskCommentViewSet, basename='taskcomment')
router.register(r'task-templates', TaskTemplateViewSet, basename='tasktemplate')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
] 