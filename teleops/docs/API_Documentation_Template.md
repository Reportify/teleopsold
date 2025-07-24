# Teleops Platform - Enhanced API Documentation

## Document Information

- **Version**: 2.0 - **MAJOR UPDATE: Domain-Driven APIs with VLT-Style Verification**
- **Last Updated**: December 2024
- **API Version**: v1_enhanced (parallel with existing v1)
- **Base URL**: `https://api.teleops.platform/v1_enhanced/`
- **Status**: Enhanced APIs with VLT-Style Verification Engine

---

## Overview

This document provides comprehensive API documentation for the **enhanced Teleops platform** featuring **domain-driven APIs** with **VLT-style verification capabilities**. The platform now includes **sophisticated field operations APIs** supporting GPS verification, equipment scanning, mobile workflows, and real-time synchronization.

### **🎯 Enhanced API Architecture**

- **✅ Domain-Driven Design** - APIs organized by business domains
- **✅ VLT-Style Verification** - GPS and equipment verification endpoints
- **✅ Mobile-Ready APIs** - Offline sync and mobile optimization
- **✅ Advanced RBAC** - Hierarchical permission-based access
- **✅ Real-Time Features** - WebSocket support for live updates
- **✅ Parallel Deployment** - Enhanced APIs alongside existing v1 APIs

---

## 🚀 **NEW: Domain-Driven API Structure**

### **API Organization by Business Domain**

```
/api/v1_enhanced/
├── tenant-management/          # Multi-tenant hierarchy APIs
│   ├── tenants/               # Tenant CRUD and management
│   ├── circles/               # Circle management and independence
│   ├── vendors/               # Vendor relationship management
│   └── invitations/           # Tenant invitation workflows
├── identity-access/            # Advanced RBAC APIs
│   ├── users/                 # User profile management
│   ├── designations/          # Hierarchical designation system
│   ├── permissions/           # Permission management
│   └── audit/                 # Permission audit trails
├── vendor-operations/          # Dual-mode vendor operations
│   ├── relationships/         # Multi-level vendor hierarchies
│   ├── clients/               # Independent client management
│   ├── billing/               # Billing and profitability analytics
│   └── performance/           # Performance tracking
├── project-management/         # Complete project lifecycle
│   ├── projects/              # Project management
│   ├── design/                # Project design phase
│   ├── inventory/             # Site-specific allocation
│   ├── tasks/                 # Task creation and execution
│   └── teams/                 # Team management
├── site-operations/            # 🎯 VLT-style site verification
│   ├── sites/                 # Enhanced site management
│   ├── boundaries/            # GPS boundaries and geofencing
│   ├── verification/          # VLT-style site verification
│   ├── access/                # Site access control
│   └── mobile-sync/           # Mobile synchronization
├── equipment-management/       # 🎯 Category→Model hierarchy
│   ├── categories/            # Tenant-created categories
│   ├── models/                # Equipment models and specs
│   ├── inventory/             # Equipment inventory
│   ├── items/                 # Individual equipment items
│   └── verification/          # Equipment verification workflows
└── field-operations/           # 🎯 VLT verification engine
    ├── tasks/                 # VLT-style field tasks
    ├── execution/             # Task execution tracking
    ├── gps-verification/      # GPS verification workflows
    ├── mobile-operations/     # Mobile field operations
    └── documentation/         # Photo and document verification
```

---

## 🎯 **VLT-Style Field Operations APIs**

### **1. Field Task Management**

**VLT-style field task creation and management:**

#### **Create VLT-Style Field Task**

```http
POST /api/v1_enhanced/field-operations/tasks/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "task_name": "VLT-Style Equipment Verification",
    "task_type": "Equipment_Verification",
    "site_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001",

    // VLT Requirements
    "vlt_requirements": {
        "gps_verification": true,
        "gps_accuracy_required": 10,
        "equipment_scan": true,
        "photo_verification": true,
        "minimum_photos": 5,
        "serial_verification": true
    },

    // Task Details
    "estimated_duration_hours": 4.5,
    "priority": "High",
    "skill_requirements": ["RF_Equipment", "GPS_Navigation", "Photography"],
    "safety_requirements": ["PPE_Required", "Height_Safety"],
    "tools_required": ["GPS_Device", "Scanner", "Camera"],

    // Assignment
    "assigned_team_id": "550e8400-e29b-41d4-a716-446655440002",
    "team_lead_id": 123,
    "scheduled_start": "2024-12-20T09:00:00Z",
    "scheduled_end": "2024-12-20T13:30:00Z",

    // Equipment Context
    "target_equipment_ids": [
        "550e8400-e29b-41d4-a716-446655440003",
        "550e8400-e29b-41d4-a716-446655440004"
    ],
    "equipment_category_ids": [
        "550e8400-e29b-41d4-a716-446655440005"
    ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440006",
    "task_code": "FT-TOW-20241220-001",
    "task_name": "VLT-Style Equipment Verification",
    "status": "Assigned",
    "verification_requirements": {
      "gps_verification": true,
      "gps_accuracy_required": 10,
      "equipment_scan": true,
      "photo_verification": true,
      "minimum_photos": 5,
      "serial_verification": true,
      "checklist": ["GPS location verification", "Equipment serial number scan", "Photo documentation (5 angles)", "Model verification", "Compliance check"]
    },
    "mobile_ready": true,
    "supports_offline": true,
    "created_at": "2024-12-19T15:30:00Z"
  }
}
```

