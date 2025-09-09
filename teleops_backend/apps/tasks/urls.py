from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TaskViewSet, TaskCommentViewSet, TaskTemplateViewSet,
    FlowTemplateViewSet, FlowInstanceViewSet, FlowTemplateSearchView,
    FlowTemplateUsageView, FlowTemplateStatisticsView, CreateTaskFromFlowView,
    TaskFromFlowViewSet, AsyncBulkTaskCreationView, BulkTaskCreationJobStatusView,
    TaskAllocationViewSet, TaskSubActivityAllocationViewSet, TaskTimelineViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-comments', TaskCommentViewSet, basename='taskcomment')
router.register(r'task-templates', TaskTemplateViewSet, basename='tasktemplate')
router.register(r'flow-templates', FlowTemplateViewSet, basename='flowtemplate')
router.register(r'flow-instances', FlowInstanceViewSet, basename='flowinstance')
router.register(r'tasks-from-flow', TaskFromFlowViewSet, basename='taskfromflow')
router.register(r'task-allocations', TaskAllocationViewSet, basename='taskallocation')
router.register(r'sub-activity-allocations', TaskSubActivityAllocationViewSet, basename='subactivityallocation')
router.register(r'task-timeline', TaskTimelineViewSet, basename='tasktimeline')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # Flow template specific endpoints
    path('flow-templates/search/', FlowTemplateSearchView.as_view(), name='flow-template-search'),
    path('flow-templates/<uuid:flow_id>/usage/', FlowTemplateUsageView.as_view(), name='flow-template-usage'),
    path('flow-templates/statistics/', FlowTemplateStatisticsView.as_view(), name='flow-template-statistics'),
    
    # Task creation from flow template
    path('create-from-flow/', CreateTaskFromFlowView.as_view(), name='create-task-from-flow'),
    path('bulk-create-from-csv/', AsyncBulkTaskCreationView.as_view(), name='bulk-create-from-csv'),
    path('bulk-task-creation-job/<int:job_id>/', BulkTaskCreationJobStatusView.as_view(), name='bulk-task-creation-job-status'),
] 