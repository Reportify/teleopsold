# Standard library imports
import logging
from typing import Dict, Any
from datetime import timedelta

# Third-party imports
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

# Local imports
from apps.tenants.models import CircleVendorRelationship, TenantInvitation, TelecomCircle, Tenant, VendorCreatedClient
from apps.tenants.serializers import (
    CircleVendorRelationshipSerializer,
    CorporateOnboardingSerializer,
    TenantInvitationSerializer,
    TenantInvitationAcceptSerializer,
    TelecomCircleSerializer
)
from apps.tenants.services import TenantService, InvitationService, OnboardingService, EmailService
from apps.tenants.exceptions import (
    TeleopsException,
    InvalidInvitationTokenError,
    EmailDeliveryError,
    OnboardingError
)
from core.permissions.tenant_permissions import CrossTenantPermission

logger = logging.getLogger(__name__)


class CircleVendorRelationshipViewSet(viewsets.ModelViewSet):
    """ViewSet for managing circle-vendor relationships"""
    serializer_class = CircleVendorRelationshipSerializer
    permission_classes = [IsAuthenticated, CrossTenantPermission]

    def create(self, request, *args, **kwargs):
        """Create a new circle-vendor relationship with proper invitation flow"""
        from django.utils import timezone
        from datetime import timedelta
        
        tenant = getattr(request, 'tenant', None)
        user = request.user
        
        if not tenant:
            return Response(
                {"error": "Tenant context required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For Circle tenants, automatically set the circle_tenant
        if tenant.tenant_type == 'Circle':
            circle_tenant_id = str(tenant.id)
        # For Corporate tenants, they need to specify which circle
        elif tenant.tenant_type == 'Corporate':
            if 'circle_tenant' not in request.data:
                return Response(
                    {"error": "Circle tenant must be specified"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            circle_tenant_id = request.data['circle_tenant']
        else:
            return Response(
                {"error": "Only Circle and Corporate tenants can invite vendors"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Extract invitation data
        vendor_name = request.data.get('vendor_name', '')
        vendor_email = request.data.get('vendor_email', '')
        contact_person_name = request.data.get('contact_person_name', '')
        vendor_code = request.data.get('vendor_code', '')
        invitation_expires_at = request.data.get('invitation_expires_at')
        
        # Validate required fields
        if not vendor_email:
            return Response(
                {"error": "Vendor email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not vendor_name:
            return Response(
                {"error": "Vendor name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse expiry date
        if invitation_expires_at:
            expires_at = parse_datetime(invitation_expires_at)
            if not expires_at:
                return Response(
                    {"error": "Invalid expiry date format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            expires_at = timezone.now() + timedelta(days=7)  # Default 7 days
        
        try:
            # 1. Create TenantInvitation record
            invitation = TenantInvitation.objects.create(
                email=vendor_email,
                contact_name=contact_person_name or vendor_name,
                organization_name=vendor_name,
                tenant_type='Vendor',
                invited_by=user,
                expires_at=expires_at,
                notes=f"Vendor invitation from circle {tenant.organization_name}"
            )
            
            # 2. Create CircleVendorRelationship (minimal data)
            relationship = CircleVendorRelationship.objects.create(
                circle_tenant_id=circle_tenant_id,
                vendor_code=vendor_code,
                contact_person_name=contact_person_name,
                relationship_status='Circle_Invitation_Sent',
                vendor_verification_status='Independent',
                relationship_type='Circle_Vendor',
                communication_allowed=True,
                is_active=False,  # Only becomes active after vendor completes onboarding
                vendor_permissions={},
                notes=f"Created via invitation {invitation.invitation_token}"
            )
            
            # 3. Send invitation email (you can implement this later)
            # invitation_service.send_vendor_invitation(invitation)
            
            # 4. Return the relationship data with invitation info
            serializer = self.get_serializer(relationship)
            response_data = serializer.data
            response_data['invitation'] = {
                'id': str(invitation.id),
                'token': invitation.invitation_token,
                'expires_at': invitation.expires_at.isoformat(),
                'status': invitation.status
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Failed to create vendor invitation: {e}")
            return Response(
                {"error": "Failed to create vendor invitation"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        """Filter queryset based on user's tenant context"""
        user = self.request.user
        tenant = getattr(self.request, 'tenant', None)
        
        if not tenant:
            return CircleVendorRelationship.objects.none()

        # Corporate: see all relationships for their circles
        if tenant.tenant_type == 'Corporate':
            circle_ids = tenant.child_tenants.filter(tenant_type='Circle').values_list('id', flat=True)
            return CircleVendorRelationship.objects.filter(circle_tenant_id__in=circle_ids)
        
        # Circle: see all relationships for their circle
        elif tenant.tenant_type == 'Circle':
            return CircleVendorRelationship.objects.filter(circle_tenant=tenant)
        
        # Vendor: see all relationships for their vendor tenant
        elif tenant.tenant_type == 'Vendor':
            return CircleVendorRelationship.objects.filter(vendor_tenant=tenant)
        
        # Superuser fallback
        elif user.is_superuser:
            return CircleVendorRelationship.objects.all()
        
        return CircleVendorRelationship.objects.none()


class CorporateOnboardingView(APIView):
    """Public API for corporate onboarding (registration)"""
    authentication_classes = []
    permission_classes = []

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantService()

    def post(self, request):
        """Handle corporate onboarding"""
        try:
            serializer = CorporateOnboardingSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Create corporate and circles using service
            corporate, circles = serializer.save()

            return Response({
                "corporate_tenant_id": str(corporate.id),
                "circle_tenants": [{"id": str(c.id), "name": c.organization_name} for c in circles],
                "message": "Corporate and circles registered. Awaiting approval."
            }, status=status.HTTP_201_CREATED)

        except TeleopsException as e:
            logger.error(f"Corporate onboarding failed: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error in corporate onboarding: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantInvitationView(APIView):
    """API for creating and listing tenant invitations"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def get(self, request):
        """List all invitations"""
        try:
            invitations = TenantInvitation.objects.all().order_by('-invited_at')
            serializer = TenantInvitationSerializer(invitations, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Failed to list invitations: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve invitations"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Create a new tenant invitation"""
        try:
            serializer = TenantInvitationSerializer(data=request.data, context={'request': request})
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Create invitation using service
            invitation = self.invitation_service.create_invitation(
                invitation_data=serializer.validated_data,
                invited_by=request.user
            )

            return Response({
                'message': f'Invitation sent to {invitation.email}',
                'invitation_id': str(invitation.id),
                'expires_at': invitation.expires_at
            }, status=status.HTTP_201_CREATED)

        except EmailDeliveryError as e:
            logger.error(f"Email delivery failed: {e}")
            return Response(
                {"error": "Failed to send invitation email"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except TeleopsException as e:
            logger.error(f"Invitation creation failed: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error creating invitation: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantInvitationAcceptView(APIView):
    """API for accepting tenant invitations"""
    authentication_classes = []
    permission_classes = []

    def __init__(self):
        super().__init__()
        self.onboarding_service = OnboardingService()

    def post(self, request):
        """Accept invitation and create tenant"""
        try:
            serializer = TenantInvitationAcceptSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Complete onboarding using service
            result = self.onboarding_service.complete_onboarding(
                invitation_token=serializer.validated_data['invitation_token'],
                onboarding_data=serializer.validated_data
            )

            return Response({
                'message': result['message'],
                'user_id': result['user_id'],
                'email': result['email'],
                'verification_sent': result['verification_sent']
            }, status=status.HTTP_201_CREATED)

        except OnboardingError as e:
            logger.error(f"Onboarding failed: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except InvalidInvitationTokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error in onboarding: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantInvitationResendView(APIView):
    """API for resending tenant invitations"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def post(self, request, pk):
        """Resend invitation"""
        try:
            # Parse expires_at if provided
            expires_at = request.data.get('expires_at')
            if expires_at:
                expires_at = parse_datetime(expires_at)
                if expires_at is None:
                    return Response(
                        {'error': 'Invalid expires_at format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Resend invitation using service
            invitation = self.invitation_service.resend_invitation(pk, expires_at)

            return Response({
                'message': f'Invitation resent to {invitation.email}',
                'expires_at': invitation.expires_at
            })

        except InvalidInvitationTokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except EmailDeliveryError as e:
            logger.error(f"Email delivery failed: {e}")
            return Response(
                {"error": "Failed to send invitation email"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Failed to resend invitation: {e}", exc_info=True)
            return Response(
                {"error": "Failed to resend invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantInvitationCancelView(APIView):
    """API for cancelling tenant invitations"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def post(self, request, pk):
        """Cancel invitation"""
        try:
            self.invitation_service.cancel_invitation(pk)
            return Response({'message': 'Invitation cancelled successfully'})

        except InvalidInvitationTokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to cancel invitation: {e}", exc_info=True)
            return Response(
                {"error": "Failed to cancel invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Public API endpoints

@api_view(["GET"])
@permission_classes([])
def onboarding_status(request, invitation_id):
    """Public endpoint to get onboarding status by invitation_id"""
    try:
        onboarding_service = OnboardingService()
        status_data = onboarding_service.get_onboarding_status(invitation_id)
        return Response(status_data)
    except InvalidInvitationTokenError:
        return Response(
            {"error": "Invitation not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to get onboarding status: {e}", exc_info=True)
        return Response(
            {"error": "Failed to retrieve onboarding status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([])
def public_invitation_details(request, invitation_token):
    """Public endpoint to get invitation details by token"""
    try:
        onboarding_service = OnboardingService()
        invitation_data = onboarding_service.get_invitation_details(invitation_token)
        return Response(invitation_data)
    except InvalidInvitationTokenError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Failed to get invitation details: {e}", exc_info=True)
        return Response(
            {"error": "Failed to retrieve invitation details"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def list_telecom_circles(request):
    """Return all telecom circles for use in dropdowns"""
    try:
        circles = TelecomCircle.objects.filter(is_active=True).order_by('circle_name')
        serializer = TelecomCircleSerializer(circles, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Failed to list telecom circles: {e}", exc_info=True)
        return Response(
            {"error": "Failed to retrieve circles"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class CorporateCircleManagementView(APIView):
    """Circle management for corporate tenants"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get circles associated with corporate tenant"""
        try:
            # Get current tenant from request
            tenant = getattr(request, 'tenant', None)
            
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Only allow corporate tenants
            if tenant.tenant_type != 'Corporate':
                return Response(
                    {"error": "Only corporate tenants can access circle management"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get child circle tenants (including inactive ones)
            circle_tenants = Tenant.objects.filter(
                parent_tenant=tenant,
                tenant_type='Circle'
            ).select_related('circle')

            circles_data = []
            total_revenue = 0
            total_projects = 0
            efficiency_score = 0

            for circle_tenant in circle_tenants:
                # Mock metrics for now - replace with real calculations
                circle_data = {
                    'id': str(circle_tenant.id),
                    'name': circle_tenant.organization_name,
                    'circle_code': circle_tenant.circle_code,
                    'email': circle_tenant.primary_contact_email,
                    'phone': circle_tenant.primary_contact_phone,
                    'primary_contact': circle_tenant.primary_contact_name,
                    'status': 'Active' if circle_tenant.is_active else 'Inactive',
                    'revenue': 0,  # Replace with actual revenue calculation
                    'projects': 0,  # Replace with actual project count
                    'sites': 0,    # Replace with actual site count
                    'efficiency': 85  # Replace with actual efficiency calculation
                }
                circles_data.append(circle_data)

            # Calculate corporate metrics
            corporate_metrics = {
                'total_revenue': total_revenue,
                'total_projects': total_projects,
                'efficiency_score': efficiency_score if circle_tenants.count() > 0 else 0
            }

            return Response({
                'circles': circles_data,
                'corporate_metrics': corporate_metrics
            })

        except Exception as e:
            logger.error(f"Error in CorporateCircleManagementView.get: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve circle data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CorporateCircleInvitationView(APIView):
    """Circle invitation management for corporate tenants"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get pending circle invitations for this corporate tenant"""
        try:
            # Get current tenant from request
            tenant = getattr(request, 'tenant', None)
            
            if not tenant:
                return Response(
                    {"error": "Tenant context not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Only allow corporate tenants
            if tenant.tenant_type != 'Corporate':
                return Response(
                    {"error": "Only corporate tenants can access circle invitations"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get pending circle invitations for this corporate tenant
            # Filter by invited_by user and check notes for circle invitations
            pending_invitations = TenantInvitation.objects.filter(
                invited_by=request.user,
                status='Pending',
                tenant_type='Circle'
            ).order_by('-invited_at')

            invitations_data = []
            for invitation in pending_invitations:
                # Extract circle data from notes if available
                circle_data = {}
                if invitation.notes and 'Circle Data:' in invitation.notes:
                    try:
                        import json
                        circle_data_str = invitation.notes.split('Circle Data: ')[1]
                        circle_data = json.loads(circle_data_str)
                    except (IndexError, json.JSONDecodeError):
                        pass

                invitation_data = {
                    'id': str(invitation.id),
                    'email': invitation.email,
                    'contact_name': invitation.contact_name,
                    'organization_name': invitation.organization_name,
                    'contact_phone': invitation.contact_phone,
                    'status': invitation.status,
                    'invited_at': invitation.invited_at.isoformat() if invitation.invited_at else None,
                    'expires_at': invitation.expires_at.isoformat() if invitation.expires_at else None,
                    'invitation_token': invitation.invitation_token,
                    'circle_code': circle_data.get('circle_code'),
                    'circle_id': circle_data.get('circle_id'),
                    'invitation_type': circle_data.get('invitation_type'),
                }
                invitations_data.append(invitation_data)

            return Response({
                'invitations': invitations_data,
                'total_count': len(invitations_data)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching pending invitations: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve pending invitations"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Send invitation to create a new circle under this corporate tenant"""
        try:
            # Debug logging
            logger.info(f"🔍 Corporate circle invitation request received")
            logger.info(f"User: {request.user}")
            logger.info(f"Headers: {dict(request.headers)}")
            logger.info(f"Data: {request.data}")
            
            # Get current tenant from request
            tenant = getattr(request, 'tenant', None)
            logger.info(f"Tenant from request: {tenant}")
            
            if not tenant:
                # Enhanced error response with debugging info
                error_details = {
                    "error": "Tenant context not found",
                    "debug_info": {
                        "user": str(request.user),
                        "has_tenant_attr": hasattr(request, 'tenant'),
                        "tenant_error": getattr(request, 'tenant_error', None),
                        "x_tenant_id_header": request.headers.get('X-Tenant-ID'),
                    }
                }
                logger.error(f"No tenant context: {error_details}")
                return Response(error_details, status=status.HTTP_400_BAD_REQUEST)

            # Only allow corporate tenants
            if tenant.tenant_type != 'Corporate':
                return Response(
                    {"error": "Only corporate tenants can send circle invitations"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate required fields
            required_fields = ['selected_circle_id', 'primary_contact_name', 'contact_email', 'contact_phone', 'expiry_date']
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {"error": f"Missing required field: {field}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Get selected telecom circle
            try:
                selected_circle = TelecomCircle.objects.get(id=request.data['selected_circle_id'])
            except TelecomCircle.DoesNotExist:
                return Response(
                    {"error": "Selected circle not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse expiry date
            try:
                from django.utils.dateparse import parse_date
                expiry_date = parse_date(request.data['expiry_date'])
                if not expiry_date:
                    return Response(
                        {"error": "Invalid expiry date format"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception:
                return Response(
                    {"error": "Invalid expiry date"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create invitation data in correct format for InvitationService
            invitation_data = {
                'email': request.data['contact_email'],
                'contact_name': request.data['primary_contact_name'],
                'tenant_type': 'Circle',
                'organization_name': f"{tenant.organization_name} ({selected_circle.circle_code})",
                'contact_phone': request.data['contact_phone'],
                'notes': f"Circle invitation for {selected_circle.circle_name} ({selected_circle.circle_code}) from corporate tenant {tenant.organization_name}",
                'expires_at': expiry_date
            }

            # Use invitation service to create and send invitation
            invitation_service = InvitationService()
            invitation = invitation_service.create_invitation(
                invitation_data=invitation_data,
                invited_by=request.user
            )
            
            # Store additional circle-specific data in the notes field (JSON format)
            # This helps with circle tenant creation later
            import json
            circle_data = {
                'circle_code': selected_circle.circle_code,
                'circle_id': selected_circle.id,  # Store as integer, not string
                'parent_tenant_id': str(tenant.id),
                'parent_subdomain': tenant.subdomain,
                'invitation_type': 'circle_creation'
            }
            
            # Combine existing notes with circle data
            existing_notes = invitation.notes
            updated_notes = f"{existing_notes}\n\nCircle Data: {json.dumps(circle_data)}" if existing_notes else f"Circle Data: {json.dumps(circle_data)}"
            invitation.notes = updated_notes
            invitation.save()

            return Response({
                'message': 'Circle invitation sent successfully',
                'invitation_id': str(invitation.id),
                'circle_name': selected_circle.circle_name,
                'circle_code': selected_circle.circle_code,
                'expires_at': invitation.expires_at.isoformat() if invitation.expires_at else None
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error in CorporateCircleInvitationView.post: {e}", exc_info=True)
            return Response(
                {"error": "Failed to send circle invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DualModeVendorViewSet(viewsets.ViewSet):
    """
    ViewSet for dual-mode vendor operations.
    
    Provides APIs for:
    1. Client portfolio management (associated + independent clients)
    2. Independent client CRUD operations
    3. Client name validation
    4. Billing and analytics
    """
    
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .services import DualModeVendorService
        self.dual_mode_service = DualModeVendorService()

    def _get_vendor_tenant_id(self):
        """Extract vendor tenant ID from request"""
        # Get from URL parameter or request context
        vendor_id = self.kwargs.get('vendor_id') or getattr(self.request, 'tenant_id', None)
        if not vendor_id:
            raise TeleopsException("Vendor tenant ID is required")
        return str(vendor_id)

    def _check_vendor_permission(self, vendor_tenant_id):
        """Check if user has permission to access vendor data"""
        user = self.request.user
        tenant = getattr(self.request, 'tenant', None)
        
        # Allow superuser access
        if user.is_superuser:
            return True
            
        # Check if user belongs to the vendor tenant
        if tenant and str(tenant.id) == vendor_tenant_id and tenant.tenant_type == 'Vendor':
            return True
            
        raise TeleopsException("Access denied: insufficient permissions")

    def list(self, request, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/
        Get complete client portfolio (associated + independent clients)
        """
        try:
            vendor_tenant_id = self._get_vendor_tenant_id()
            self._check_vendor_permission(vendor_tenant_id)
            
            portfolio = self.dual_mode_service.get_vendor_client_portfolio(vendor_tenant_id)
            
            from .serializers import VendorClientPortfolioSerializer
            serializer = VendorClientPortfolioSerializer(portfolio)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get vendor client portfolio: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve client portfolio"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def associated(self, request, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/associated/
        Get only associated clients (from vendor_relationships)
        """
        try:
            vendor_tenant_id = self._get_vendor_tenant_id()
            self._check_vendor_permission(vendor_tenant_id)
            
            clients = self.dual_mode_service.get_associated_clients_only(vendor_tenant_id)
            
            from .serializers import AssociatedClientSerializer
            serializer = AssociatedClientSerializer(clients, many=True)
            
            return Response({
                'clients': serializer.data,
                'count': len(clients),
                'client_type': 'associated'
            }, status=status.HTTP_200_OK)
            
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get associated clients: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve associated clients"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get', 'post'])
    def independent(self, request, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/independent/
        Get only independent clients (from vendor_created_clients)
        
        POST /api/vendors/{vendor_id}/clients/independent/
        Create new independent client
        """
        vendor_tenant_id = self._get_vendor_tenant_id()
        self._check_vendor_permission(vendor_tenant_id)
        
        if request.method == 'GET':
            return self._get_independent_clients(vendor_tenant_id)
        elif request.method == 'POST':
            return self._create_independent_client(vendor_tenant_id, request.data)

    def _get_independent_clients(self, vendor_tenant_id):
        """Get independent clients"""
        try:
            clients = self.dual_mode_service.get_independent_clients_only(vendor_tenant_id)
            
            from .serializers import IndependentClientSerializer
            serializer = IndependentClientSerializer(clients, many=True)
            
            return Response({
                'clients': serializer.data,
                'count': len(clients),
                'client_type': 'independent'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to get independent clients: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve independent clients"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _create_independent_client(self, vendor_tenant_id, data):
        """Create independent client"""
        try:
            from .serializers import VendorCreatedClientSerializer
            
            # Add vendor tenant ID to context for validation
            serializer = VendorCreatedClientSerializer(
                data=data, 
                context={'vendor_tenant_id': vendor_tenant_id}
            )
            
            if serializer.is_valid():
                # Create client using service
                client = self.dual_mode_service.create_independent_client(
                    vendor_tenant_id, 
                    serializer.validated_data
                )
                
                # Return created client data
                response_serializer = VendorCreatedClientSerializer(client)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to create independent client: {e}", exc_info=True)
            return Response(
                {"error": "Failed to create independent client"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get', 'put', 'delete'])
    def independent_detail(self, request, pk=None, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/independent/{client_id}/
        PUT /api/vendors/{vendor_id}/clients/independent/{client_id}/
        DELETE /api/vendors/{vendor_id}/clients/independent/{client_id}/
        """
        vendor_tenant_id = self._get_vendor_tenant_id()
        self._check_vendor_permission(vendor_tenant_id)
        
        if request.method == 'GET':
            return self._get_independent_client_detail(vendor_tenant_id, pk)
        elif request.method == 'PUT':
            return self._update_independent_client(vendor_tenant_id, pk, request.data)
        elif request.method == 'DELETE':
            return self._delete_independent_client(vendor_tenant_id, pk)

    def _get_independent_client_detail(self, vendor_tenant_id, client_id):
        """Get independent client detail"""
        try:
            from .serializers import VendorCreatedClientSerializer
            
            client = VendorCreatedClient.objects.get(
                id=client_id,
                vendor_tenant_id=vendor_tenant_id,
                relationship_status='Active'
            )
            
            serializer = VendorCreatedClientSerializer(client)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except VendorCreatedClient.DoesNotExist:
            return Response(
                {"error": "Independent client not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to get independent client detail: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve client details"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _update_independent_client(self, vendor_tenant_id, client_id, data):
        """Update independent client"""
        try:
            client = self.dual_mode_service.update_independent_client(
                vendor_tenant_id, client_id, data
            )
            
            from .serializers import VendorCreatedClientSerializer
            serializer = VendorCreatedClientSerializer(client)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to update independent client: {e}", exc_info=True)
            return Response(
                {"error": "Failed to update client"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _delete_independent_client(self, vendor_tenant_id, client_id):
        """Delete independent client"""
        try:
            success = self.dual_mode_service.delete_independent_client(
                vendor_tenant_id, client_id
            )
            
            if success:
                return Response(
                    {"message": "Client deleted successfully"}, 
                    status=status.HTTP_204_NO_CONTENT
                )
            else:
                return Response(
                    {"error": "Failed to delete client"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to delete independent client: {e}", exc_info=True)
            return Response(
                {"error": "Failed to delete client"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def validate_name(self, request, *args, **kwargs):
        """
        POST /api/vendors/{vendor_id}/clients/validate-name/
        Validate client name against business rules
        """
        try:
            vendor_tenant_id = self._get_vendor_tenant_id()
            self._check_vendor_permission(vendor_tenant_id)
            
            from .serializers import ClientNameValidationSerializer, ClientNameValidationResponseSerializer
            
            serializer = ClientNameValidationSerializer(data=request.data)
            if serializer.is_valid():
                client_name = serializer.validated_data['client_name']
                
                validation_result = self.dual_mode_service.validate_client_name_rules(
                    vendor_tenant_id, client_name
                )
                
                response_serializer = ClientNameValidationResponseSerializer(validation_result)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to validate client name: {e}", exc_info=True)
            return Response(
                {"error": "Failed to validate client name"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def billing_summary(self, request, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/billing-summary/
        Get billing summary for vendor's dual-mode operations
        """
        try:
            vendor_tenant_id = self._get_vendor_tenant_id()
            self._check_vendor_permission(vendor_tenant_id)
            
            months = int(request.query_params.get('months', 6))
            billing_summary = self.dual_mode_service.get_vendor_billing_summary(
                vendor_tenant_id, months
            )
            
            from .serializers import VendorBillingSummarySerializer
            serializer = VendorBillingSummarySerializer(billing_summary)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get billing summary: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve billing summary"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def conversion_analytics(self, request, *args, **kwargs):
        """
        GET /api/vendors/{vendor_id}/clients/conversion-analytics/
        Get conversion analytics for vendor's client portfolio
        """
        try:
            vendor_tenant_id = self._get_vendor_tenant_id()
            self._check_vendor_permission(vendor_tenant_id)
            
            analytics = self.dual_mode_service.calculate_conversion_analytics(vendor_tenant_id)
            
            from .serializers import ConversionAnalyticsSerializer
            serializer = ConversionAnalyticsSerializer(analytics)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except TeleopsException as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to get conversion analytics: {e}", exc_info=True)
            return Response(
                {"error": "Failed to retrieve conversion analytics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantInvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant invitations
    """
    queryset = TenantInvitation.objects.all()
    serializer_class = TenantInvitationSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """
        Resend an invitation with updated expiry
        """
        try:
            invitation = self.get_object()
            
            # Check if invitation can be resent
            if invitation.status not in ['Pending', 'Expired']:
                return Response(
                    {"error": "Only pending or expired invitations can be resent"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update expiry date
            expires_at = request.data.get('expires_at')
            if expires_at:
                from django.utils.dateparse import parse_datetime
                expires_at = parse_datetime(expires_at)
                if not expires_at or expires_at <= timezone.now():
                    return Response(
                        {"error": "Invalid or past expiry date"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                invitation.expires_at = expires_at
            else:
                # Default to 7 days from now
                invitation.expires_at = timezone.now() + timedelta(days=7)
            
            # Reset status to pending
            invitation.status = 'Pending'
            invitation.save()
            
            # TODO: Send invitation email here
            # invitation_service.send_invitation_email(invitation)
            
            return Response({
                "message": f"Invitation resent to {invitation.email}",
                "expires_at": invitation.expires_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Failed to resend invitation: {e}")
            return Response(
                {"error": "Failed to resend invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an invitation
        """
        try:
            invitation = self.get_object()
            
            # Check if invitation can be cancelled
            if invitation.status not in ['Pending', 'Accepted']:
                return Response(
                    {"error": "Only pending or accepted invitations can be cancelled"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            invitation.status = 'Cancelled'
            invitation.save()
            
            return Response({
                "message": f"Invitation cancelled for {invitation.email}"
            })
            
        except Exception as e:
            logger.error(f"Failed to cancel invitation: {e}")
            return Response(
                {"error": "Failed to cancel invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete an invitation (only cancelled or expired)
        """
        try:
            invitation = self.get_object()
            
            # Check if invitation can be deleted
            if invitation.status not in ['Cancelled', 'Expired']:
                return Response(
                    {"error": "Only cancelled or expired invitations can be deleted"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            invitation.delete()
            
            return Response({
                "message": "Invitation deleted successfully"
            }, status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Failed to delete invitation: {e}")
            return Response(
                {"error": "Failed to delete invitation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 