#### **Get Field Task with VLT Requirements**

```http
GET /api/v1_enhanced/field-operations/tasks/{task_id}/
Authorization: Bearer {jwt_token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440006",
    "task_code": "FT-TOW-20241220-001",
    "task_info": {
      "name": "VLT-Style Equipment Verification",
      "type": "Equipment_Verification",
      "status": "In_Progress",
      "priority": "High",
      "completion_percentage": 35
    },
    "site_context": {
      "site_id": "550e8400-e29b-41d4-a716-446655440000",
      "site_name": "Mumbai Tower Site 001",
      "gps_coordinates": [19.076, 72.8777],
      "site_boundaries": {
        "type": "Circular",
        "center": [19.076, 72.8777],
        "radius_meters": 50,
        "tolerance_meters": 10
      }
    },
    "vlt_requirements": {
      "gps_verification": {
        "required": true,
        "accuracy_required": 10,
        "current_status": "Verified",
        "last_verified_at": "2024-12-20T09:15:00Z"
      },
      "equipment_verification": {
        "scan_required": true,
        "serial_verification": true,
        "photo_requirements": {
          "minimum_photos": 5,
          "required_angles": ["Front", "Back", "Serial_Plate", "Installation", "Overall"]
        }
      }
    },
    "progress": {
      "completion_percentage": 35,
      "completed_steps": ["GPS verification", "Site access verification"],
      "current_step": "Equipment scanning",
      "remaining_steps": ["Photo documentation", "Serial verification", "Compliance check"]
    }
  }
}
```

### **2. GPS Verification APIs**

**GPS-based location verification for VLT compliance:**

#### **Verify GPS Location**

```http
POST /api/v1_enhanced/field-operations/gps-verification/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "field_task_id": "550e8400-e29b-41d4-a716-446655440006",
    "verification_type": "Task_Start",
    "gps_data": {
        "latitude": 19.0760123,
        "longitude": 72.8777456,
        "accuracy": 8.5,
        "altitude": 15.2,
        "timestamp": "2024-12-20T09:15:00Z"
    },
    "device_info": {
        "device_id": "MOBILE_001",
        "app_version": "2.1.0",
        "gps_provider": "GPS",
        "satellite_count": 12
    }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "verification_id": "550e8400-e29b-41d4-a716-446655440007",
    "verification_status": "Verified",
    "meets_requirements": true,
    "location_analysis": {
      "distance_from_site": 3.2,
      "within_boundaries": true,
      "accuracy_sufficient": true,
      "accuracy_required": 10,
      "accuracy_actual": 8.5
    },
    "site_boundary_check": {
      "within_boundary": true,
      "boundary_type": "Circular",
      "distance_from_center": 3.2,
      "boundary_radius": 50
    },
    "verification_time": "2024-12-20T09:15:00Z",
    "next_verification_required": "2024-12-20T13:15:00Z"
  }
}
```

#### **Get GPS Verification History**

```http
GET /api/v1_enhanced/field-operations/gps-verification/task/{task_id}/
Authorization: Bearer {jwt_token}
```

### **3. Equipment Verification APIs**

**VLT-style equipment verification with Category→Model hierarchy:**

#### **Start Equipment Verification**

```http
POST /api/v1_enhanced/equipment-management/verification/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "equipment_item_id": "550e8400-e29b-41d4-a716-446655440003",
    "field_task_id": "550e8400-e29b-41d4-a716-446655440006",
    "verification_type": "VLT_Style",
    "gps_location": {
        "latitude": 19.0760123,
        "longitude": 72.8777456,
        "accuracy": 8.5
    },
    "scanned_data": {
        "serial_number": "RBS2964001",
        "barcode": "123456789012",
        "qr_code": "VLT:RBS2964:001:2024"
    }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "verification_id": "550e8400-e29b-41d4-a716-446655440008",
    "equipment_info": {
      "item_id": "550e8400-e29b-41d4-a716-446655440003",
      "category": "CABINET",
      "model": "RBS-2964",
      "manufacturer": "Ericsson",
      "serial_number": "RBS2964001"
    },
    "verification_requirements": {
      "photos_required": 5,
      "serial_verification": true,
      "gps_verification": true,
      "model_validation": true,
      "required_photos": ["Front view", "Back view", "Serial number plate", "Installation context", "Overall equipment"]
    },
    "verification_progress": {
      "steps_completed": ["GPS verification", "Serial scan"],
      "current_step": "Photo documentation",
      "completion_percentage": 40
    }
  }
}
```

### **4. Mobile Synchronization APIs**

**Offline-ready mobile operations with sync capabilities:**

#### **Initialize Mobile Sync Session**

