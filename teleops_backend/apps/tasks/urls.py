from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TaskViewSet, TaskCommentViewSet, TaskTemplateViewSet,
    FlowTemplateViewSet, FlowInstanceViewSet, FlowTemplateSearchView,
    FlowTemplateUsageView, FlowTemplateStatisticsView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-comments', TaskCommentViewSet, basename='taskcomment')
router.register(r'task-templates', TaskTemplateViewSet, basename='tasktemplate')
router.register(r'flow-templates', FlowTemplateViewSet, basename='flowtemplate')
router.register(r'flow-instances', FlowInstanceViewSet, basename='flowinstance')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # Flow template specific endpoints
    path('flow-templates/search/', FlowTemplateSearchView.as_view(), name='flow-template-search'),
    path('flow-templates/<uuid:flow_id>/usage/', FlowTemplateUsageView.as_view(), name='flow-template-usage'),
    path('flow-templates/statistics/', FlowTemplateStatisticsView.as_view(), name='flow-template-statistics'),
] 