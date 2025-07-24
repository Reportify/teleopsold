"""
Profile service for teleops_internal user profile management
"""

import logging
from typing import Dict, Any, Optional
from django.db import transaction
from django.utils import timezone

from apps.users.models import User
from ..users.models import InternalProfile
from ..exceptions import (
    InternalProfileNotFoundError,
    ProfileUpdateError,
    ValidationError
)

logger = logging.getLogger(__name__)


class ProfileService:
    """Service for handling internal profile management"""
    
    def get_profile_by_user(self, user: User) -> InternalProfile:
        """
        Get internal profile by user
        
        Args:
            user: User instance
            
        Returns:
            InternalProfile: Internal profile instance
            
        Raises:
            InternalProfileNotFoundError: If profile doesn't exist
        """
        try:
            return user.internal_profile
        except InternalProfile.DoesNotExist:
            logger.error(f"Internal profile not found for user: {user.email}")
            raise InternalProfileNotFoundError("Internal profile not found")
    
    def update_profile(self, user: User, update_data: Dict[str, Any]) -> InternalProfile:
        """
        Update internal profile
        
        Args:
            user: User instance
            update_data: Dictionary containing fields to update
            
        Returns:
            InternalProfile: Updated profile instance
            
        Raises:
            InternalProfileNotFoundError: If profile doesn't exist
            ProfileUpdateError: If update fails
        """
        try:
            with transaction.atomic():
                profile = self.get_profile_by_user(user)
                
                # Define updateable fields
                updateable_fields = [
                    'display_name', 'phone_number', 'employee_id', 
                    'profile_photo', 'department'
                ]
                
                # Update allowed fields
                updated_fields = []
                for field, value in update_data.items():
                    if field in updateable_fields and hasattr(profile, field):
                        setattr(profile, field, value)
                        updated_fields.append(field)
                
                if updated_fields:
                    profile.updated_at = timezone.now()
                    profile.save()
                    
                    logger.info(f"Profile updated for {user.email}: {', '.join(updated_fields)}")
                else:
                    logger.warning(f"No valid fields to update for {user.email}")
                
                return profile
                
        except InternalProfileNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update profile for {user.email}: {e}", exc_info=True)
            raise ProfileUpdateError(f"Failed to update profile: {str(e)}")
    
    def create_internal_profile(self, user: User, profile_data: Dict[str, Any]) -> InternalProfile:
        """
        Create internal profile for user
        
        Args:
            user: User instance
            profile_data: Dictionary containing profile data
            
        Returns:
            InternalProfile: Created profile instance
            
        Raises:
            ProfileUpdateError: If creation fails
            ValidationError: If data validation fails
        """
        try:
            with transaction.atomic():
                # Validate required fields
                self._validate_profile_data(profile_data)
                
                # Check if profile already exists
                if hasattr(user, 'internal_profile'):
                    raise ProfileUpdateError("Internal profile already exists for this user")
                
                # Create profile
                profile = InternalProfile.objects.create(
                    user=user,
                    display_name=profile_data.get('display_name', ''),
                    phone_number=profile_data.get('phone_number', ''),
                    employee_id=profile_data.get('employee_id'),
                    role=profile_data.get('role', ''),
                    access_level=profile_data.get('access_level', ''),
                    department=profile_data.get('department', ''),
                    reporting_manager_id=profile_data.get('reporting_manager_id'),
                )
                
                logger.info(f"Internal profile created for {user.email}")
                return profile
                
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to create profile for {user.email}: {e}", exc_info=True)
            raise ProfileUpdateError(f"Failed to create profile: {str(e)}")
    
    def get_profile_hierarchy(self, profile: InternalProfile) -> Dict[str, Any]:
        """
        Get profile hierarchy information
        
        Args:
            profile: InternalProfile instance
            
        Returns:
            Dict: Hierarchy information including manager and subordinates
        """
        try:
            hierarchy = {
                'manager': None,
                'subordinates': [],
                'total_subordinates': 0,
            }
            
            # Get reporting manager
            if profile.reporting_manager:
                hierarchy['manager'] = {
                    'id': profile.reporting_manager.id,
                    'display_name': profile.reporting_manager.display_name,
                    'email': profile.reporting_manager.user.email,
                    'role': profile.reporting_manager.role,
                }
            
            # Get subordinates
            subordinates = InternalProfile.objects.filter(
                reporting_manager=profile
            ).select_related('user')
            
            hierarchy['subordinates'] = [
                {
                    'id': sub.id,
                    'display_name': sub.display_name,
                    'email': sub.user.email,
                    'role': sub.role,
                    'department': sub.department,
                }
                for sub in subordinates
            ]
            
            hierarchy['total_subordinates'] = subordinates.count()
            
            return hierarchy
            
        except Exception as e:
            logger.error(f"Failed to get profile hierarchy: {e}")
            return {'manager': None, 'subordinates': [], 'total_subordinates': 0}
    
    def get_profile_analytics(self, profile: InternalProfile) -> Dict[str, Any]:
        """
        Get profile analytics and activity summary
        
        Args:
            profile: InternalProfile instance
            
        Returns:
            Dict: Profile analytics data
        """
        try:
            analytics = {
                'profile_completion': self._calculate_profile_completion(profile),
                'last_login': profile.last_login,
                'account_age_days': (timezone.now() - profile.created_at).days,
                'role_duration_days': (timezone.now() - profile.created_at).days,  # Simplified
                'department_tenure': self._calculate_department_tenure(profile),
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get profile analytics: {e}")
            return {}
    
    def _validate_profile_data(self, data: Dict[str, Any]) -> None:
        """
        Validate profile data
        
        Args:
            data: Profile data to validate
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Validate role
        valid_roles = ['super_admin', 'operations_manager', 'support_staff']
        if 'role' in data and data['role'] and data['role'] not in valid_roles:
            errors['role'] = 'Invalid role selected'
        
        # Validate access level
        valid_access_levels = ['read_only', 'standard', 'admin']
        if 'access_level' in data and data['access_level'] and data['access_level'] not in valid_access_levels:
            errors['access_level'] = 'Invalid access level selected'
        
        # Validate phone number format
        if 'phone_number' in data and data['phone_number']:
            phone = data['phone_number'].strip()
            if len(phone) < 10 or len(phone) > 20:
                errors['phone_number'] = 'Phone number must be between 10 and 20 characters'
        
        # Validate employee ID
        if 'employee_id' in data and data['employee_id']:
            if len(data['employee_id']) > 50:
                errors['employee_id'] = 'Employee ID cannot exceed 50 characters'
        
        if errors:
            raise ValidationError(f"Validation failed: {errors}")
    
    def _calculate_profile_completion(self, profile: InternalProfile) -> int:
        """Calculate profile completion percentage"""
        fields = [
            'display_name', 'phone_number', 'employee_id', 
            'role', 'access_level', 'department'
        ]
        
        completed = sum(1 for field in fields if getattr(profile, field))
        return int((completed / len(fields)) * 100)
    
    def _calculate_department_tenure(self, profile: InternalProfile) -> int:
        """Calculate tenure in current department (simplified)"""
        # In a real implementation, this would track department change history
        return (timezone.now() - profile.created_at).days
    
    def update_profile_photo(self, user: User, photo_file) -> InternalProfile:
        """
        Update profile photo
        
        Args:
            user: User instance
            photo_file: Uploaded photo file
            
        Returns:
            InternalProfile: Updated profile instance
            
        Raises:
            InternalProfileNotFoundError: If profile doesn't exist
            ProfileUpdateError: If update fails
        """
        try:
            profile = self.get_profile_by_user(user)
            
            # Delete old photo if exists
            if profile.profile_photo:
                try:
                    profile.profile_photo.delete(save=False)
                except Exception as e:
                    logger.warning(f"Failed to delete old profile photo: {e}")
            
            # Set new photo
            profile.profile_photo = photo_file
            profile.updated_at = timezone.now()
            profile.save(update_fields=['profile_photo', 'updated_at'])
            
            logger.info(f"Profile photo updated for {user.email}")
            return profile
            
        except InternalProfileNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to update profile photo for {user.email}: {e}", exc_info=True)
            raise ProfileUpdateError(f"Failed to update profile photo: {str(e)}") 