```http
POST /api/v1_enhanced/site-operations/mobile-sync/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "device_id": "MOBILE_001",
    "sync_type": "Field_Operations",
    "sync_scope": {
        "sites": ["550e8400-e29b-41d4-a716-446655440000"],
        "tasks": ["assigned", "in_progress"],
        "equipment": ["allocated"]
    },
    "capabilities": {
        "offline_storage": "500MB",
        "gps_available": true,
        "camera_available": true,
        "network_type": "4G"
    }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sync_session_id": "550e8400-e29b-41d4-a716-446655440009",
    "sync_data": {
      "sites": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Mumbai Tower Site 001",
          "coordinates": [19.076, 72.8777],
          "boundaries": {
            "type": "Circular",
            "radius": 50
          },
          "verification_requirements": {
            "gps_accuracy": 10,
            "photo_required": true
          }
        }
      ],
      "field_tasks": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440006",
          "name": "VLT-Style Equipment Verification",
          "vlt_requirements": {
            "gps_verification": true,
            "equipment_scan": true,
            "photos_required": 5
          },
          "offline_capable": true
        }
      ],
      "equipment_models": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440010",
          "category": "CABINET",
          "model": "RBS-2964",
          "serial_pattern": "^RBS[0-9]{7}$",
          "verification_steps": ["GPS check", "Serial scan", "Photo documentation"]
        }
      ]
    },
    "sync_config": {
      "sync_interval": 300,
      "auto_sync_enabled": true,
      "offline_retention_days": 7
    }
  }
}
```

---

## Authentication & Authorization

### Base URL

```
Production: https://api.teleops.com/v1
Staging: https://staging-api.teleops.com/v1
Development: http://localhost:8000/api/v1
```

### Authentication Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Tenant-ID: <TENANT_UUID>
X-Circle-Code: <CIRCLE_CODE> (for circle operations)
```

### Circle-Based Access Control

```yaml
Tenant Access Patterns:
  Corporate Tenants:
    - Access to all owned circle tenants
    - Consolidated reporting across circles
    - Circle creation and management

  Circle Tenants:
    - Independent circle operations
    - Circle-specific vendor management
    - Circle billing and performance data

  Vendor Tenants:
    - Multi-circle relationship access
    - Circle-specific project and task data
    - Cross-circle coordination capabilities
