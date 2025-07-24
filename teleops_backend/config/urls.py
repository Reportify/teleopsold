"""
URL configuration for Teleops Backend
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger/OpenAPI schema view
schema_view = get_schema_view(
    openapi.Info(
        title="Teleops API",
        default_version='v1',
        description="Circle-Based Multi-Tenant Platform for Telecom Infrastructure Management",
        terms_of_service="https://www.teleops.com/terms/",
        contact=openapi.Contact(email="api-support@teleops.com"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', 
            schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), 
            name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), 
            name='schema-redoc'),
    
    # API URLs (includes authentication)
    path('api/v1/', include('api.v1.urls')),
    
    # Health Check
    path('health/', include('core.urls')),
    
    # Internal API URLs
    path('internal/', include('teleops_internal.api.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Debug toolbar
    import debug_toolbar
    urlpatterns += [
        path('__debug__/', include(debug_toolbar.urls)),
    ]

# Custom error handlers
handler404 = 'core.views.error_handlers.handler404'
handler500 = 'core.views.error_handlers.handler500' 