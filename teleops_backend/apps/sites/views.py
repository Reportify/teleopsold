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
        """Get all sites for the current circle tenant"""
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
            
            # Get all sites for this circle tenant
            sites = Site.objects.filter(
                tenant=tenant,
                deleted_at__isnull=True
            ).order_by('-created_at')
            
            # Calculate site statistics
            total_sites = sites.count()
            active_sites = sites.filter(status='active').count()
            inactive_sites = sites.filter(status='inactive').count()
            maintenance_sites = sites.filter(status='maintenance').count()
            
            # Site type distribution
            site_types = {}
            for site_type, _ in Site.SITE_TYPE:
                count = sites.filter(site_type=site_type).count()
                if count > 0:
                    site_types[site_type] = count
            
            # Geographic distribution
            cities = {}
            states = {}
            clusters = {}
            for site in sites:
                # City/Town distribution (prioritize town, fallback to city)
                location = site.town or site.city or 'Unknown'
                cities[location] = cities.get(location, 0) + 1
                
                # State distribution  
                state = site.state or 'Unknown'
                states[state] = states.get(state, 0) + 1
                
                # Cluster/Zone distribution
                cluster = site.cluster or 'Default Zone'
                clusters[cluster] = clusters.get(cluster, 0) + 1
            
            # Coverage areas (based on geographic spread)
            coverage_radius = self._calculate_coverage_radius(sites)
            geographic_center = self._calculate_geographic_center(sites)
            
            # Serialize sites data
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
                'statistics': {
                    'total_sites': total_sites,
                    'active_sites': active_sites,
                    'inactive_sites': inactive_sites,
                    'maintenance_sites': maintenance_sites,
                    'sites_with_coordinates': sites.exclude(latitude__isnull=True, longitude__isnull=True).count(),
                    'sites_without_coordinates': sites.filter(latitude__isnull=True, longitude__isnull=True).count(),
                },
                'distributions': {
                    'site_types': site_types,
                    'cities': dict(sorted(cities.items(), key=lambda x: x[1], reverse=True)[:10]),  # Top 10 cities
                    'states': dict(sorted(states.items(), key=lambda x: x[1], reverse=True)),
                    'clusters': dict(sorted(clusters.items(), key=lambda x: x[1], reverse=True)),
                },
                'geographic_analysis': {
                    'coverage_radius_km': coverage_radius,
                    'geographic_center': geographic_center,
                    'total_area_covered': self._calculate_coverage_area(sites),
                },
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
        """Get unique clusters for the tenant"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get unique clusters
            clusters = Site.objects.filter(
                tenant=tenant,
                deleted_at__isnull=True
            ).values_list('cluster', flat=True).distinct().order_by('cluster')
            
            # Count sites per cluster
            cluster_data = []
            for cluster in clusters:
                if cluster:  # Skip empty clusters
                    site_count = Site.objects.filter(
                        tenant=tenant,
                        cluster=cluster,
                        deleted_at__isnull=True
                    ).count()
                    
                    cluster_data.append({
                        'cluster': cluster,
                        'site_count': site_count
                    })
            
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
        """Get unique towns for the tenant, optionally filtered by cluster"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cluster_filter = request.GET.get('cluster')
            
            # Base query
            query = Site.objects.filter(tenant=tenant, deleted_at__isnull=True)
            
            # Apply cluster filter if provided
            if cluster_filter:
                query = query.filter(cluster=cluster_filter)
            
            # Get unique towns
            towns = query.values_list('town', flat=True).distinct().order_by('town')
            
            # Count sites per town
            town_data = []
            for town in towns:
                if town:  # Skip empty towns
                    site_count_query = Site.objects.filter(
                        tenant=tenant,
                        town=town,
                        deleted_at__isnull=True
                    )
                    
                    # Apply cluster filter for count if provided
                    if cluster_filter:
                        site_count_query = site_count_query.filter(cluster=cluster_filter)
                    
                    site_count = site_count_query.count()
                    
                    town_data.append({
                        'town': town,
                        'site_count': site_count,
                        'cluster': cluster_filter
                    })
            
            return Response({
                'towns': town_data,
                'total_towns': len(town_data),
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
            "errors": errors[:50],  # Limit to first 50 errors
            "has_more_errors": len(errors) > 50
        } 