```

---

## 1. Authentication & Security Endpoints

### 1.1 User Login

**Endpoint**: `POST /api/auth/login/`
**Description**: Authenticates user credentials with support for multi-tenant access and MFA.

#### Request Parameters

```json
{
  "username": "string (required) - User's username or email",
  "password": "string (required) - User's password",
  "tenant_id": "string (optional) - Specific tenant ID for multi-tenant access",
  "mfa_token": "string (optional) - MFA token if MFA is enabled"
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "john.doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "tenant": {
        "id": "uuid-here",
        "name": "Vodafone MPCG",
        "tenant_type": "Circle"
      },
      "designations": [
        {
          "id": 15,
          "designation_name": "Senior Project Manager",
          "department": "Operations",
          "is_primary": true
        }
      ]
    },
    "effective_permissions": {
      "permissions": ["project.create", "task.assign", "vendor.communicate"],
      "geographic_scope": ["MPCG", "UPE"],
      "functional_scope": ["Operations", "Project_Management"],
      "data_access_level": "Full"
    },
    "expires_at": "2024-12-01T11:00:00Z",
    "mfa_required": false
  }
}
```

### 1.2 Multi-Factor Authentication

**Endpoint**: `POST /api/auth/mfa/verify/`
**Description**: Verifies MFA token for enhanced security.

**Endpoint**: `POST /api/auth/mfa/setup/`
**Description**: Sets up MFA for user account.

### 1.3 User Profile & Permissions

**Endpoint**: `GET /api/auth/me/`
**Description**: Gets current user profile with effective permissions.

**Endpoint**: `GET /api/users/{id}/effective-permissions/`
**Description**: Gets calculated effective permissions for user (designation + overrides).

---

## 2. Tenant Management Endpoints

### 2.1 Corporate Registration

**Endpoint**: `POST /api/public/corporate/register/`
**Description**: Registers new corporate tenant with automatic circle creation.

#### Request Parameters

```json
{
  "corporate_name": "string (required) - Corporate entity name",
  "business_registration_number": "string (required) - Business registration",
  "corporate_contact_name": "string (required) - Primary contact name",
  "corporate_contact_email": "string (required) - Primary contact email",
  "corporate_contact_phone": "string (required) - Primary contact phone",
  "corporate_subdomain": "string (required) - Corporate subdomain",
  "operating_circles": ["MPCG", "UPE", "GJ"] // Array of circle codes
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "corporate_tenant": {
      "id": "corp-uuid",
      "organization_name": "Vodafone India",
      "tenant_type": "Corporate",
      "subdomain": "vodafone-corporate-teleops"
    },
    "circle_tenants": [
      {
        "id": "circle-uuid-1",
        "organization_name": "Vodafone MPCG",
        "circle_code": "MPCG",
        "subdomain": "vodafone-mpcg-teleops"
      }
    ]
  }
}
```

### 2.2 Circle-Vendor Registration

**Endpoint**: `GET /api/public/vendors/invitation/{token}/`
**Description**: Gets circle-vendor invitation details.

**Endpoint**: `POST /api/public/vendors/register/`
**Description**: Completes vendor registration for specific circle.

### 2.3 Circle Management

**Endpoint**: `GET /api/circles/{circle_code}/vendors/`
**Description**: Lists circle's vendors with their client-generated vendor codes.

**Response Example**:

```json
{
  "count": 3,
  "results": [
    {
      "id": "abc123-def456-789",
      "vendor_name": "ABC Infrastructure Services",
      "vendor_code": "VOD-MPCG-ABC-001",
      "vendor_email": "contact@abc-infra.com",
      "service_areas": ["Bhopal", "Indore", "Gwalior"],
      "service_capabilities": ["Dismantling", "Installation"],
      "relationship_status": "Active",
      "performance_rating": 4.5,
      "contract_start_date": "2024-01-01",
      "contact_access_level": "Basic"
    },
    {
      "id": "def789-ghi012-345",
      "vendor_name": "XYZ Telecom Services",
      "vendor_code": "VOD-MPCG-XYZ-2024",
      "vendor_email": "admin@xyz-telecom.com",
      "service_areas": ["Jabalpur", "Sagar"],
      "service_capabilities": ["Dismantling", "Maintenance", "Survey"],
      "relationship_status": "Active",
      "performance_rating": 4.2,
      "contract_start_date": "2024-02-15",
      "contact_access_level": "Full"
    }
  ]
}
```

**Note**: Each vendor relationship shows the client-generated vendor code specific to this circle.

**Endpoint**: `POST /api/circles/{circle_code}/vendors/invite/`
**Description**: Invites vendor to circle with client-generated vendor code.

**Request Body**:

```json
{
  "vendor_name": "ABC Infrastructure Services",
  "vendor_code": "VOD-MPCG-ABC-001",
  "vendor_email": "contact@abc-infra.com",
  "service_areas": ["Bhopal", "Indore", "Gwalior"],
  "service_capabilities": ["Dismantling", "Installation", "Maintenance"],
  "contact_access_level": "Basic",
  "contract_terms": "Circle-specific terms and conditions",
  "notes": "Preferred vendor for MPCG region"
}
```

**Important Notes about Vendor Codes**:

- `vendor_code` is generated by the client in their existing vendor management system
- Each client maintains their own vendor codes independently
- Same vendor can have different codes with different clients
- Platform stores and uses client-provided codes without modification
- Vendor codes must be unique within each client (circle) tenant

**Response**:

```json
{
  "id": "abc123-def456-789",
  "invitation_token": "unique-invitation-token-xyz",
  "vendor_code": "VOD-MPCG-ABC-001",
  "invitation_sent_at": "2024-01-15T10:30:00Z",
  "invitation_expires_at": "2024-01-22T10:30:00Z",
  "status": "Circle_Invitation_Sent"
}
```

### 2.2 Enhanced Vendor Relationship Management _(NEW)_

#### Multi-Level Vendor Hierarchy Endpoints

**Endpoint**: `POST /api/vendor-relationships/`
**Description**: Creates enhanced vendor relationship with hierarchy support.

**Request Body**:

```json
{
  "client_tenant_id": "uuid-client-tenant",
  "vendor_tenant_id": "uuid-vendor-tenant",
  "vendor_code": "CLIENT-GEN-CODE-001",
  "relationship_type": "Primary_Vendor",
  "parent_relationship_id": null,
  "service_scope": "Circle_Wide",
  "service_areas": ["Bhopal", "Indore"],
  "service_capabilities": ["Dismantling", "Installation"],
  "billing_rate": 50000.0,
  "billing_unit": "Per_Project",
  "revenue_share_percentage": null,
  "data_access_level": "Circle_Data",
  "contract_start_date": "2024-02-01",
  "contract_end_date": "2025-01-31"
}
```

**Sub-contractor Relationship Example**:

```json
{
  "client_tenant_id": "uuid-vedag-tenant",
  "vendor_tenant_id": "uuid-verveland-tenant",
  "vendor_code": "VEDAG-SUB-001",
  "relationship_type": "Subcontractor",
  "parent_relationship_id": "uuid-parent-relationship",
  "revenue_share_percentage": 25.0,
  "billing_rate": 30000.0,
  "service_capabilities": ["Dismantling", "Equipment Recovery"]
}
```

**Response**:

```json
{
  "id": "uuid-relationship",
  "hierarchy_level": 2,
  "hierarchy_path": "Vodafone MPCG → vedag → Verveland",
  "relationship_status": "Active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Endpoint**: `GET /api/vendor-relationships/hierarchy/{relationship_id}/`
**Description**: Gets complete vendor hierarchy for a relationship.

**Response**:

```json
{
  "primary_relationship": {
    "id": "uuid-primary",
    "client_name": "Vodafone MPCG",
    "vendor_name": "vedag",
    "hierarchy_level": 1,
    "billing_rate": 50000.0
  },
  "sub_relationships": [
    {
      "id": "uuid-sub-1",
      "client_name": "vedag",
      "vendor_name": "Verveland",
      "hierarchy_level": 2,
      "revenue_share_percentage": 25.0,
      "billing_rate": 30000.0
    },
    {
      "id": "uuid-sub-2",
      "client_name": "Verveland",
      "vendor_name": "LocalCrew",
      "hierarchy_level": 3,
      "revenue_share_percentage": 15.0,
      "billing_rate": 15000.0
    }
  ],
  "total_hierarchy_levels": 3,
  "total_revenue_distribution": {
    "primary_vendor": 37500.0,
    "level_2_vendor": 7500.0,
    "level_3_vendor": 2250.0,
    "remaining": 2750.0
  }
}
```

#### Cross-Tenant Vendor Network Endpoints

**Endpoint**: `POST /api/vendor-relationships/cross-tenant/`
**Description**: Creates cross-corporate or cross-tenant vendor relationships.

**Corporate-to-Corporate Service Example**:

```json
{
  "client_tenant_id": "uuid-vodafone-mpcg",
  "vendor_tenant_id": "uuid-ericsson-mpcg",
  "vendor_code": "VF-MPCG-ERI-001",
  "relationship_type": "Service_Provider",
  "service_capabilities": ["5G Deployment", "Network Optimization"],
  "billing_rate": 200000.0,
  "billing_unit": "Per_Project",
  "data_access_level": "Project_Specific",
  "verification_status": "Verified"
}
```

**Endpoint**: `GET /api/vendors/{vendor_id}/multi-client-dashboard/`
**Description**: Gets unified dashboard for vendors working with multiple clients.

**Response**:

```json
{
  "vendor_info": {
    "name": "Verveland Infrastructure",
    "total_client_relationships": 3,
    "total_monthly_revenue": 125000.0
  },
  "client_relationships": [
    {
      "client_name": "Vodafone MPCG",
      "vendor_code": "VOD-MPCG-VERV-001",
      "relationship_type": "Primary_Vendor",
      "monthly_revenue": 45000.0,
      "performance_rating": 4.5,
      "active_projects": 8
    },
    {
      "client_name": "Ericsson Gujarat",
      "vendor_code": "ERI-GJ-VERVELAND-2024",
      "relationship_type": "Primary_Vendor",
      "monthly_revenue": 40000.0,
      "performance_rating": 4.3,
      "active_projects": 6
    },
    {
      "client_name": "vedag",
      "vendor_code": "VEDAG-SUB-001",
      "relationship_type": "Subcontractor",
      "monthly_revenue": 30000.0,
      "revenue_share_percentage": 25.0,
      "parent_client": "Vodafone MPCG",
      "active_projects": 4
    }
  ],
  "performance_analytics": {
    "overall_rating": 4.37,
    "total_projects_completed": 247,
    "client_satisfaction_scores": {
      "vodafone_mpcg": 4.5,
      "ericsson_gujarat": 4.3,
      "vedag": 4.2
    }
  }
}
```

#### Enhanced Vendor Analytics Endpoints

**Endpoint**: `GET /api/analytics/vendor-hierarchy/{client_id}/`
**Description**: Gets vendor hierarchy analytics for a client.

**Endpoint**: `GET /api/analytics/vendor-networks/cross-tenant/`
**Description**: Gets cross-tenant vendor network analytics.

**Endpoint**: `PUT /api/vendor-relationships/{relationship_id}/revenue-share/`
**Description**: Updates revenue sharing configuration for sub-contractor relationships.

---

## 3. User & Designation Management Endpoints

### 3.1 User Management

**Endpoint**: `GET /api/users/`
**Description**: Lists tenant users with pagination and filtering.

**Endpoint**: `POST /api/users/`
**Description**: Creates new user (admin function).

**Endpoint**: `POST /api/users/invite/`
**Description**: Sends user invitation with role definition.

### 3.2 Designation Management (Tenant-Driven)

**Endpoint**: `GET /api/designations/`
**Description**: Lists tenant's custom designations.

**Endpoint**: `POST /api/designations/`
**Description**: Creates new tenant-defined designation.

**Endpoint**: `GET /api/designations/hierarchy/`
**Description**: Gets designation hierarchy tree.

### 3.3 RBAC & Permission Overrides

**Endpoint**: `GET /api/users/{id}/permission-overrides/`
**Description**: Gets user-specific permission overrides.

**Endpoint**: `POST /api/users/{id}/permission-overrides/`
**Description**: Adds user-level permission override.

**Endpoint**: `POST /api/permissions/evaluate/`
**Description**: Evaluates effective permissions for user.

---

## 4. Equipment Inventory Endpoints

### 4.1 Equipment Categories

**Endpoint**: `GET /api/equipment/categories/`
**Description**: Lists equipment categories with models.

**Endpoint**: `POST /api/equipment/categories/`
**Description**: Creates new equipment category.

#### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category_name": "CABINET",
      "description": "Equipment cabinet housing",
      "unit_of_measurement": "Unit",
      "requires_serial_number": true,
      "allow_custom_model": true,
      "models": [
        {
          "id": 1,
          "model_name": "RBS-2964",
          "manufacturer": "Ericsson",
          "is_custom_model": false
        }
      ]
    }
  ]
}
```

### 4.2 Equipment Models

**Endpoint**: `GET /api/equipment/categories/{id}/models/`
**Description**: Lists models within category.

**Endpoint**: `POST /api/equipment/categories/{id}/models/`
**Description**: Adds model to category.

### 4.3 Equipment Search & Configuration

**Endpoint**: `GET /api/equipment/search/`
**Description**: Searches equipment across categories and models.

**Endpoint**: `GET /api/equipment/verification-config/`
**Description**: Gets equipment verification configuration for mobile app.

---

## 5. Site Management Endpoints

### 5.1 Site Master Data

**Endpoint**: `GET /api/sites/`
**Description**: Lists tenant sites with pagination and filtering.

#### Request Parameters

```json
{
  "page": 1,
  "per_page": 20,
  "cluster": "string (optional) - Filter by cluster",
  "town": "string (optional) - Filter by town",
  "search": "string (optional) - Search in site_id, site_name"
}
```

**Endpoint**: `POST /api/sites/`
**Description**: Creates new site in master data.

#### Request Parameters

```json
{
  "site_id": "string (required) - Business identifier",
  "global_id": "string (required) - Globally unique identifier",
  "site_name": "string (required) - Human-readable site name",
  "town": "string (required) - City/town location",
  "cluster": "string (required) - Operational grouping/region",
  "latitude": "decimal (required) - Geographic coordinate",
  "longitude": "decimal (required) - Geographic coordinate",
  "site_type": "string (optional) - bts|tower|office|warehouse|data_center",
  "access_instructions": "text (optional) - Site access instructions",
  "safety_requirements": "text (optional) - Safety requirements",
  "contact_person": "string (optional) - Site contact person",
  "contact_phone": "string (optional) - Site contact phone"
}
```

### 5.2 Bulk Site Operations

**Endpoint**: `POST /api/sites/bulk-upload/`
**Description**: Bulk uploads sites via Excel template.

**Endpoint**: `GET /api/sites/upload-template/`
**Description**: Downloads Excel template for bulk upload.

---

## 6. Project Management Endpoints

### 6.1 Project CRUD Operations

**Endpoint**: `GET /api/projects/`
**Description**: Lists tenant projects with filtering.

**Endpoint**: `POST /api/projects/`
**Description**: Creates new project with type classification.

#### Request Parameters

```json
{
  "project_name": "string (required) - Descriptive project name",
  "project_type": "string (required) - Dismantle|Other",
  "client": "integer (required) - Client ID",
  "customer": "integer (required) - Customer ID",
  "circle": "string (required) - Telecom circle/region",
  "activity": "string (required) - Description of work to be performed"
}
```

### 6.2 Project Design Phase (Dismantle Projects)

**Endpoint**: `GET /api/projects/{id}/design/`
**Description**: Gets project design details and equipment selections.

**Endpoint**: `POST /api/projects/{id}/design/categories/`
**Description**: Adds equipment category to project design.

**Endpoint**: `POST /api/projects/{id}/design/models/`
**Description**: Adds equipment model to project design.

**Endpoint**: `POST /api/projects/{id}/design/validate/`
**Description**: Validates design completeness.

### 6.3 Project Inventory Management

**Endpoint**: `GET /api/projects/{id}/inventory/`
**Description**: Gets complete project inventory with site allocations.

**Endpoint**: `POST /api/projects/{id}/inventory/upload/`
**Description**: Bulk uploads equipment inventory via Excel.

#### Excel Template Format

```json
{
  "required_columns": ["Site_ID", "Site_Name", "Equipment_Type", "Equipment_Name", "Serial_Number", "Planned_Quantity"]
}
```

**Endpoint**: `GET /api/projects/{id}/inventory/template/`
**Description**: Downloads inventory Excel template.

---

## 7. Task Management Endpoints

### 7.1 Task CRUD Operations

**Endpoint**: `GET /api/tasks/`
**Description**: Lists tenant tasks with status filtering.

**Endpoint**: `POST /api/tasks/`
**Description**: Creates new task from project with site selection.

#### Request Parameters

```json
{
  "task_name": "string (required) - Descriptive task name",
  "task_type": "string (required) - Dismantling_Single_Site|Dismantling_Multi_Site_MW",
  "project_id": "integer (required) - Source project ID",
  "selected_sites": ["array of site IDs selected from project"],
  "priority": "string (required) - Low|Medium|High|Critical",
  "estimated_duration_hours": "integer (required) - Estimated duration"
}
```

### 7.2 Task Status Management

**Endpoint**: `POST /api/tasks/{id}/assign/`
**Description**: Assigns task to team (Vendor operation).

**Endpoint**: `POST /api/tasks/{id}/accept/`
**Description**: Team accepts task assignment.

**Endpoint**: `POST /api/tasks/{id}/start/`
**Description**: Starts task work (changes status to WIP).

**Endpoint**: `POST /api/tasks/{id}/complete/`
**Description**: Marks task as complete.

### 7.3 Task Equipment & Sites

**Endpoint**: `GET /api/tasks/{id}/sites/`
**Description**: Gets task sites with master data.

**Endpoint**: `GET /api/tasks/{id}/equipment/`
**Description**: Gets task equipment requirements inherited from project inventory.

---

## 8. Dismantling Operations & Verification Endpoints

### 8.1 VLT-Style Equipment Verification

**Endpoint**: `GET /api/tasks/{id}/verification/`
**Description**: Gets equipment verification data organized by categories.

**Endpoint**: `POST /api/tasks/{id}/verification/`
**Description**: Creates/updates equipment verification record.

#### Request Parameters

```json
{
  "site_id": "integer (required) - Site ID within the task",
  "equipment_verifications": [
    {
      "equipment_category": "string (required) - CABINET|CARDS|DXU|PSU|etc",
      "equipment_model": "string (required) - Specific model within category",
      "planned_serial_number": "string (optional) - Expected serial number",
      "is_found": "boolean (required) - Equipment found or not",
      "actual_serial_number": "string (optional) - Actual serial if found",
      "serial_match": "boolean (optional) - Planned vs actual match",
      "condition": "string (optional) - excellent|good|fair|poor|scrap",
      "not_found_reason": "string (optional) - Not Found|Used by BSS|Engaged with other Technology|Post RFI|Others",
      "not_found_details": "string (optional) - Additional details if not found",
      "verification_notes": "string (optional) - General notes"
    }
  ],
  "gps_coordinates": {
    "latitude": "decimal (required) - GPS latitude",
    "longitude": "decimal (required) - GPS longitude",
    "accuracy": "decimal (required) - GPS accuracy in meters",
    "timestamp": "string (required) - GPS capture timestamp"
  }
}
```

### 8.2 GPS Photo Management

**Endpoint**: `POST /api/tasks/{id}/photos/`
**Description**: Uploads GPS-tagged photos for equipment verification.

#### Request Parameters

```json
{
  "site_id": "integer (required) - Site ID within task",
  "equipment_category": "string (optional) - Equipment category if equipment-specific",
  "photo_type": "string (required) - Equipment_Found|Equipment_Condition|Site_Overview|Not_Found_Area",
  "photos": [
    {
      "image_data": "string (required) - Base64 encoded image",
      "gps_metadata": {
        "latitude": "decimal (required) - Photo GPS latitude",
        "longitude": "decimal (required) - Photo GPS longitude",
        "accuracy": "decimal (required) - GPS accuracy in meters",
        "altitude": "decimal (optional) - GPS altitude",
        "timestamp": "string (required) - Photo capture timestamp"
      },
      "description": "string (optional) - Photo description"
    }
  ]
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "photos_uploaded": 3,
    "gps_validation_passed": true,
    "photos": [
      {
        "id": 1001,
        "photo_url": "https://storage.teleops.com/photos/task123/site456/photo1001.jpg",
        "gps_coordinates": {
          "latitude": 19.076,
          "longitude": 72.8777,
          "accuracy": 4.2
        },
        "upload_status": "success"
      }
    ]
  }
}
```

### 8.3 Mobile App Support & Offline Sync

**Endpoint**: `GET /api/mobile/tasks/assigned/`
**Description**: Gets mobile app task list for assigned team.

**Endpoint**: `POST /api/mobile/verification/offline-sync/`
**Description**: Syncs offline verification data and photos.

**Endpoint**: `GET /api/mobile/equipment-config/`
**Description**: Gets equipment verification configuration for mobile app.

#### Equipment Config Response

```json
{
  "success": true,
  "data": {
    "categories": {
      "CABINET": {
        "requires_serial_number": true,
        "serial_number_optional": false,
        "allow_custom_model": true,
        "models": ["RBS-2964", "RBS-2954", "RBS-2204"]
      },
      "CARDS": {
        "requires_serial_number": true,
        "serial_number_optional": false,
        "models": ["EDRU 9P-03", "EDRU 9P-01", "DTRU"]
      }
    },
    "not_found_reasons": ["Not Found", "Used by BSS", "Engaged with other Technology", "Post RFI", "Others"],
    "gps_requirements": {
      "minimum_accuracy": 10.0,
      "required_for_photos": true
    }
  }
}
```

### 8.4 Task Progress & Completion

**Endpoint**: `GET /api/tasks/{id}/progress/`
**Description**: Gets task progress with equipment verification status.

**Endpoint**: `POST /api/tasks/{id}/progress/update/`
**Description**: Updates task progress percentage.

**Endpoint**: `GET /api/tasks/{id}/verification-status/`
**Description**: Gets equipment verification completion status by category.

---

## 9. Reporting & Analytics Endpoints

### 9.1 Dashboard Analytics

**Endpoint**: `GET /api/analytics/dashboard/`
**Description**: Gets comprehensive dashboard data for tenant.

### 9.2 Project Reports

**Endpoint**: `GET /api/projects/{id}/reports/summary/`
**Description**: Gets project summary report.

**Endpoint**: `GET /api/projects/{id}/reports/equipment/`
**Description**: Gets equipment verification report for project.

### 9.3 CAM File Generation

**Endpoint**: `POST /api/projects/{id}/cam/generate/`
**Description**: Generates CAM file for project completion.

**Endpoint**: `GET /api/projects/{id}/cam/download/`
**Description**: Downloads generated CAM file.

---

## 10. Error Handling & Status Codes

### HTTP Status Codes

```yaml
200 OK: Successful operation
201 Created: Resource created successfully
400 Bad Request: Invalid request parameters
401 Unauthorized: Authentication required
403 Forbidden: Access denied
404 Not Found: Resource not found
409 Conflict: Resource conflict (duplicate serial number, etc.)
422 Unprocessable Entity: Validation errors
429 Too Many Requests: Rate limit exceeded
500 Internal Server Error: Server error
503 Service Unavailable: Temporary service issue
```

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "errors": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "field_errors": {
      "site_id": ["This field is required."],
      "equipment_data": ["Invalid equipment format."]
    },
    "trace_id": "uuid-for-debugging"
  },
  "meta": {
    "timestamp": "2024-12-01T10:00:00Z",
    "request_id": "req_12345"
  }
}
```

