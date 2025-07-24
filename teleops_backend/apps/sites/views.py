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

logger = logging.getLogger(__name__)


class CircleSiteManagementView(APIView):
    """
    Circle Site Management for Circle Tenant Administrators
    Provides comprehensive site management with GPS boundaries and circle-specific features
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def get(self, request):
        """Get all sites for the current circle tenant"""
        try:
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
            for site in sites:
                # City distribution
                city = site.city or 'Unknown'
                cities[city] = cities.get(city, 0) + 1
                
                # State distribution  
                state = site.state or 'Unknown'
                states[state] = states.get(state, 0) + 1
            
            # Coverage areas (based on geographic spread)
            coverage_radius = self._calculate_coverage_radius(sites)
            geographic_center = self._calculate_geographic_center(sites)
            
            # Serialize sites data
            sites_data = []
            for site in sites:
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
                    'elevation': float(site.elevation) if site.elevation else None,
                    'full_address': site.full_address,
                    
                    # Site Details
                    'access_instructions': site.access_instructions,
                    'safety_requirements': site.safety_requirements,
                    'contact_person': site.contact_person,
                    'contact_phone': site.contact_phone,
                    'landmark_description': site.landmark_description,
                    
                    # Operational Information
                    'has_coordinates': site.latitude is not None and site.longitude is not None,
                    'coordinate_quality': self._assess_coordinate_quality(site),
                    'accessibility_rating': self._calculate_accessibility_rating(site),
                    
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
                    
                    # Required fields
                    site_id=site_id,
                    global_id=global_id,
                    site_name=data['site_name'].strip(),
                    town=data['town'].strip(),
                    cluster=data['cluster'].strip(),
                    latitude=latitude,
                    longitude=longitude,
                    
                    # Optional fields
                    state=data.get('state', '').strip(),
                    country=data.get('country', 'India').strip(),
                    district=data.get('district', '').strip(),
                    postal_code=data.get('postal_code', '').strip(),
                    elevation=float(data['elevation']) if data.get('elevation') else None,
                    
                    # Site details
                    site_type=data.get('site_type', 'tower'),
                    status=data.get('status', 'active'),
                    access_instructions=data.get('access_instructions', '').strip(),
                    safety_requirements=data.get('safety_requirements', '').strip(),
                    contact_person=data.get('contact_person', '').strip(),
                    contact_phone=data.get('contact_phone', '').strip(),
                    landmark_description=data.get('landmark_description', '').strip(),
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
                
                logger.info(f"Circle site created: {site_id} for tenant {tenant.organization_name}")
                
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
    
    def _assess_coordinate_quality(self, site):
        """Assess the quality of GPS coordinates"""
        if site.latitude is None or site.longitude is None:
            return 'no_coordinates'
        
        # Basic validation
        lat = float(site.latitude)
        lng = float(site.longitude)
        
        # Check if coordinates are likely valid (not 0,0 or other obvious placeholders)
        if lat == 0 and lng == 0:
            return 'placeholder'
        
        # Check precision (more decimal places = better quality)
        lat_precision = len(str(site.latitude).split('.')[-1]) if '.' in str(site.latitude) else 0
        lng_precision = len(str(site.longitude).split('.')[-1]) if '.' in str(site.longitude) else 0
        
        avg_precision = (lat_precision + lng_precision) / 2
        
        if avg_precision >= 5:
            return 'high_precision'
        elif avg_precision >= 3:
            return 'medium_precision'
        else:
            return 'low_precision'
    
    def _calculate_accessibility_rating(self, site):
        """Calculate accessibility rating based on available information"""
        score = 0
        
        # Contact information available
        if site.contact_person:
            score += 2
        if site.contact_phone:
            score += 2
        
        # Access instructions provided
        if site.access_instructions:
            score += 3
        
        # Landmark description available
        if site.landmark_description:
            score += 2
        
        # Safety requirements documented
        if site.safety_requirements:
            score += 1
        
        # Convert to rating
        if score >= 8:
            return 'excellent'
        elif score >= 6:
            return 'good'
        elif score >= 4:
            return 'fair'
        else:
            return 'poor'


class CircleSiteDetailView(APIView):
    """
    Individual Circle Site Management
    Update, delete, or get detailed information about a specific site
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def get(self, request, site_id):
        """Get detailed information about a specific site"""
        try:
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
                'elevation': float(site.elevation) if site.elevation else None,
                'full_address': site.full_address,
                
                # Site Details
                'access_instructions': site.access_instructions,
                'safety_requirements': site.safety_requirements,
                'contact_person': site.contact_person,
                'contact_phone': site.contact_phone,
                'landmark_description': site.landmark_description,
                
                # Operational Information
                'has_coordinates': site.latitude is not None and site.longitude is not None,
                'coordinate_quality': self._assess_coordinate_quality(site),
                'accessibility_rating': self._calculate_accessibility_rating(site),
                
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
                    'postal_code', 'elevation', 'site_type', 'status',
                    'access_instructions', 'safety_requirements', 'contact_person', 
                    'contact_phone', 'landmark_description'
                ]
                
                for field in mutable_fields:
                    if field in data:
                        if field in ['elevation'] and data[field]:
                            try:
                                setattr(site, field, float(data[field]))
                            except (ValueError, TypeError):
                                return Response(
                                    {"error": f"Invalid {field} format"}, 
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        else:
                            setattr(site, field, data[field])
                
                site.updated_at = timezone.now()
                site.save()
                
                logger.info(f"Circle site updated: {site.site_id} for tenant {tenant.organization_name}")
                
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
                
                logger.info(f"Circle site deleted: {site.site_id} for tenant {tenant.organization_name}")
                
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
    
    def _assess_coordinate_quality(self, site):
        """Assess the quality of GPS coordinates"""
        if site.latitude is None or site.longitude is None:
            return 'no_coordinates'
        
        # Basic validation
        lat = float(site.latitude)
        lng = float(site.longitude)
        
        # Check if coordinates are likely valid (not 0,0 or other obvious placeholders)
        if lat == 0 and lng == 0:
            return 'placeholder'
        
        # Check precision (more decimal places = better quality)
        lat_precision = len(str(site.latitude).split('.')[-1]) if '.' in str(site.latitude) else 0
        lng_precision = len(str(site.longitude).split('.')[-1]) if '.' in str(site.longitude) else 0
        
        avg_precision = (lat_precision + lng_precision) / 2
        
        if avg_precision >= 5:
            return 'high_precision'
        elif avg_precision >= 3:
            return 'medium_precision'
        else:
            return 'low_precision'
    
    def _calculate_accessibility_rating(self, site):
        """Calculate accessibility rating based on available information"""
        score = 0
        
        # Contact information available
        if site.contact_person:
            score += 2
        if site.contact_phone:
            score += 2
        
        # Access instructions provided
        if site.access_instructions:
            score += 3
        
        # Landmark description available
        if site.landmark_description:
            score += 2
        
        # Safety requirements documented
        if site.safety_requirements:
            score += 1
        
        # Convert to rating
        if score >= 8:
            return 'excellent'
        elif score >= 6:
            return 'good'
        elif score >= 4:
            return 'fair'
        else:
            return 'poor'
    
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


class BulkSiteUploadView(APIView):
    """
    Bulk Site Upload for Circle Tenants
    Support for Excel/CSV upload with validation and error reporting
    """
    permission_classes = [IsAuthenticated, IsTenantMember]
    
    def post(self, request):
        """Upload multiple sites via Excel/CSV file"""
        try:
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
                            "error": "Missing required field(s)"
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
                        
                        # Required fields
                        site_id=site_id,
                        global_id=global_id,
                        site_name=site_name,
                        town=town,
                        cluster=cluster,
                        latitude=latitude,
                        longitude=longitude,
                        
                        # Optional fields from CSV/Excel
                        state=str(row.get('state', '')).strip(),
                        country=str(row.get('country', 'India')).strip(),
                        district=str(row.get('district', '')).strip(),
                        postal_code=str(row.get('postal_code', '')).strip(),
                        elevation=float(row['elevation']) if pd.notna(row.get('elevation')) else None,
                        
                        # Site details
                        site_type=str(row.get('site_type', 'tower')).strip(),
                        access_instructions=str(row.get('access_instructions', '')).strip(),
                        safety_requirements=str(row.get('safety_requirements', '')).strip(),
                        contact_person=str(row.get('contact_person', '')).strip(),
                        contact_phone=str(row.get('contact_phone', '')).strip(),
                        landmark_description=str(row.get('landmark_description', '')).strip(),
                    )
                    
                    created_sites.append({
                        'row': index + 2,
                        'site_id': site.site_id,
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