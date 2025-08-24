# Circle Site Management Views
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
import logging
import json

from .models import Site
from .serializers import SiteSerializer, SiteCreateSerializer, SiteBulkCreateSerializer
from core.permissions.tenant_permissions import IsTenantAdmin, IsTenantMember
from apps.tenants.services.rbac_service import TenantRBACService

logger = logging.getLogger(__name__)


class CircleSiteManagementView(APIView):
    """
    Circle Site Management for Circle Tenant Administrators
    Provides comprehensive site management with GPS boundaries and circle-specific features
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def get(self, request):
        """Get paginated sites for the current circle tenant with optimized queries"""
        try:
            # Check read permission
            if not self._check_permission(request.user, "read"):
                return Response(
                    {"detail": "You don't have permission to view sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get pagination parameters
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 50)), 200)  # Max 200 per page
            search = request.GET.get('search', '').strip()
            status_filter = request.GET.get('status', '').strip()
            site_type_filter = request.GET.get('site_type', '').strip()
            cluster_filter = request.GET.get('cluster', '').strip()
            
            # Base query with optimized select_related for created_by
            base_query = Site.objects.filter(
                tenant=tenant,
                deleted_at__isnull=True
            ).select_related('created_by')
            
            # Apply filters
            if search:
                from django.db.models import Q
                base_query = base_query.filter(
                    Q(site_name__icontains=search) |
                    Q(site_id__icontains=search) |
                    Q(global_id__icontains=search) |
                    Q(town__icontains=search) |
                    Q(cluster__icontains=search)
                )
            
            if status_filter:
                base_query = base_query.filter(status=status_filter)
                
            if site_type_filter:
                base_query = base_query.filter(site_type=site_type_filter)
                
            if cluster_filter:
                base_query = base_query.filter(cluster=cluster_filter)
            
            # Get total count for pagination
            total_count = base_query.count()
            
            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = (total_count + page_size - 1) // page_size
            
            # Get paginated sites
            sites = base_query.order_by('-created_at')[offset:offset + page_size]
            
            # Calculate statistics using database aggregation (much faster than Python loops)
            from django.db.models import Count, Q
            statistics_query = Site.objects.filter(tenant=tenant, deleted_at__isnull=True)
            
            stats = statistics_query.aggregate(
                total_sites=Count('id'),
                active_sites=Count('id', filter=Q(status='active')),
                inactive_sites=Count('id', filter=Q(status='inactive')),
                maintenance_sites=Count('id', filter=Q(status='maintenance')),
                sites_with_coordinates=Count('id', filter=Q(latitude__isnull=False, longitude__isnull=False)),
                sites_without_coordinates=Count('id', filter=Q(latitude__isnull=True) | Q(longitude__isnull=True))
            )
            
            # Site type distribution using database aggregation
            site_types = dict(
                statistics_query.values('site_type')
                .annotate(count=Count('id'))
                .values_list('site_type', 'count')
            )
            
            # Geographic distribution using database aggregation (top 10 only)
            cities = dict(
                statistics_query.values('town')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
                .values_list('town', 'count')
            )
            
            states = dict(
                statistics_query.values('state')
                .annotate(count=Count('id'))
                .order_by('-count')
                .values_list('state', 'count')
            )
            
            clusters = dict(
                statistics_query.values('cluster')
                .annotate(count=Count('id'))
                .order_by('-count')
                .values_list('cluster', 'count')
            )
            
            # Serialize sites data efficiently
            sites_data = []
            for site in sites:
                site_data = {
                    'id': site.id,
                    # New specification fields (with fallbacks for existing data)
                    'site_id': site.site_id or site.site_code or f"SITE_{site.id}",
                    'global_id': site.global_id or f"GLOBAL_{site.id}",
                    'site_name': site.site_name or site.name or "Unnamed Site",
                    'town': site.town or site.city or "",
                    'cluster': site.cluster or "Default Zone",
                    
                    # Legacy fields
                    'site_code': site.site_code or "",
                    'name': site.name or "",
                    'city': site.city or "",
                    
                    'site_type': site.site_type,
                    'status': site.status,
                    
                    # Location Information
                    'state': site.state or "",
                    'country': site.country or "India",
                    'district': "",  # Field doesn't exist in current model
                    'postal_code': site.postal_code or "",
                    'latitude': float(site.latitude) if site.latitude else None,
                    'longitude': float(site.longitude) if site.longitude else None,

                    'full_address': site.full_address,
                    
                    # Site Details
                    'address': site.address or "",

                    'contact_person': site.contact_person or "",
                    'contact_phone': site.contact_phone or "",
                    'contact_email': site.contact_email or "",

                    
                    # Operational Information
                    'has_coordinates': site.latitude is not None and site.longitude is not None,

                    
                    # Metadata
                    'created_at': site.created_at,
                    'updated_at': site.updated_at,
                    'created_by': site.created_by.full_name if site.created_by else None,
                }
                sites_data.append(site_data)
            
            response_data = {
                'sites': sites_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                },
                'statistics': stats,
                'distributions': {
                    'site_types': site_types,
                    'cities': cities,  # Already limited to top 10
                    'states': states,
                    'clusters': clusters,
                },
                # Geographic analysis removed for performance - now handled by separate endpoint
                'tenant_info': {
                    'id': str(tenant.id),
                    'organization_name': tenant.organization_name,
                    'circle_code': tenant.circle_code,
                    'circle_name': tenant.circle_name,
                    'tenant_type': tenant.tenant_type,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching circle sites: {str(e)}")
            return Response(
                {"error": "Failed to fetch circle sites"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Create a new site in the circle tenant"""
        try:
            # Check create permission
            if not self._check_permission(request.user, "create"):
                return Response(
                    {"detail": "You don't have permission to create sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = request.data
            
            # Validate required fields
            required_fields = ['site_id', 'global_id', 'site_name', 'town', 'cluster', 'latitude', 'longitude']
            for field in required_fields:
                if not data.get(field):
                    return Response(
                        {"error": f"{field} is required"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Check for unique constraints within tenant
            site_id = data['site_id']
            global_id = data['global_id']
            
            if Site.objects.filter(tenant=tenant, site_id=site_id, deleted_at__isnull=True).exists():
                return Response(
                    {"error": f"Site ID '{site_id}' already exists in this circle"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if Site.objects.filter(tenant=tenant, global_id=global_id, deleted_at__isnull=True).exists():
                return Response(
                    {"error": f"Global ID '{global_id}' already exists in this circle"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate coordinates
            try:
                latitude = float(data['latitude'])
                longitude = float(data['longitude'])
                
                if not (-90 <= latitude <= 90):
                    return Response(
                        {"error": "Latitude must be between -90 and 90 degrees"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if not (-180 <= longitude <= 180):
                    return Response(
                        {"error": "Longitude must be between -180 and 180 degrees"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except (ValueError, TypeError):
                return Response(
                    {"error": "Invalid latitude or longitude format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Create the site
                site = Site.objects.create(
                    tenant=tenant,
                    created_by=request.user,
                    
                    # Required specification fields
                    site_id=site_id,
                    global_id=global_id,
                    site_name=data['site_name'].strip(),
                    town=data['town'].strip(),
                    cluster=data['cluster'].strip(),
                    latitude=latitude,
                    longitude=longitude,
                    
                    # Optional fields
                    address=data.get('address', '').strip(),
                    site_type=data.get('site_type', 'tower'),
                    contact_person=data.get('contact_person', '').strip(),
                    contact_phone=data.get('contact_phone', '').strip(),
                    
                    # Legacy compatibility fields (populated from spec fields)
                    name=data['site_name'].strip(),  # Copy from site_name
                    city=data['town'].strip(),  # Copy from town
                    site_code=site_id,  # Copy from site_id
                    state=data.get('state', '').strip(),
                    country=data.get('country', 'India').strip(),
                    postal_code=data.get('postal_code', '').strip(),
                    description=data.get('description', '').strip(),
                    contact_email=data.get('contact_email', '').strip(),
                    status=data.get('status', 'active'),
                )
                
                # Prepare response data
                site_data = {
                    'id': site.id,
                    'site_id': site.site_id,
                    'global_id': site.global_id,
                    'site_name': site.site_name,
                    'site_code': site.site_code,
                    'site_type': site.site_type,
                    'status': site.status,
                    'latitude': float(site.latitude),
                    'longitude': float(site.longitude),
                    'town': site.town,
                    'cluster': site.cluster,
                    'created_at': site.created_at,
                    'full_address': site.full_address,
                }
                
        
                
                return Response(
                    {
                        "message": "Site created successfully", 
                        "site": site_data
                    }, 
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Error creating circle site: {str(e)}")
            return Response(
                {"error": "Failed to create site"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_coverage_radius(self, sites):
        """Calculate the radius of coverage area in kilometers"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if sites_with_coords.count() < 2:
            return 0
        
        import math
        
        # Find the maximum distance between any two sites
        max_distance = 0
        coords = [(float(site.latitude), float(site.longitude)) for site in sites_with_coords]
        
        for i, coord1 in enumerate(coords):
            for coord2 in coords[i+1:]:
                distance = self._haversine_distance(coord1[0], coord1[1], coord2[0], coord2[1])
                max_distance = max(max_distance, distance)
        
        return round(max_distance / 2, 2)  # Radius is half the maximum distance
    
    def _calculate_geographic_center(self, sites):
        """Calculate the geographic center of all sites"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if not sites_with_coords.exists():
            return None
        
        total_lat = sum(float(site.latitude) for site in sites_with_coords)
        total_lng = sum(float(site.longitude) for site in sites_with_coords)
        count = sites_with_coords.count()
        
        return {
            'latitude': round(total_lat / count, 6),
            'longitude': round(total_lng / count, 6)
        }
    
    def _calculate_coverage_area(self, sites):
        """Calculate approximate coverage area in square kilometers"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if sites_with_coords.count() < 3:
            return 0
        
        # Simple bounding box calculation
        latitudes = [float(site.latitude) for site in sites_with_coords]
        longitudes = [float(site.longitude) for site in sites_with_coords]
        
        lat_range = max(latitudes) - min(latitudes)
        lng_range = max(longitudes) - min(longitudes)
        
        # Approximate area calculation (rough estimate)
        lat_km = lat_range * 111  # 1 degree latitude ≈ 111 km
        lng_km = lng_range * 111 * abs(sum(latitudes) / len(latitudes) / 180)  # Adjust for latitude
        
        return round(lat_km * lng_km, 2)
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points on earth (in kilometers)"""
        import math
        
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        
        return c * r
    



class CircleSiteDetailView(APIView):
    """
    Individual Circle Site Management
    Update, delete, or get detailed information about a specific site
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def get(self, request, site_id):
        """Get detailed information about a specific site"""
        try:
            # Check read permission
            if not self._check_permission(request.user, "read"):
                return Response(
                    {"detail": "You don't have permission to view site details."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get site for this tenant
            try:
                site = Site.objects.get(
                    id=site_id,
                    tenant=tenant,
                    deleted_at__isnull=True
                )
            except Site.DoesNotExist:
                return Response(
                    {"error": "Site not found in this circle"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get detailed site information
            site_data = {
                'id': site.id,
                'site_id': site.site_id,
                'global_id': site.global_id,
                'site_name': site.site_name,
                'site_code': site.site_code,
                'site_type': site.site_type,
                'status': site.status,
                
                # Location Information
                'town': site.town,
                'cluster': site.cluster,
                'state': site.state,
                'country': site.country,
                'district': site.district,
                'postal_code': site.postal_code,
                'latitude': float(site.latitude) if site.latitude else None,
                'longitude': float(site.longitude) if site.longitude else None,

                'full_address': site.full_address,
                
                # Site Details
                'contact_person': site.contact_person,
                'contact_phone': site.contact_phone,
                
                # Operational Information
                'has_coordinates': site.latitude is not None and site.longitude is not None,

                
                # Related Information
                'projects_count': self._get_projects_count(site),
                'tasks_count': self._get_tasks_count(site),
                'recent_activity': self._get_recent_activity(site),
                
                # Metadata
                'created_at': site.created_at,
                'updated_at': site.updated_at,
                'created_by': {
                    'id': site.created_by.id,
                    'name': site.created_by.full_name,
                    'email': site.created_by.email,
                } if site.created_by else None,
            }
            
            return Response(site_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching site details: {str(e)}")
            return Response(
                {"error": "Failed to fetch site details"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request, site_id):
        """Update site information"""
        try:
            # Check update permission
            if not self._check_permission(request.user, "update"):
                return Response(
                    {"detail": "You don't have permission to update sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get site for this tenant
            try:
                site = Site.objects.get(
                    id=site_id,
                    tenant=tenant,
                    deleted_at__isnull=True
                )
            except Site.DoesNotExist:
                return Response(
                    {"error": "Site not found in this circle"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            data = request.data
            
            with transaction.atomic():
                # Update mutable fields (site IDs and coordinates are immutable for data integrity)
                mutable_fields = [
                    'site_name', 'town', 'cluster', 'state', 'country', 'district', 
                    'postal_code', 'site_type', 'status',
                    'contact_person', 'contact_phone'
                ]
                
                for field in mutable_fields:
                    if field in data:
                            setattr(site, field, data[field])
                
                site.updated_at = timezone.now()
                site.save()
                

                
                return Response(
                    {"message": "Site updated successfully"}, 
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            logger.error(f"Error updating circle site: {str(e)}")
            return Response(
                {"error": "Failed to update site"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, site_id):
        """Soft delete site"""
        try:
            # Check delete permission
            if not self._check_permission(request.user, "delete"):
                return Response(
                    {"detail": "You don't have permission to delete sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get site for this tenant
            try:
                site = Site.objects.get(
                    id=site_id,
                    tenant=tenant,
                    deleted_at__isnull=True
                )
            except Site.DoesNotExist:
                return Response(
                    {"error": "Site not found in this circle"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if site has active references
            projects_count = self._get_projects_count(site)
            tasks_count = self._get_tasks_count(site)
            
            if projects_count > 0 or tasks_count > 0:
                return Response(
                    {
                        "error": "Cannot delete site with active projects or tasks",
                        "details": {
                            "projects_count": projects_count,
                            "tasks_count": tasks_count
                        }
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Soft delete
                site.deleted_at = timezone.now()
                site.save()
                

                
                return Response(
                    {"message": "Site deleted successfully"}, 
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            logger.error(f"Error deleting circle site: {str(e)}")
            return Response(
                {"error": "Failed to delete site"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_projects_count(self, site):
        """Get count of projects associated with this site"""
        # This would query the projects app when implemented
        return 0
    
    def _get_tasks_count(self, site):
        """Get count of tasks associated with this site"""
        # This would query the tasks app when implemented
        return 0
    
    def _get_recent_activity(self, site):
        """Get recent activity for this site"""
        # This would query activity logs when implemented
        return []


class SiteTemplateDownloadView(APIView):
    """
    Download Excel template for bulk site upload
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def get(self, request):
        """Download Excel template with sample data"""
        try:
            # Check read permission for template download
            if not self._check_permission(request.user, "read"):
                return Response(
                    {"detail": "You don't have permission to download site templates."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            # Create sample data with specification columns
            sample_data = {
                'site_id': ['SITE001', 'SITE002', 'SITE003'],
                'global_id': ['GLOBAL001', 'GLOBAL002', 'GLOBAL003'],
                'site_name': ['Sample Tower Site 1', 'Sample Data Center', 'Sample BTS Site'],
                'town': ['Mumbai', 'Delhi', 'Bangalore'],
                'cluster': ['West Zone', 'North Zone', 'South Zone'],
                'latitude': [19.0760, 28.7041, 12.9716],
                'longitude': [72.8777, 77.1025, 77.5946]
            }
            
            # Create DataFrame
            df = pd.DataFrame(sample_data)
            
            # Create Excel file in memory
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Sites Template', index=False)
                
                # Add instructions sheet
                instructions_data = {
                    'Column': [
                        'site_id', 'global_id', 'site_name', 'town', 'cluster', 'latitude', 'longitude', 
                        'address', 'site_type', 'contact_person', 'contact_phone'
                    ],
                    'Required': [
                        'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
                        'No', 'No', 'No', 'No'
                    ],
                    'Description': [
                        'Unique site identifier within tenant',
                        'Globally unique identifier within tenant',
                        'Human-readable site name',
                        'Town/city where site is located',
                        'Zone/operational cluster',
                        'Geographic latitude (-90 to 90)',
                        'Geographic longitude (-180 to 180)',
                        'Site address (optional)',
                        'Site type: tower, data_center, etc. (optional)',
                        'On-site contact person (optional)',
                        'Contact phone number (optional)'
                    ]
                }
                instructions_df = pd.DataFrame(instructions_data)
                instructions_df.to_excel(writer, sheet_name='Instructions', index=False)
            
            output.seek(0)
            
            # Create response
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="sites_upload_template.xlsx"'
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating template: {str(e)}")
            return Response(
                {"error": "Failed to generate template"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SiteExportView(APIView):
    """
    Export filtered sites to Excel/CSV
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def get(self, request):
        """Export sites with optional filtering"""
        try:
            # Check read permission for export
            if not self._check_permission(request.user, "read"):
                return Response(
                    {"detail": "You don't have permission to export sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            import pandas as pd
            from django.http import HttpResponse
            import io
            
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get query parameters for filtering
            export_format = request.GET.get('format', 'excel')  # excel or csv
            status_filter = request.GET.get('status', 'all')
            site_type_filter = request.GET.get('site_type', 'all')
            cluster_filter = request.GET.get('cluster', 'all')
            
            # Base query
            sites = Site.objects.filter(tenant=tenant, deleted_at__isnull=True)
            
            # Apply filters
            if status_filter != 'all':
                sites = sites.filter(status=status_filter)
            if site_type_filter != 'all':
                sites = sites.filter(site_type=site_type_filter)
            if cluster_filter != 'all':
                sites = sites.filter(cluster=cluster_filter)
            
            # Convert to list of dictionaries
            sites_data = []
            for site in sites:
                sites_data.append({
                    'Site ID': site.site_id,
                    'Global ID': site.global_id,
                    'Site Name': site.site_name,
                    'Town': site.town,
                    'Cluster': site.cluster,
                    'State': site.state,
                    'Country': site.country,
                    'District': site.district,
                    'Postal Code': site.postal_code,
                    'Latitude': float(site.latitude) if site.latitude else None,
                    'Longitude': float(site.longitude) if site.longitude else None,

                    'Site Type': site.site_type,
                    'Status': site.status,

                    'Contact Person': site.contact_person,
                    'Contact Phone': site.contact_phone,

                    'Created At': site.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'Created By': site.created_by.full_name if site.created_by else None,
                })
            
            # Create DataFrame
            df = pd.DataFrame(sites_data)
            
            if export_format == 'csv':
                # CSV Export
                output = io.StringIO()
                df.to_csv(output, index=False)
                output.seek(0)
                
                response = HttpResponse(output.getvalue(), content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="sites_export_{tenant.circle_code}.csv"'
                
            else:
                # Excel Export
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='Sites Export', index=False)
                
                output.seek(0)
                response = HttpResponse(
                    output.getvalue(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="sites_export_{tenant.circle_code}.xlsx"'
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting sites: {str(e)}")
            return Response(
                {"error": "Failed to export sites"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SiteRestoreView(APIView):
    """
    Restore soft-deleted site
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def patch(self, request, site_id):
        """Restore a soft-deleted site"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get deleted site
            try:
                site = Site.objects.get(
                    id=site_id,
                    tenant=tenant,
                    deleted_at__isnull=False
                )
            except Site.DoesNotExist:
                return Response(
                    {"error": "Deleted site not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check for ID conflicts with existing sites
            if Site.objects.filter(tenant=tenant, site_id=site.site_id, deleted_at__isnull=True).exists():
                return Response(
                    {"error": f"Site ID '{site.site_id}' already exists. Cannot restore."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if Site.objects.filter(tenant=tenant, global_id=site.global_id, deleted_at__isnull=True).exists():
                return Response(
                    {"error": f"Global ID '{site.global_id}' already exists. Cannot restore."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Restore site
                site.deleted_at = None
                site.updated_at = timezone.now()
                site.save()
                

                
                return Response(
                    {"message": "Site restored successfully"}, 
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            logger.error(f"Error restoring site: {str(e)}")
            return Response(
                {"error": "Failed to restore site"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SiteClustersView(APIView):
    """
    Get list of clusters for the tenant
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def get(self, request):
        """Get unique clusters for the tenant with optimized query"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use database aggregation for efficiency with large datasets
            from django.db.models import Count
            cluster_data = list(
                Site.objects.filter(
                tenant=tenant,
                    deleted_at__isnull=True,
                    cluster__isnull=False  # Exclude empty clusters
                )
                .values('cluster')
                .annotate(site_count=Count('id'))
                .order_by('cluster')
            )
            
            return Response({
                'clusters': cluster_data,
                'total_clusters': len(cluster_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching clusters: {str(e)}")
            return Response(
                {"error": "Failed to fetch clusters"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SiteTownsView(APIView):
    """
    Get list of towns, optionally filtered by cluster
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def get(self, request):
        """Get unique towns for the tenant, optionally filtered by cluster with optimized query and pagination"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cluster_filter = request.GET.get('cluster')
            page = int(request.GET.get('page', 1))
            page_size = min(int(request.GET.get('page_size', 100)), 500)  # Max 500 towns per page
            
            # Use database aggregation for efficiency with large datasets
            from django.db.models import Count
            query = Site.objects.filter(
                tenant=tenant, 
                deleted_at__isnull=True,
                town__isnull=False  # Exclude empty towns
            )
            
            # Apply cluster filter if provided
            if cluster_filter and cluster_filter != 'all':
                query = query.filter(cluster=cluster_filter)
            
            # Get town data with counts in a single optimized query
            town_query = (
                query.values('town')
                .annotate(site_count=Count('id'))
                .order_by('town')
            )
            
            # Get total count for pagination
            total_count = town_query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            total_pages = (total_count + page_size - 1) // page_size
            
            town_data = list(town_query[offset:offset + page_size])
            
            # Add cluster info to each town if cluster filter is applied
            if cluster_filter and cluster_filter != 'all':
                for town in town_data:
                    town['cluster'] = cluster_filter
            
            return Response({
                'towns': town_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                },
                'total_towns': total_count,
                'cluster_filter': cluster_filter
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching towns: {str(e)}")
            return Response(
                {"error": "Failed to fetch towns"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BulkSiteUploadView(APIView):
    """
    Bulk Site Upload for Circle Tenants
    Support for Excel/CSV upload with validation and error reporting
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def post(self, request):
        """Upload multiple sites via Excel/CSV file"""
        try:
            # Check create permission for bulk upload
            if not self._check_permission(request.user, "create"):
                return Response(
                    {"detail": "You don't have permission to bulk upload sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if 'file' not in request.FILES:
                return Response(
                    {"error": "No file uploaded"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            uploaded_file = request.FILES['file']
            
            # Process the file based on type
            if uploaded_file.name.endswith('.xlsx') or uploaded_file.name.endswith('.xls'):
                result = self._process_excel_file(uploaded_file, tenant, request.user)
            elif uploaded_file.name.endswith('.csv'):
                result = self._process_csv_file(uploaded_file, tenant, request.user)
            else:
                return Response(
                    {"error": "Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV (.csv) files."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing bulk site upload: {str(e)}")
            return Response(
                {"error": "Failed to process file upload"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_excel_file(self, file, tenant, user):
        """Process Excel file for bulk site upload"""
        import pandas as pd
        
        try:
            # Read Excel file
            df = pd.read_excel(file)
            return self._process_dataframe(df, tenant, user)
        except Exception as e:
            return {"error": f"Failed to read Excel file: {str(e)}"}
    
    def _process_csv_file(self, file, tenant, user):
        """Process CSV file for bulk site upload"""
        import pandas as pd
        
        try:
            # Read CSV file
            df = pd.read_csv(file)
            return self._process_dataframe(df, tenant, user)
        except Exception as e:
            return {"error": f"Failed to read CSV file: {str(e)}"}
    
    def _process_dataframe(self, df, tenant, user):
        """Process pandas DataFrame for bulk site creation"""
        required_columns = ['site_id', 'global_id', 'site_name', 'town', 'cluster', 'latitude', 'longitude']
        
        # Check for required columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {
                "error": f"Missing required columns: {', '.join(missing_columns)}",
                "required_columns": required_columns,
                "found_columns": list(df.columns)
            }
        
        success_count = 0
        error_count = 0
        errors = []
        created_sites = []
        
        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    site_id = str(row['site_id']).strip()
                    global_id = str(row['global_id']).strip()
                    site_name = str(row['site_name']).strip()
                    town = str(row['town']).strip()
                    cluster = str(row['cluster']).strip()
                    
                    if not all([site_id, global_id, site_name, town, cluster]):
                        errors.append({
                            "row": index + 2,  # +2 for 1-indexed and header row
                            "error": "Missing required field(s): site_id, global_id, site_name, town, cluster are all required"
                        })
                        error_count += 1
                        continue
                    
                    # Validate coordinates
                    try:
                        latitude = float(row['latitude'])
                        longitude = float(row['longitude'])
                        
                        if not (-90 <= latitude <= 90):
                            errors.append({
                                "row": index + 2,
                                "error": "Latitude must be between -90 and 90 degrees"
                            })
                            error_count += 1
                            continue
                        
                        if not (-180 <= longitude <= 180):
                            errors.append({
                                "row": index + 2,
                                "error": "Longitude must be between -180 and 180 degrees"
                            })
                            error_count += 1
                            continue
                            
                    except (ValueError, TypeError):
                        errors.append({
                            "row": index + 2,
                            "error": "Invalid latitude or longitude format"
                        })
                        error_count += 1
                        continue
                    
                    # Check for duplicates within tenant
                    if Site.objects.filter(tenant=tenant, site_id=site_id, deleted_at__isnull=True).exists():
                        errors.append({
                            "row": index + 2,
                            "error": f"Site ID '{site_id}' already exists in this circle"
                        })
                        error_count += 1
                        continue
                    
                    if Site.objects.filter(tenant=tenant, global_id=global_id, deleted_at__isnull=True).exists():
                        errors.append({
                            "row": index + 2,
                            "error": f"Global ID '{global_id}' already exists in this circle"
                        })
                        error_count += 1
                        continue
                    
                    # Create the site
                    site = Site.objects.create(
                        tenant=tenant,
                        created_by=user,
                        
                        # Required specification fields
                        site_id=site_id,
                        global_id=global_id,
                        site_name=site_name,
                        town=town,
                        cluster=cluster,
                        latitude=latitude,
                        longitude=longitude,
                        
                        # Optional fields from CSV/Excel
                        address=str(row.get('address', '')).strip(),
                        site_type=str(row.get('site_type', 'tower')).strip(),
                        contact_person=str(row.get('contact_person', '')).strip(),
                        contact_phone=str(row.get('contact_phone', '')).strip(),
                        
                        # Legacy compatibility fields (populated from spec fields)
                        name=site_name,  # Copy from site_name
                        city=town,  # Copy from town
                        site_code=site_id,  # Copy from site_id
                        state=str(row.get('state', '')).strip(),
                        country=str(row.get('country', 'India')).strip(),
                        postal_code=str(row.get('postal_code', '')).strip(),
                        description=str(row.get('description', '')).strip(),
                        contact_email=str(row.get('contact_email', '')).strip(),
                    )
                    
                    created_sites.append({
                        'row': index + 2,
                        'site_id': site.site_id,
                        'global_id': site.global_id,
                        'site_name': site.site_name,
                        'id': site.id
                    })
                    success_count += 1
                    
                except Exception as e:
                    errors.append({
                        "row": index + 2,
                        "error": f"Failed to create site: {str(e)}"
                    })
                    error_count += 1
        
        return {
            "message": f"Bulk upload completed. {success_count} sites created, {error_count} errors.",
            "summary": {
                "total_rows": len(df),
                "success_count": success_count,
                "error_count": error_count
            },
            "created_sites": created_sites,
            "errors": errors,  # Return all errors
            "has_more_errors": False  # No more errors since we return all
        }


class AsyncBulkSiteUploadView(APIView):
    """
    Asynchronous Bulk Site Upload for Large Files
    Handles uploads with more than 1000 rows using background processing
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def post(self, request):
        """Start asynchronous bulk upload for large files"""
        try:
            logger.info(f"Async bulk upload request received from user {request.user.id}")
            
            # Check create permission for bulk upload
            if not self._check_permission(request.user, "create"):
                return Response(
                    {"detail": "You don't have permission to bulk upload sites."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if 'file' not in request.FILES:
                return Response(
                    {"error": "No file uploaded"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            uploaded_file = request.FILES['file']
            logger.info(f"Processing file: {uploaded_file.name}, size: {uploaded_file.size} bytes")
            
            # Check file size and row count
            try:
                import pandas as pd
                if uploaded_file.name.endswith('.xlsx') or uploaded_file.name.endswith('.xls'):
                    df = pd.read_excel(uploaded_file)
                elif uploaded_file.name.endswith('.csv'):
                    df = pd.read_csv(uploaded_file)
                else:
                    return Response(
                        {"error": "Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV (.csv) files."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                total_rows = len(df)
                
                # For small files (< 1000 rows), use synchronous processing
                if total_rows < 1000:
                    return Response(
                        {"error": "File has less than 1000 rows. Use the regular bulk upload endpoint."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create bulk upload job
                from .models import BulkUploadJob
                job = BulkUploadJob.objects.create(
                    tenant=tenant,
                    created_by=request.user,
                    file_name=uploaded_file.name,
                    total_rows=total_rows,
                    status='pending'
                )
                
                # Start background processing in a separate thread
                import threading
                thread = threading.Thread(
                    target=self._process_large_upload_async,
                    args=(job, df, tenant, request.user)
                )
                thread.daemon = True
                thread.start()
                
                return Response({
                    "message": f"Large file upload started. Processing {total_rows} sites in background.",
                    "job_id": job.id,
                    "status": "processing",
                    "total_rows": total_rows,
                    "estimated_time": f"~{total_rows // 100} minutes"
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as e:
                logger.error(f"Error processing large upload file: {str(e)}")
                return Response(
                    {"error": f"Failed to process file: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            logger.error(f"Error starting async bulk site upload: {str(e)}")
            return Response(
                {"error": "Failed to start upload process"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_large_upload_async(self, job, df, tenant, user):
        """Process large upload asynchronously in chunks"""
        try:
            logger.info(f"Starting async processing for job {job.id}, {len(df)} rows")
            job.status = 'processing'
            job.started_at = timezone.now()
            job.detailed_errors = []  # Initialize errors list
            job.save()
            
            # Process in chunks of 100 rows
            chunk_size = 100
            total_chunks = (len(df) + chunk_size - 1) // chunk_size
            logger.info(f"Processing {len(df)} rows in {total_chunks} chunks of {chunk_size}")
            
            all_errors = []
            
            for chunk_idx in range(total_chunks):
                start_idx = chunk_idx * chunk_size
                end_idx = min(start_idx + chunk_size, len(df))
                chunk_df = df.iloc[start_idx:end_idx]
                
                # Process chunk
                chunk_result = self._process_chunk(chunk_df, tenant, user, start_idx)
                
                # Collect errors from this chunk
                if chunk_result.get('errors'):
                    all_errors.extend(chunk_result['errors'])
                
                # Update job progress
                job.processed_rows = end_idx
                job.success_count += chunk_result['success_count']
                job.error_count += chunk_result['error_count']
                job.detailed_errors = all_errors  # Store all errors collected so far
                job.save()
                
                # Small delay to prevent overwhelming the database
                import time
                time.sleep(0.1)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            job.save()
            
            logger.info(f"Bulk upload job {job.id} completed successfully. {job.success_count} sites created, {job.error_count} errors.")
            
        except Exception as e:
            logger.error(f"Error in async bulk upload job {job.id}: {str(e)}")
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
    
    def _process_chunk(self, chunk_df, tenant, user, start_idx):
        """Process a chunk of rows"""
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in chunk_df.iterrows():
            try:
                # Validate required fields
                site_id = str(row['site_id']).strip()
                global_id = str(row['global_id']).strip()
                site_name = str(row['site_name']).strip()
                town = str(row['town']).strip()
                cluster = str(row['cluster']).strip()
                
                if not all([site_id, global_id, site_name, town, cluster]):
                    errors.append({
                        "row": index + 2,  # +2 for 1-indexed and header row
                        "error": "Missing required field(s): site_id, global_id, site_name, town, cluster are all required"
                    })
                    error_count += 1
                    continue
                
                # Validate coordinates
                try:
                    latitude = float(row['latitude'])
                    longitude = float(row['longitude'])
                    
                    if not (-90 <= latitude <= 90):
                        errors.append({
                            "row": index + 2,
                            "error": "Latitude must be between -90 and 90 degrees"
                        })
                        error_count += 1
                        continue
                    
                    if not (-180 <= longitude <= 180):
                        errors.append({
                            "row": index + 2,
                            "error": "Longitude must be between -180 and 180 degrees"
                        })
                        error_count += 1
                        continue
                        
                except (ValueError, TypeError):
                    errors.append({
                        "row": index + 2,
                        "error": "Invalid latitude or longitude format"
                    })
                    error_count += 1
                    continue
                
                # Check for duplicates
                if Site.objects.filter(tenant=tenant, site_id=site_id, deleted_at__isnull=True).exists():
                    errors.append({
                        "row": index + 2,
                        "error": f"Site ID '{site_id}' already exists in this circle"
                    })
                    error_count += 1
                    continue
                
                if Site.objects.filter(tenant=tenant, global_id=global_id, deleted_at__isnull=True).exists():
                    errors.append({
                        "row": index + 2,
                        "error": f"Global ID '{global_id}' already exists in this circle"
                    })
                    error_count += 1
                    continue
                
                # Create the site
                Site.objects.create(
                    tenant=tenant,
                    created_by=user,
                    site_id=site_id,
                    global_id=global_id,
                    site_name=site_name,
                    town=town,
                    cluster=cluster,
                    latitude=latitude,
                    longitude=longitude,
                    address=str(row.get('address', '')).strip(),
                    site_type=str(row.get('site_type', 'tower')).strip(),
                    contact_person=str(row.get('contact_person', '')).strip(),
                    contact_phone=str(row.get('contact_phone', '')).strip(),
                    name=site_name,
                    city=town,
                    site_code=site_id,
                    state=str(row.get('state', '')).strip(),
                    country=str(row.get('country', 'India')).strip(),
                    postal_code=str(row.get('postal_code', '')).strip(),
                    description=str(row.get('description', '')).strip(),
                    contact_email=str(row.get('contact_email', '')).strip(),
                )
                
                success_count += 1
                
            except Exception as e:
                errors.append({
                    "row": index + 2,
                    "error": f"Failed to create site: {str(e)}"
                })
                error_count += 1
                logger.error(f"Error creating site in chunk: {str(e)}")
        
        return {
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors
        }


class BulkUploadJobStatusView(APIView):
    """
    Get status of bulk upload jobs
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def get(self, request, job_id=None):
        """Get bulk upload job status"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from .models import BulkUploadJob
            
            if job_id:
                # Get specific job
                try:
                    job = BulkUploadJob.objects.get(id=job_id, tenant=tenant)
                    return Response({
                        'job_id': job.id,
                        'file_name': job.file_name,
                        'status': job.status,
                        'total_rows': job.total_rows,
                        'processed_rows': job.processed_rows,
                        'success_count': job.success_count,
                        'error_count': job.error_count,
                        'progress_percentage': job.progress_percentage,
                        'started_at': job.started_at,
                        'completed_at': job.completed_at,
                        'duration': str(job.duration) if job.duration else None,
                        'error_message': job.error_message,
                        'errors': job.detailed_errors or []  # Include detailed errors
                    })
                except BulkUploadJob.DoesNotExist:
                    return Response(
                        {"error": "Job not found"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Get all jobs for tenant
                jobs = BulkUploadJob.objects.filter(tenant=tenant).order_by('-created_at')[:10]
                return Response({
                    'jobs': [{
                        'job_id': job.id,
                        'file_name': job.file_name,
                        'status': job.status,
                        'total_rows': job.total_rows,
                        'processed_rows': job.processed_rows,
                        'progress_percentage': job.progress_percentage,
                        'created_at': job.created_at,
                        'completed_at': job.completed_at
                    } for job in jobs]
                })
                
        except Exception as e:
            logger.error(f"Error getting bulk upload job status: {str(e)}")
            return Response(
                {"error": "Failed to get job status"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GeographicAnalysisView(APIView):
    """
    Geographic Analysis for Sites
    Provides geographic calculations and analysis on-demand
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def _check_permission(self, user, action):
        """Check if user has specific permission for sites"""
        try:
            if not hasattr(user, 'tenant_user_profile'):
                return False
                
            profile = user.tenant_user_profile
            rbac_service = TenantRBACService(profile.tenant)
            
            permissions = rbac_service.get_user_effective_permissions(profile)
            user_permissions = permissions.get('permissions', {})
            
            # Check for specific action permission (exact match)
            permission_code = f"site.{action}"
            if permission_code in user_permissions:
                return True
            
            # Check for compound permissions (e.g., site.read_create for create action)
            for code in user_permissions.keys():
                if code.startswith('site.'):
                    # Extract actions from permission code
                    if '.' in code:
                        actions_part = code.split('.', 1)[1]  # Get part after 'site.'
                        if action in actions_part.split('_'):
                            return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking permission {action} for user {user.id}: {str(e)}")
            return False
    
    def get(self, request):
        """Get geographic analysis for the current tenant's sites"""
        try:
            # Check read permission
            if not self._check_permission(request.user, "read"):
                return Response(
                    {"detail": "You don't have permission to view site analysis."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get all sites for this tenant
            sites = Site.objects.filter(
                tenant=tenant,
                deleted_at__isnull=True
            ).order_by('-created_at')
            
            # Calculate geographic analysis
            coverage_radius = self._calculate_coverage_radius(sites)
            geographic_center = self._calculate_geographic_center(sites)
            total_area_covered = self._calculate_coverage_area(sites)
            
            # Get GPS statistics
            sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
            total_sites = sites.count()
            sites_with_coordinates = sites_with_coords.count()
            sites_without_coordinates = total_sites - sites_with_coordinates
            
            response_data = {
                'geographic_analysis': {
                    'coverage_radius_km': coverage_radius,
                    'geographic_center': geographic_center,
                    'total_area_covered': total_area_covered,
                },
                'gps_statistics': {
                    'total_sites': total_sites,
                    'sites_with_coordinates': sites_with_coordinates,
                    'sites_without_coordinates': sites_without_coordinates,
                    'coverage_percentage': round((sites_with_coordinates / total_sites * 100) if total_sites > 0 else 0, 2)
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error calculating geographic analysis: {str(e)}")
            return Response(
                {"error": "Failed to calculate geographic analysis"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_coverage_radius(self, sites):
        """Calculate the radius of coverage area in kilometers"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if sites_with_coords.count() < 2:
            return 0
        
        import math
        
        # Find the maximum distance between any two sites
        max_distance = 0
        coords = [(float(site.latitude), float(site.longitude)) for site in sites_with_coords]
        
        for i, coord1 in enumerate(coords):
            for coord2 in coords[i+1:]:
                distance = self._haversine_distance(coord1[0], coord1[1], coord2[0], coord2[1])
                max_distance = max(max_distance, distance)
        
        return round(max_distance / 2, 2)  # Radius is half the maximum distance
    
    def _calculate_geographic_center(self, sites):
        """Calculate the geographic center of all sites"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if not sites_with_coords.exists():
            return None
        
        total_lat = sum(float(site.latitude) for site in sites_with_coords)
        total_lng = sum(float(site.longitude) for site in sites_with_coords)
        count = sites_with_coords.count()
        
        return {
            'latitude': round(total_lat / count, 6),
            'longitude': round(total_lng / count, 6)
        }
    
    def _calculate_coverage_area(self, sites):
        """Calculate approximate coverage area in square kilometers"""
        sites_with_coords = sites.exclude(latitude__isnull=True, longitude__isnull=True)
        if sites_with_coords.count() < 3:
            return 0
        
        # Simple bounding box calculation
        latitudes = [float(site.latitude) for site in sites_with_coords]
        longitudes = [float(site.longitude) for site in sites_with_coords]
        
        lat_range = max(latitudes) - min(latitudes)
        lng_range = max(longitudes) - min(longitudes)
        
        # Approximate area calculation (rough estimate)
        lat_km = lat_range * 111  # 1 degree latitude ≈ 111 km
        lng_km = lng_range * 111 * abs(sum(latitudes) / len(latitudes) / 180)  # Adjust for latitude
        
        return round(lat_km * lng_km, 2)
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points on earth (in kilometers)"""
        import math
        
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        
        return c * r 