---

## 11. Rate Limiting & Pagination

### Rate Limits by Endpoint Category

```yaml
Authentication: 5 requests/minute
Read Operations: 1000 requests/hour
Write Operations: 500 requests/hour
File Uploads: 100 requests/hour
GPS Updates: 3600 requests/hour (1 per second)
```

### Pagination Format

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_count": 150,
      "total_pages": 8,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

## 12. WebSocket API (Real-time Updates)

### Connection URL

```
wss://api.teleops.com/ws/v1/updates/?token=<JWT_TOKEN>
```

### Real-time Event Types

```yaml
task_progress: Task progress updates
equipment_verification: Equipment verification status
vehicle_tracking: Real-time vehicle locations
system_alerts: Important system notifications
```

---

## Support & Ticketing API Endpoints

### Core Endpoints

- `POST /api/v1/support/tickets/` — Create a new support ticket
- `GET /api/v1/support/tickets/` — List tickets (user: own, agent/admin: all)
- `GET /api/v1/support/tickets/{id}/` — Get ticket details
- `PATCH /api/v1/support/tickets/{id}/` — Update ticket (status, priority, assignment)
- `POST /api/v1/support/tickets/{id}/comment/` — Add comment to ticket
- `POST /api/v1/support/tickets/{id}/attachment/` — Upload attachment
- `GET /api/v1/support/tickets/{id}/attachments/` — List/download attachments
- `POST /api/v1/support/tickets/{id}/feedback/` — Submit CSAT feedback
- `GET /api/v1/support/reports/` — Access analytics and reports
- `GET /api/v1/support/slas/` — SLA policy details

