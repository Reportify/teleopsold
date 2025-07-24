"""
Dual-Mode Vendor Operations Service

This service handles the core business logic for dual-mode vendor operations,
including:
1. Vendor client portfolio management (associated + independent clients)
2. Client name validation with exact matching rules
3. Independent client creation and management
4. Billing and profitability analysis
5. Conversion tracking and analytics
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from django.db import transaction
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from django.core.exceptions import ValidationError

from ..models import (
    Tenant, 
    VendorRelationship, 
    VendorCreatedClient, 
    VendorClientBilling
)
from ..exceptions import TenantValidationError

logger = logging.getLogger(__name__)


class DualModeVendorService:
    """Service for managing dual-mode vendor operations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_vendor_client_portfolio(self, vendor_tenant_id: str) -> Dict[str, Any]:
        """
        Get complete client portfolio for vendor with categorized sections.
        
        Returns:
        {
            'associated_clients': [...],     # From vendor_relationships (read-only)
            'independent_clients': [...],    # From vendor_created_clients (full CRUD)
            'portfolio_summary': {...},
            'client_categorization': '📌 Associated | ➕ Independent'
        }
        """
        try:
            vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
            
            # Get associated clients from vendor relationships
            associated_clients = self._get_associated_clients(vendor_tenant)
            
            # Get independent clients created by vendor
            independent_clients = self._get_independent_clients(vendor_tenant)
            
            # Calculate portfolio summary
            portfolio_summary = self._calculate_portfolio_summary(
                associated_clients, independent_clients
            )
            
            return {
                'associated_clients': associated_clients,
                'independent_clients': independent_clients,
                'portfolio_summary': portfolio_summary,
                'client_categorization': '📌 Associated | ➕ Independent',
                'vendor_info': {
                    'id': str(vendor_tenant.id),
                    'name': vendor_tenant.organization_name,
                    'tenant_type': vendor_tenant.tenant_type
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get vendor client portfolio: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to retrieve client portfolio: {str(e)}")

    def get_associated_clients_only(self, vendor_tenant_id: str) -> List[Dict[str, Any]]:
        """Get only associated clients (from vendor_relationships)"""
        vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
        return self._get_associated_clients(vendor_tenant)

    def get_independent_clients_only(self, vendor_tenant_id: str) -> List[Dict[str, Any]]:
        """Get only independent clients (from vendor_created_clients)"""
        vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
        return self._get_independent_clients(vendor_tenant)

    def create_independent_client(
        self, 
        vendor_tenant_id: str, 
        client_data: Dict[str, Any]
    ) -> VendorCreatedClient:
        """
        Create independent client with business validation.
        
        Business Rules:
        - Exact name matching prevents duplication of associated clients
        - Same corporate family but different circles allowed
        - Vendor can only create clients if they're a Vendor tenant
        """
        try:
            with transaction.atomic():
                vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
                
                # Validate client name against business rules
                client_name = client_data.get('client_name', '').strip()
                self.validate_client_name_rules(vendor_tenant_id, client_name)
                
                # Create vendor-created client
                client = VendorCreatedClient.objects.create(
                    vendor_tenant=vendor_tenant,
                    client_name=client_name,
                    client_code=client_data.get('client_code', ''),
                    client_type=client_data.get('client_type', 'Non_Integrated'),
                    primary_contact_name=client_data.get('primary_contact_name', ''),
                    primary_contact_email=client_data.get('primary_contact_email', ''),
                    primary_contact_phone=client_data.get('primary_contact_phone', ''),
                    headquarters_address=client_data.get('headquarters_address', ''),
                    business_sectors=client_data.get('business_sectors', []),
                    platform_interest_level=client_data.get('platform_interest_level', 'Unknown'),
                    monthly_activity_level=client_data.get('monthly_activity_level', 'Low'),
                    total_sites=client_data.get('total_sites', 0),
                    internal_notes=client_data.get('internal_notes', ''),
                    tags=client_data.get('tags', []),
                )
                
                # Initialize billing record for the current month
                self._initialize_client_billing(client)
                
                self.logger.info(
                    f"Independent client created: {client_name} by vendor {vendor_tenant.organization_name}"
                )
                
                return client
                
        except Exception as e:
            self.logger.error(f"Failed to create independent client: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to create independent client: {str(e)}")

    def update_independent_client(
        self, 
        vendor_tenant_id: str, 
        client_id: str, 
        client_data: Dict[str, Any]
    ) -> VendorCreatedClient:
        """Update independent client with validation"""
        try:
            with transaction.atomic():
                vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
                
                # Get client and verify ownership
                client = VendorCreatedClient.objects.get(
                    id=client_id,
                    vendor_tenant=vendor_tenant
                )
                
                # If client name is being changed, validate new name
                if 'client_name' in client_data:
                    new_name = client_data['client_name'].strip()
                    if new_name != client.client_name:
                        self.validate_client_name_rules(vendor_tenant_id, new_name)
                
                # Update allowed fields
                updatable_fields = [
                    'client_name', 'client_code', 'client_type', 'primary_contact_name',
                    'primary_contact_email', 'primary_contact_phone', 'secondary_contact_name',
                    'secondary_contact_email', 'secondary_contact_phone', 'headquarters_address',
                    'business_sectors', 'company_size', 'branding_logo', 'primary_color',
                    'secondary_color', 'platform_interest_level', 'conversion_status',
                    'conversion_probability', 'platform_demo_date', 'conversion_notes',
                    'total_sites', 'active_projects', 'monthly_activity_level',
                    'payment_terms', 'contract_end_date', 'internal_notes', 'tags',
                    'platform_onboarding_interest', 'estimated_platform_value'
                ]
                
                for field in updatable_fields:
                    if field in client_data:
                        setattr(client, field, client_data[field])
                
                client.save()
                
                self.logger.info(f"Independent client updated: {client.client_name}")
                return client
                
        except VendorCreatedClient.DoesNotExist:
            raise TenantValidationError("Independent client not found or access denied")
        except Exception as e:
            self.logger.error(f"Failed to update independent client: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to update independent client: {str(e)}")

    def delete_independent_client(self, vendor_tenant_id: str, client_id: str) -> bool:
        """Delete independent client (soft delete by setting status)"""
        try:
            with transaction.atomic():
                vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
                
                client = VendorCreatedClient.objects.get(
                    id=client_id,
                    vendor_tenant=vendor_tenant
                )
                
                # Soft delete by changing status
                client.relationship_status = 'Terminated'
                client.save()
                
                self.logger.info(f"Independent client deleted: {client.client_name}")
                return True
                
        except VendorCreatedClient.DoesNotExist:
            raise TenantValidationError("Independent client not found or access denied")
        except Exception as e:
            self.logger.error(f"Failed to delete independent client: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to delete independent client: {str(e)}")

    def validate_client_name_rules(self, vendor_tenant_id: str, client_name: str) -> Dict[str, Any]:
        """
        Validate client name against business rules.
        
        Business Rules:
        1. Exact name matching only (not fuzzy)
        2. Block exact matches with associated clients
        3. Allow same corporate family but different circles
        4. Case-insensitive matching
        
        Returns:
        {
            'is_valid': bool,
            'validation_result': str,
            'conflicting_client': dict or None,
            'suggestions': list
        }
        """
        try:
            vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
            client_name = client_name.strip()
            
            if not client_name:
                return {
                    'is_valid': False,
                    'validation_result': 'Client name cannot be empty',
                    'conflicting_client': None,
                    'suggestions': []
                }
            
            # Check exact name match against associated clients
            conflicting_relationship = VendorRelationship.objects.filter(
                vendor_tenant=vendor_tenant,
                client_tenant__organization_name__iexact=client_name,
                is_active=True
            ).select_related('client_tenant').first()
            
            if conflicting_relationship:
                return {
                    'is_valid': False,
                    'validation_result': 'EXACT_MATCH_BLOCKED',
                    'conflicting_client': {
                        'name': conflicting_relationship.client_tenant.organization_name,
                        'type': conflicting_relationship.client_tenant.tenant_type,
                        'circle_code': getattr(conflicting_relationship.client_tenant, 'circle_code', ''),
                        'relationship_type': conflicting_relationship.relationship_type,
                        'is_associated': True
                    },
                    'suggestions': self._generate_name_suggestions(client_name)
                }
            
            # Check against existing independent clients for this vendor
            existing_independent = VendorCreatedClient.objects.filter(
                vendor_tenant=vendor_tenant,
                client_name__iexact=client_name,
                relationship_status='Active'
            ).first()
            
            if existing_independent:
                return {
                    'is_valid': False,
                    'validation_result': 'DUPLICATE_INDEPENDENT_CLIENT',
                    'conflicting_client': {
                        'name': existing_independent.client_name,
                        'type': 'Independent',
                        'client_code': existing_independent.client_code,
                        'is_associated': False
                    },
                    'suggestions': []
                }
            
            # Valid name
            return {
                'is_valid': True,
                'validation_result': 'VALID',
                'conflicting_client': None,
                'suggestions': []
            }
            
        except Exception as e:
            self.logger.error(f"Client name validation failed: {e}", exc_info=True)
            return {
                'is_valid': False,
                'validation_result': 'VALIDATION_ERROR',
                'conflicting_client': None,
                'suggestions': []
            }

    def get_vendor_billing_summary(
        self, 
        vendor_tenant_id: str, 
        months: int = 6
    ) -> Dict[str, Any]:
        """Get billing summary for vendor's dual-mode operations"""
        try:
            vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
            
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date.replace(day=1)
            for _ in range(months - 1):
                if start_date.month == 1:
                    start_date = start_date.replace(year=start_date.year - 1, month=12)
                else:
                    start_date = start_date.replace(month=start_date.month - 1)
            
            # Get billing records
            billing_records = VendorClientBilling.objects.filter(
                vendor_tenant=vendor_tenant,
                billing_month__gte=start_date,
                billing_month__lte=end_date
            ).select_related('vendor_created_client')
            
            # Calculate totals
            totals = billing_records.aggregate(
                total_platform_cost=Sum('total_platform_cost'),
                total_client_revenue=Sum('total_client_revenue'),
                total_gross_profit=Sum('gross_profit'),
                avg_profit_margin=Avg('profit_margin_percentage'),
                total_clients=Count('vendor_created_client', distinct=True)
            )
            
            # Monthly breakdown
            monthly_data = {}
            for record in billing_records:
                month_key = record.billing_month.strftime('%Y-%m')
                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'platform_cost': 0,
                        'client_revenue': 0,
                        'gross_profit': 0,
                        'client_count': 0
                    }
                
                monthly_data[month_key]['platform_cost'] += record.total_platform_cost
                monthly_data[month_key]['client_revenue'] += record.total_client_revenue
                monthly_data[month_key]['gross_profit'] += record.gross_profit
                monthly_data[month_key]['client_count'] += 1
            
            return {
                'summary_period': f"{start_date.strftime('%Y-%m')} to {end_date.strftime('%Y-%m')}",
                'totals': totals,
                'monthly_breakdown': monthly_data,
                'vendor_info': {
                    'id': str(vendor_tenant.id),
                    'name': vendor_tenant.organization_name
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get billing summary: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to retrieve billing summary: {str(e)}")

    def calculate_conversion_analytics(self, vendor_tenant_id: str) -> Dict[str, Any]:
        """Calculate conversion analytics for vendor's client portfolio"""
        try:
            vendor_tenant = self._get_vendor_tenant(vendor_tenant_id)
            
            # Get all independent clients
            clients = VendorCreatedClient.objects.filter(
                vendor_tenant=vendor_tenant,
                relationship_status='Active'
            )
            
            # Conversion funnel analysis
            funnel_stats = {
                'total_clients': clients.count(),
                'by_interest_level': {},
                'by_conversion_status': {},
                'high_value_clients': 0,
                'conversion_ready_clients': 0
            }
            
            for client in clients:
                # Interest level breakdown
                interest = client.platform_interest_level
                funnel_stats['by_interest_level'][interest] = funnel_stats['by_interest_level'].get(interest, 0) + 1
                
                # Conversion status breakdown
                status = client.conversion_status
                funnel_stats['by_conversion_status'][status] = funnel_stats['by_conversion_status'].get(status, 0) + 1
                
                # High-value client count
                if client.is_high_value_client:
                    funnel_stats['high_value_clients'] += 1
                
                # Conversion-ready clients (readiness score > 70)
                if client.conversion_readiness_score > 70:
                    funnel_stats['conversion_ready_clients'] += 1
            
            # Top conversion opportunities
            top_opportunities = clients.filter(
                conversion_readiness_score__gt=60
            ).order_by('-conversion_readiness_score')[:10]
            
            opportunities_data = []
            for client in top_opportunities:
                opportunities_data.append({
                    'id': str(client.id),
                    'name': client.client_name,
                    'readiness_score': client.conversion_readiness_score,
                    'interest_level': client.platform_interest_level,
                    'conversion_status': client.conversion_status,
                    'estimated_value': client.estimated_platform_value,
                    'is_high_value': client.is_high_value_client
                })
            
            return {
                'funnel_statistics': funnel_stats,
                'top_conversion_opportunities': opportunities_data,
                'conversion_metrics': {
                    'avg_readiness_score': sum(c.conversion_readiness_score for c in clients) / len(clients) if clients else 0,
                    'total_estimated_value': sum(c.estimated_platform_value or 0 for c in clients),
                    'high_value_percentage': (funnel_stats['high_value_clients'] / funnel_stats['total_clients'] * 100) if funnel_stats['total_clients'] > 0 else 0
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate conversion analytics: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to calculate conversion analytics: {str(e)}")

    # Private helper methods
    
    def _get_vendor_tenant(self, vendor_tenant_id: str) -> Tenant:
        """Get and validate vendor tenant"""
        try:
            tenant = Tenant.objects.get(id=vendor_tenant_id)
            if tenant.tenant_type != 'Vendor':
                raise TenantValidationError("Tenant must be of type 'Vendor'")
            return tenant
        except Tenant.DoesNotExist:
            raise TenantValidationError("Vendor tenant not found")

    def _get_associated_clients(self, vendor_tenant: Tenant) -> List[Dict[str, Any]]:
        """Get associated clients from vendor_relationships (read-only)"""
        relationships = VendorRelationship.objects.filter(
            vendor_tenant=vendor_tenant,
            is_active=True
        ).select_related('client_tenant').order_by('client_tenant__organization_name')
        
        associated_clients = []
        for relationship in relationships:
            client_tenant = relationship.client_tenant
            associated_clients.append({
                'id': str(client_tenant.id),
                'name': client_tenant.organization_name,
                'type': client_tenant.tenant_type,
                'circle_code': getattr(client_tenant, 'circle_code', ''),
                'relationship_type': relationship.relationship_type,
                'vendor_code': relationship.vendor_code,
                'is_associated': True,
                'is_read_only': True,
                'contract_start_date': relationship.contract_start_date,
                'contract_end_date': relationship.contract_end_date,
                'performance_rating': relationship.performance_rating,
                'created_at': relationship.created_at
            })
        
        return associated_clients

    def _get_independent_clients(self, vendor_tenant: Tenant) -> List[Dict[str, Any]]:
        """Get independent clients from vendor_created_clients (full CRUD)"""
        clients = VendorCreatedClient.objects.filter(
            vendor_tenant=vendor_tenant,
            relationship_status='Active'
        ).order_by('-created_at')
        
        independent_clients = []
        for client in clients:
            independent_clients.append({
                'id': str(client.id),
                'name': client.client_name,
                'client_code': client.client_code,
                'client_type': client.client_type,
                'primary_contact_name': client.primary_contact_name,
                'primary_contact_email': client.primary_contact_email,
                'total_sites': client.total_sites,
                'total_projects': client.total_projects,
                'monthly_activity_level': client.monthly_activity_level,
                'platform_interest_level': client.platform_interest_level,
                'conversion_status': client.conversion_status,
                'conversion_readiness_score': client.conversion_readiness_score,
                'total_revenue_generated': client.total_revenue_generated,
                'is_high_value_client': client.is_high_value_client,
                'is_associated': False,
                'is_read_only': False,
                'can_edit': True,
                'can_delete': True,
                'created_at': client.created_at,
                'last_activity_date': client.last_activity_date
            })
        
        return independent_clients

    def _calculate_portfolio_summary(
        self, 
        associated_clients: List[Dict], 
        independent_clients: List[Dict]
    ) -> Dict[str, Any]:
        """Calculate portfolio summary statistics"""
        return {
            'total_clients': len(associated_clients) + len(independent_clients),
            'associated_clients_count': len(associated_clients),
            'independent_clients_count': len(independent_clients),
            'client_distribution': {
                'associated_percentage': len(associated_clients) / (len(associated_clients) + len(independent_clients)) * 100 if (len(associated_clients) + len(independent_clients)) > 0 else 0,
                'independent_percentage': len(independent_clients) / (len(associated_clients) + len(independent_clients)) * 100 if (len(associated_clients) + len(independent_clients)) > 0 else 0
            },
            'independent_client_stats': {
                'total_sites': sum(client.get('total_sites', 0) for client in independent_clients),
                'total_projects': sum(client.get('total_projects', 0) for client in independent_clients),
                'total_revenue': sum(client.get('total_revenue_generated', 0) for client in independent_clients),
                'high_value_clients': sum(1 for client in independent_clients if client.get('is_high_value_client', False))
            }
        }

    def _initialize_client_billing(self, client: VendorCreatedClient) -> None:
        """Initialize billing record for new client"""
        from datetime import date
        
        current_month = date.today().replace(day=1)
        
        # Check if billing record already exists
        existing_billing = VendorClientBilling.objects.filter(
            vendor_tenant=client.vendor_tenant,
            vendor_created_client=client,
            billing_month=current_month
        ).first()
        
        if not existing_billing:
            # Calculate initial platform cost
            platform_cost = client.calculate_monthly_platform_cost()
            
            VendorClientBilling.objects.create(
                vendor_tenant=client.vendor_tenant,
                vendor_created_client=client,
                billing_month=current_month,
                billing_period_start=current_month,
                billing_period_end=current_month.replace(day=28),
                base_client_management_fee=platform_cost * 0.6,
                site_management_fee=client.total_sites * 500,
                data_storage_fee=1000,
                support_fee=500,
                sites_managed=client.total_sites
            )

    def _generate_name_suggestions(self, client_name: str) -> List[str]:
        """Generate alternative name suggestions when exact match is blocked"""
        suggestions = []
        base_name = client_name.strip()
        
        # Regional variations
        regions = ['North', 'South', 'East', 'West', 'Central']
        for region in regions:
            suggestions.append(f"{base_name} {region}")
        
        # Circle variations
        circles = ['Circle A', 'Circle B', 'Division 1', 'Division 2']
        for circle in circles:
            suggestions.append(f"{base_name} {circle}")
        
        # Year variations
        current_year = timezone.now().year
        suggestions.append(f"{base_name} {current_year}")
        suggestions.append(f"{base_name} FY{current_year}")
        
        return suggestions[:5]  # Return top 5 suggestions 