from rest_framework import serializers
from .models import Site


class SiteSerializer(serializers.ModelSerializer):
    """Comprehensive site serializer for API responses"""
    
    full_address = serializers.ReadOnlyField()
    has_coordinates = serializers.SerializerMethodField()
    
    class Meta:
        model = Site
        fields = [
            'id', 'site_id', 'global_id', 'site_name', 'site_code', 'site_type', 'status',
            'town', 'cluster', 'state', 'country', 'district', 'postal_code',
            'latitude', 'longitude', 'elevation', 'full_address',
            'access_instructions', 'safety_requirements', 'contact_person', 
            'contact_phone', 'landmark_description',
            'has_coordinates', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'site_code', 'created_at', 'updated_at', 'full_address']
    
    def get_has_coordinates(self, obj):
        """Check if site has valid GPS coordinates"""
        return obj.latitude is not None and obj.longitude is not None


class SiteCreateSerializer(serializers.ModelSerializer):
    """Site creation serializer with validation"""
    
    class Meta:
        model = Site
        fields = [
            'site_id', 'global_id', 'site_name', 'site_type', 'status',
            'town', 'cluster', 'state', 'country', 'district', 'postal_code',
            'latitude', 'longitude', 'elevation',
            'access_instructions', 'safety_requirements', 'contact_person', 
            'contact_phone', 'landmark_description'
        ]
    
    def validate_latitude(self, value):
        """Validate latitude range"""
        if value is not None and not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        return value
    
    def validate_longitude(self, value):
        """Validate longitude range"""
        if value is not None and not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        # Both latitude and longitude must be provided together
        lat = data.get('latitude')
        lng = data.get('longitude')
        
        if (lat is not None and lng is None) or (lat is None and lng is not None):
            raise serializers.ValidationError("Both latitude and longitude must be provided together")
        
        return data


class SiteBulkCreateSerializer(serializers.Serializer):
    """Serializer for bulk site creation"""
    
    file = serializers.FileField(
        help_text="Excel (.xlsx, .xls) or CSV (.csv) file containing site data"
    )
    
    def validate_file(self, value):
        """Validate uploaded file"""
        if not value.name.lower().endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError(
                "Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV (.csv) files."
            )
        
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB")
        
        return value


class SiteUpdateSerializer(serializers.ModelSerializer):
    """Site update serializer (excludes immutable fields)"""
    
    class Meta:
        model = Site
        fields = [
            'site_name', 'site_type', 'status',
            'town', 'cluster', 'state', 'country', 'district', 'postal_code', 'elevation',
            'access_instructions', 'safety_requirements', 'contact_person', 
            'contact_phone', 'landmark_description'
        ]
    
    def validate(self, data):
        """Validation for updates"""
        # Prevent updates to critical fields that should remain immutable
        immutable_fields = ['site_id', 'global_id', 'latitude', 'longitude']
        
        # Check if any immutable fields are being updated
        for field in immutable_fields:
            if field in self.initial_data:
                raise serializers.ValidationError(
                    f"Field '{field}' is immutable and cannot be updated for data integrity"
                )
        
        return data 