### Sample Requests/Responses

#### Create Ticket

```json
POST /api/v1/support/tickets/
{
  "subject": "Cannot access dashboard",
  "description": "I get a 403 error when trying to access the dashboard.",
  "category": "Access",
  "priority": "High"
}

Response:
{
  "id": 1234,
  "status": "New",
  "created_at": "2024-12-28T10:00:00Z"
}
```

#### Add Comment

```json
POST /api/v1/support/tickets/1234/comment/
{
  "comment": "Can you please provide a screenshot?"
}

Response:
{
  "id": 5678,
  "ticket_id": 1234,
  "user_id": 42,
  "comment": "Can you please provide a screenshot?",
  "created_at": "2024-12-28T10:05:00Z"
}
```

#### Upload Attachment

```http
POST /api/v1/support/tickets/1234/attachment/
Content-Type: multipart/form-data

file: screenshot.png

Response:
{
  "id": 7890,
  "ticket_id": 1234,
  "file_name": "screenshot.png",
  "file_size": 204800,
  "created_at": "2024-12-28T10:06:00Z"
}
```

#### Submit CSAT Feedback

```json
POST /api/v1/support/tickets/1234/feedback/
{
  "satisfaction_rating": 5,
  "feedback": "Great support, issue resolved quickly."
}

Response:
{
  "ticket_id": 1234,
  "satisfaction_rating": 5,
  "feedback": "Great support, issue resolved quickly.",
  "submitted_at": "2024-12-28T10:10:00Z"
}
```

### Multi-Tenancy & Role-Based Access

- All endpoints require authentication and are scoped by tenant (X-Tenant-ID header).
- Agents/admins can access all tickets for their tenant; end users can only access their own.
- Role-based permissions control ticket assignment, status changes, and internal notes.

### Database Schema Reference

- See [Database_Schema_Documentation.md](./Database_Schema_Documentation.md) for support ticketing tables and relationships.

---

**Documentation Version**: 2.0  
**Last Updated**: December 2024  
**API Coverage**: Complete Circle-Based Multi-Tenant Platform
