# Teleops Circle-Based Multi-Tenant Platform - Backend API PRD

## Document Information

- **Version**: 2.0
- **Date**: December 28, 2024
- **Author**: Backend Development Team
- **Stakeholders**: Product Team, Engineering Team, QA Team, Business Team
- **Status**: Active Development
- **Architecture**: Circle-Based Multi-Tenant Platform

---

## 1. Executive Summary

### 1.1 Product Overview

Teleops Backend API powers the **Circle-Based Multi-Tenant Platform** for telecom infrastructure management, supporting a sophisticated three-tier tenant hierarchy (Corporate → Circle → Vendor) with complete tenant autonomy and data isolation. The platform implements VLT-style equipment verification with mandatory GPS tracking, tenant-driven designation management, and comprehensive project design workflows.

### 1.2 Business Objectives

- **Circle-Based Revenue Multiplication**: Enable 2.5x-3x revenue per corporate through circle-based model (₹5.3L vs ₹2L monthly)
- **Tenant Autonomy**: Complete organizational freedom with only Super Admin predefined
- **VLT-Style Operations**: GPS-mandatory equipment verification with offline synchronization
- **Multi-Circle Operations**: Independent circle operations with corporate oversight
- **Vendor Ecosystem Growth**: Multi-circle vendor relationships with separate billing

### 1.3 Success Metrics

- **Performance**: API response time < 200ms for 95% of requests
- **Reliability**: 99.9% uptime SLA with zero data loss
- **Scalability**: Support 10,000+ concurrent users across circles
- **Revenue Growth**: Enable 265% revenue increase through circle model
- **User Adoption**: 95% feature adoption rate within 6 months

---

## 2. Circle-Based Architecture Overview

### 2.1 Multi-Tenant Hierarchy

```yaml
Circle-Based Tenant Structure:
  Corporate Tenants (Telecom HQ):
    - Vodafone India HQ, Airtel Corporate
    - Create and oversee circle tenants
    - Consolidated reporting across circles
    - Corporate-level governance

  Circle Tenants (Independent Business Units):
    - Vodafone MPCG, Vodafone UPE, Vodafone Gujarat
    - Quasi-independent businesses with separate P&L
    - Independent vendor management
    - Circle-specific billing (₹1.5L MPCG + ₹2L UPE + ₹1.8L Gujarat = ₹5.3L total)

  Vendor Tenants (Service Providers):
    - ABC Infrastructure, XYZ Telecom Services
    - Multi-circle relationships with separate contracts
    - Circle-specific performance tracking
    - Independent billing per circle relationship

Revenue Multiplication Example:
  Traditional Model: ₹2L/month per client
  Circle Model: ₹5.3L/month (MPCG + UPE + Gujarat)
  Increase: 265% revenue multiplication
```

### 2.2 Core Platform Features

```yaml
Platform Capabilities:
  Tenant Management:
    - Automatic circle creation for corporates
    - Circle-vendor invitation workflows
    - Multi-circle vendor relationship management
    - Circle-specific billing and revenue tracking

  Designation Management:
    - Only Super Admin predefined (tenant autonomy)
    - Custom organizational structure creation
    - Tenant-defined permission schemes
    - Hierarchical designation management

  Equipment Management:
    - Category → Model hierarchy (CABINET, CARDS, DXU, etc.)
    - Cross-technology equipment usage
    - Project design with equipment selection
    - VLT-style verification workflows

  Field Operations:
    - GPS-mandatory equipment verification
    - Offline synchronization with conflict resolution
    - Category-organized equipment checklists
    - Real-time progress tracking
```

---

## 3. Functional Requirements

### 3.1 Circle-Based Tenant Management

#### 3.1.1 Corporate Tenant Registration

```yaml
Requirement ID: TENANT-001
Priority: Critical
Description: Corporate tenant registration with automatic circle creation
Acceptance Criteria:
  - Corporate registration creates parent tenant + selected circle tenants
  - Automatic subdomain generation (vodafone-mpcg-teleops, vodafone-upe-teleops)
  - Circle-specific billing configuration (₹1.5L MPCG, ₹2L UPE)
  - Corporate-circle relationship establishment
  - Super Admin designation creation for each tenant
  - Email verification and approval workflow
  - Circle independence configuration (autonomous operations)

Business Value:
  - Revenue multiplication: 2.5x-3x per corporate through circle model
  - Alignment with real telecom business structure
  - Independent circle operations with corporate oversight
```

#### 3.1.2 Enhanced Vendor Relationship Management _(UPDATED)_

```yaml
Requirement ID: TENANT-002
Priority: Critical
Description: Multi-level vendor hierarchy and cross-tenant relationship management
Acceptance Criteria:
  - Traditional circle-vendor relationships (backward compatibility)
  - Multi-level vendor hierarchies (Primary → Sub-contractor → Sub-sub-contractor)
  - Cross-tenant vendor networks (Corporate-to-Corporate, Circle-to-Circle)
  - Any-to-any tenant relationship support (Vendor-to-Vendor relationships)
  - Revenue sharing models for sub-contracting scenarios
  - Multi-client vendor dashboard and unified management
  - Hierarchical permission inheritance with restrictions
  - Automatic hierarchy level calculation and validation

Enhanced Relationship Types:
  - Primary_Vendor: Traditional direct client-vendor relationships
  - Subcontractor: Vendor hires another vendor (with parent relationship)
  - Service_Provider: Corporate-to-Corporate service relationships
  - Partnership: Equal partnership arrangements
  - Preferred_Vendor: Strategic vendor partnerships
  - Backup_Vendor: Secondary/emergency vendor relationships

Multi-Level Hierarchy Features:
  - Parent-child relationship tracking (unlimited depth)
  - Circular relationship prevention (business logic validation)
  - Revenue sharing percentage configuration (0-100%)
  - Hierarchy path visualization and reporting
  - Multi-level performance aggregation

Business Value:
  - 3x revenue increase through complex vendor networks
  - Vendor ecosystem expansion through sub-contracting
  - Cross-corporate service opportunities
  - Enhanced vendor retention through multi-client access
  - Platform stickiness through vendor network effects
```

#### 3.1.2a Multi-Level Vendor Hierarchy Requirements

```yaml
Requirement ID: VENDOR-HIERARCHY-001
Priority: Critical
Description: Support unlimited vendor hierarchy levels with revenue sharing
Acceptance Criteria:
  - Primary vendor creates sub-contractor relationships
  - Sub-contractors can create their own sub-contractors (unlimited depth)
  - Revenue sharing percentage configuration per relationship
  - Automatic hierarchy level calculation (1, 2, 3, ...)
  - Parent-child permission inheritance with override capabilities
  - Hierarchical approval workflows for complex relationships
  - Performance aggregation across hierarchy levels

Technical Implementation:
  - Self-referencing foreign key (parent_relationship_id)
  - Hierarchy level field with automatic calculation
  - Revenue sharing percentage (0.00-100.00)
  - Hierarchical permission JSON with inheritance rules
  - Recursive query support for hierarchy operations

Example Scenarios:
  Level 1: Vodafone MPCG → vedag (Primary Vendor, ₹50,000/project)
  Level 2: vedag → Verveland (Subcontractor, 25% revenue share)
  Level 3: Verveland → LocalCrew (Sub-subcontractor, 15% revenue share)
```

#### 3.1.2b Cross-Tenant Vendor Network Requirements

```yaml
Requirement ID: VENDOR-NETWORK-001
Priority: High
Description: Support cross-corporate and multi-tenant vendor relationships
Acceptance Criteria:
  - Corporate-to-Corporate service provider relationships
  - Circle-to-Circle regional service arrangements
  - Vendor-to-Vendor partnership and collaboration
  - Multi-client vendor unified dashboard
  - Cross-tenant performance analytics and benchmarking
  - Enterprise-grade security for cross-corporate relationships

Cross-Tenant Relationship Examples:
  Corporate Service: Ericsson MPCG → Vodafone MPCG (₹200,000/project)
  Circle Collaboration: Ericsson UPW → Vodafone UPW (regional expertise)
  Vendor Partnership: TowerCorp → NetworkPro (equipment sharing)
  Multi-Client Vendor: Verveland works for Vodafone, Ericsson, vedag simultaneously

Technical Requirements:
  - Any tenant can be client_tenant_id
  - Any tenant can be vendor_tenant_id
  - Client-vendor tenant type validation (configurable)
  - Cross-tenant permission and security models
  - Multi-tenant data isolation and access control
```

#### 3.1.3 Teleops Admin Portal

```yaml
Requirement ID: TENANT-003
Priority: High
Description: Comprehensive platform administration interface
Acceptance Criteria:
  - All tenant types management (Corporate, Circle, Vendor)
  - Tenant registration approval/rejection workflows
  - Circle-vendor relationship oversight
  - Platform-wide usage monitoring and analytics
  - Billing and subscription management across circles
  - System health monitoring and maintenance
  - Audit log review and compliance reporting
  - Feature flag management across tenants

Administrative Capabilities:
  - View all tenants across platform hierarchy
  - Approve/reject tenant registrations
  - Monitor cross-tenant communications
  - Resolve relationship conflicts
  - Platform configuration management
```

### 3.2 Tenant-Driven Designation Management

#### 3.2.1 Custom Organizational Structure

```yaml
Requirement ID: DESIGNATION-001
Priority: Critical
Description: Complete tenant autonomy in organizational design
Acceptance Criteria:
  - Only Super Admin role predefined by system
  - Tenants create custom designations based on business needs
  - Hierarchical designation structure with levels
  - Custom permission categories and permissions
  - Geographic and functional scope assignment
  - Approval authority levels (tenant-defined)
  - Expense approval limits (tenant-configurable)
  - Delegation and subordinate management

Tenant Freedom Examples:
  Technology Company: CEO → CTO → Engineering Manager → Software Engineer
  Construction: Managing Director → Project Manager → Site Supervisor → Technician
  Consulting: Senior Partner → Principal → Manager → Consultant
```

#### 3.2.2 Permission Management System

```yaml
Requirement ID: DESIGNATION-002
Priority: Critical
Description: Flexible permission framework for tenant customization
Acceptance Criteria:
  - Tenant-defined permission categories
  - Custom permissions per business function
  - Permission assignment to designations
  - User designation assignments with overrides
  - Real-time permission calculation
  - Geographic and functional scope enforcement
  - Temporary and project-specific assignments
  - Multiple designation support per user

Permission Architecture:
  Formula: (Designation_Permissions + User_Additional - User_Restricted) filtered by Scope
  Supports: tenant-specific business rules and workflows
```

### 3.3 Equipment Inventory & Project Design

#### 3.3.1 Category-Model Equipment Hierarchy

```yaml
Requirement ID: EQUIPMENT-001
Priority: Critical
Description: Simplified equipment management with Category → Model structure
Acceptance Criteria:
  - Equipment categories: CABINET, CARDS, DXU, PSU, IDM, FCU, DCCU, PAU, CXU, OTHER
  - Models within categories: RBS-2964, EDRU 9P-03, DXU-31, etc.
  - Cross-technology equipment usage (no constraints)
  - Custom model addition by tenants
  - Verification requirements per category
  - Serial number configuration per category
  - Manufacturer and specification management

Equipment Examples:
  CABINET: RBS-2964, RBS-2954, RBS-2204, RBS-2202
  CARDS: EDRU 9P-03, EDRU 9P-01, DTRU, DRU-900
  DXU: DXU-31, DXU-23, DXU-21
```

#### 3.3.2 Project Design Workflow

```yaml
Requirement ID: PROJECT-001
Priority: Critical
Description: Equipment design phase for dismantling projects
Acceptance Criteria:
  - Project type classification (Dismantle, Other)
  - Automatic design phase activation for Dismantle projects
  - Equipment category selection (WHAT categories needed)
  - Equipment model selection (WHICH models within categories)
  - Equipment specifications and requirements definition
  - Design validation and approval workflow
  - Equipment inheritance to inventory management phase

Design Process Flow:
  Step 1: Project Creation (type = "Dismantle")
  Step 2: Equipment Category Selection
  Step 3: Equipment Model Selection within Categories
  Step 4: Specifications and Requirements Definition
  Step 5: Design Validation and Approval
  Step 6: Ready for Inventory Management Phase

Note: Quantities and site allocations handled in separate inventory phase
```

### 3.4 VLT-Style Field Operations

#### 3.4.1 GPS-Mandatory Equipment Verification

```yaml
Requirement ID: VERIFICATION-001
Priority: Critical
Description: VLT-compatible equipment verification with mandatory GPS tracking
Acceptance Criteria:
  - Category-organized equipment checklists
  - Found/Not Found workflow (VLT-style)
  - Mandatory GPS coordinates for all verification photos
  - GPS accuracy validation (minimum 5-10 meters)
  - Serial number verification with planned vs actual matching
  - Equipment condition assessment
  - Not found reasons: "Not Found", "Used by BSS", "Engaged with other Technology", "Post RFI", "Others"
  - Real-time progress tracking and updates

GPS Photo Requirements:
  - All equipment verification photos must include GPS coordinates
  - GPS metadata embedded in photo files
  - Location consistency validation within site boundaries
  - Photo types: equipment_found, equipment_condition, site_overview, not_found_area
```

#### 3.4.2 Offline Synchronization System

```yaml
Requirement ID: VERIFICATION-002
Priority: Critical
Description: Robust offline capabilities with conflict resolution
Acceptance Criteria:
  - Equipment verification data cached locally
  - GPS-tagged photos stored offline
  - Queue-based synchronization mechanism
  - Conflict resolution based on latest timestamp
  - Real-time sync when connectivity restored
  - Progress tracking offline and online
  - Equipment verification state management
  - Team member collaboration support

Offline Capabilities:
  - Equipment verification without internet connection
  - GPS coordinates and photos stored locally
  - Automatic synchronization when connectivity restored
  - Conflict resolution for concurrent edits
  - Latest timestamp wins for data conflicts
```

#### 3.4.3 Task Management Integration

```yaml
Requirement ID: TASK-001
Priority: High
Description: VLT-compatible task progression with equipment inheritance
Acceptance Criteria:
  - Task creation from projects with site selection
  - Equipment inheritance from project design
  - VLT-compatible status progression: CREATED → ALLOCATED → ASSIGNING → ASSIGNED → IN_PROGRESS → DONE
  - Multi-site task support (MW Far-End/Near-End)
  - Team assignment and acceptance workflow
  - Progress calculation based on equipment verification
  - Task completion with equipment verification requirements

Task Status Progression:
  - CREATED: Task created from project
  - ALLOCATED: Resources allocated to task
  - ASSIGNING: Team assignment in progress
  - ASSIGNED: Team accepted task assignment
  - IN_PROGRESS: Field operations underway
  - DONE: All equipment verified and task completed
```

---

## 4. Technical Requirements

### 4.1 Technology Stack

```yaml
Backend Architecture:
  Framework: Django REST Framework 3.15+
  Database: PostgreSQL 14+ with PostGIS (spatial data support)
  Cache: Redis 7+ for session management and caching
  File Storage: Azure Blob Storage for photos and documents
  Authentication: JWT with SimpleJWT for multi-tenant support
  Task Queue: Celery with Redis broker for background processing
  API Documentation: drf-yasg (Swagger/OpenAPI 3.0)
  Testing: pytest + Django Test Framework
  Monitoring: Custom metrics + Azure Application Insights

Spatial Data Support:
  PostGIS: GPS coordinates and location queries
  GIS Operations: Location validation, distance calculations
  Spatial Indexing: Efficient GPS coordinate queries
```

### 4.2 Database Architecture

#### 4.2.1 Circle-Based Multi-Tenant Schema

```sql
-- Core tenant hierarchy
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_type VARCHAR(30) NOT NULL, -- 'Corporate', 'Circle', 'Vendor'
    parent_tenant_id UUID REFERENCES tenants(id),
    organization_name VARCHAR(255) NOT NULL,
    organization_code VARCHAR(50) UNIQUE,
    circle_code VARCHAR(20), -- For Circle tenants
    circle_name VARCHAR(100), -- For Circle tenants
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    -- ... additional fields
    CHECK (tenant_type IN ('Corporate', 'Circle', 'Vendor'))
);

-- Corporate-Circle relationships
CREATE TABLE corporate_circle_relationships (
    id BIGSERIAL PRIMARY KEY,
    corporate_tenant_id UUID NOT NULL REFERENCES tenants(id),
    circle_tenant_id UUID NOT NULL REFERENCES tenants(id),
    governance_level VARCHAR(30) DEFAULT 'Autonomous',
    separate_billing BOOLEAN DEFAULT TRUE,
    independent_vendor_management BOOLEAN DEFAULT TRUE
);

-- Circle-Vendor relationships
CREATE TABLE circle_vendor_relationships (
    id BIGSERIAL PRIMARY KEY,
    circle_tenant_id UUID NOT NULL REFERENCES tenants(id),
    vendor_tenant_id UUID REFERENCES tenants(id),
    vendor_code VARCHAR(100), -- Circle's internal vendor code
    relationship_status VARCHAR(50) DEFAULT 'Circle_Invitation_Sent',
    billing_rate DECIMAL(10,2),
    service_capabilities TEXT[]
);
```

#### 4.2.2 Tenant-Driven Designation Schema

```sql
-- Flexible designation management
CREATE TABLE designations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    designation_name VARCHAR(255) NOT NULL,
    designation_code VARCHAR(100) NOT NULL,
    designation_level INTEGER NOT NULL DEFAULT 10,
    permissions JSONB DEFAULT '[]',
    geographic_scope JSONB DEFAULT '[]',
    functional_scope JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE, -- Only true for Super Admin
    -- ... additional fields
    UNIQUE(tenant_id, designation_code)
);

-- User designation assignments
CREATE TABLE user_designation_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id),
    designation_id BIGINT NOT NULL REFERENCES designations(id),
    is_primary_designation BOOLEAN DEFAULT TRUE,
    permission_overrides JSONB DEFAULT '{}',
    geographic_scope_override JSONB DEFAULT '{}',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE
);
```

#### 4.2.3 Equipment & Verification Schema

```sql
-- Equipment categories and models
CREATE TABLE equipment_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    category_name VARCHAR(255) NOT NULL, -- CABINET, CARDS, DXU, etc.
    requires_serial_number BOOLEAN DEFAULT true,
    serial_number_optional BOOLEAN DEFAULT false,
    is_predefined BOOLEAN DEFAULT false
);

CREATE TABLE equipment_models (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES equipment_categories(id),
    model_name VARCHAR(255) NOT NULL, -- RBS-2964, EDRU 9P-03, etc.
    manufacturer VARCHAR(255),
    is_custom_model BOOLEAN DEFAULT false
);

-- VLT-style equipment verification
CREATE TABLE task_equipment_verification (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id),
    site_id BIGINT NOT NULL REFERENCES sites(id),
    equipment_category VARCHAR(100) NOT NULL,
    equipment_model VARCHAR(255) NOT NULL,
    is_found BOOLEAN, -- null=not verified, true=found, false=not found
    gps_coordinates POINT, -- Mandatory GPS location
    gps_accuracy DECIMAL(8,2),
    not_found_reason VARCHAR(255),
    verified_by INTEGER REFERENCES auth_user(id),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- GPS-tagged photos
CREATE TABLE task_equipment_verification_photos (
    id BIGSERIAL PRIMARY KEY,
    verification_id BIGINT NOT NULL REFERENCES task_equipment_verification(id),
    photo_filename VARCHAR(255) NOT NULL,
    gps_coordinates POINT NOT NULL, -- Mandatory GPS
    gps_accuracy DECIMAL(8,2),
    gps_captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    photo_type VARCHAR(50) -- equipment_found, equipment_condition, site_overview, not_found_area
);
```

### 4.3 API Design Standards

#### 4.3.1 Circle-Based API Architecture

```yaml
API Structure: /api/v1/{resource}/
Circle Context Headers:
  X-Tenant-ID: UUID of current tenant
  X-Circle-Code: Circle code for circle-specific operations
  X-Corporate-ID: Corporate parent for consolidated reporting

Multi-Tenant Endpoints:
  Corporate Level: GET /api/v1/corporate/{corp_id}/circles/
    GET /api/v1/corporate/{corp_id}/billing/consolidated/
    GET /api/v1/corporate/{corp_id}/analytics/cross-circle/

  Circle Level: GET /api/v1/circles/{circle_code}/vendors/
    POST /api/v1/circles/{circle_code}/vendors/invite/
    GET /api/v1/circles/{circle_code}/billing/

  Vendor Level: GET /api/v1/vendors/circle-relationships/
    GET /api/v1/vendors/circles/{circle_code}/contacts/
    GET /api/v1/vendors/performance/by-circle/
```

#### 4.3.2 Equipment Verification APIs

```yaml
Equipment Management: GET /api/v1/equipment/categories/
  GET /api/v1/equipment/categories/{id}/models/
  POST /api/v1/equipment/categories/{id}/models/

Project Design: POST /api/v1/projects/{id}/design/
  POST /api/v1/projects/{id}/design/categories/
  POST /api/v1/projects/{id}/design/models/
  POST /api/v1/projects/{id}/design/validate/

Task Verification: GET /api/v1/tasks/{id}/equipment-verification/
  PUT /api/v1/equipment-verification/{id}/
  POST /api/v1/equipment-verification/{id}/photos/
  GET /api/v1/tasks/{id}/progress/
```

### 4.4 Performance Requirements

#### 4.4.1 Circle-Based Performance Targets

```yaml
API Response Times:
  Tenant Management: < 100ms
  Equipment Verification: < 200ms
  GPS Photo Upload: < 2000ms
  Circle Analytics: < 500ms
  Cross-Circle Reporting: < 1000ms

Scalability Targets:
  Concurrent Users: 10,000+ across all circles
  Circle Tenants: 1000+ per corporate
  Vendor Relationships: 10,000+ per circle
  Equipment Verifications: 1M+ per month
  GPS Photos: 10M+ per month with metadata

Database Performance:
  Tenant Isolation: Sub-100ms queries
  Spatial Queries: Sub-200ms GPS operations
  Circle Aggregation: Sub-500ms consolidated reporting
  Equipment Search: Sub-150ms category/model queries
```

---

## 5. Security Requirements

### 5.1 Circle-Based Data Isolation

```yaml
SECURITY-001: Multi-Tenant Data Isolation
  Row-Level Security (RLS):
    - Tenant-scoped data access policies
    - Circle-vendor relationship validation
    - Corporate consolidated reporting access
    - Cross-tenant access prevention

  Circle-Aware Access Control:
    - Circle-specific vendor data access
    - Corporate oversight with circle autonomy
    - Multi-circle vendor relationship management
    - Vendor isolation between unrelated circles

  Data Encryption:
    - AES-256 encryption at rest
    - TLS 1.3 for data in transit
    - GPS coordinate encryption
    - Photo metadata protection
```

### 5.2 GPS Data Security

```yaml
SECURITY-002: Location Data Protection
  GPS Data Handling:
    - Encrypted GPS coordinates storage
    - Photo GPS metadata preservation
    - Location accuracy validation
    - Site boundary verification

  Privacy Compliance:
    - GDPR compliance for location data
    - User consent for GPS tracking
    - Data retention policies for GPS data
    - Secure GPS data transmission
```

---

## 6. Integration Requirements

### 6.1 Circle-Based Integrations

```yaml
INTEGRATION-001: Corporate Systems
  ERP Integration:
    - Circle-specific billing data export
    - Multi-circle financial reporting
    - Vendor performance data across circles
    - Equipment asset tracking per circle

  Business Intelligence:
    - Circle performance analytics
    - Cross-circle comparison reporting
    - Vendor efficiency across circles
    - Revenue multiplication tracking

Circle-Specific APIs:
  - Circle billing system integration
  - Circle-specific vendor management
  - Equipment tracking per circle
  - Performance monitoring per circle
```

### 6.2 Mobile App Integration

```yaml
INTEGRATION-002: Mobile Field Operations
  Equipment Verification:
    - Offline-capable equipment verification APIs
    - GPS-mandatory photo upload endpoints
    - Real-time synchronization APIs
    - Conflict resolution mechanisms

  VLT Compatibility:
    - VLT-style status progression APIs
    - Equipment checklist generation
    - Progress tracking and reporting
    - Task completion workflows
```

---

## 7. Testing Strategy

### 7.1 Multi-Tenant Testing

```yaml
TESTING-001: Circle-Based Testing
  Tenant Isolation Testing:
    - Data isolation validation across tenants
    - Circle-vendor relationship testing
    - Cross-tenant access prevention
    - Multi-circle vendor scenarios

  Performance Testing:
    - Multi-tenant load testing
    - Circle-specific performance validation
    - GPS photo upload performance
    - Offline synchronization testing

Coverage Requirements:
  Unit Tests: 95%+ coverage
  Integration Tests: 90%+ coverage
  E2E Tests: Critical user flows
  Performance Tests: All API endpoints
```

### 7.2 Field Operations Testing

```yaml
TESTING-002: VLT-Style Verification Testing
  Equipment Verification:
    - GPS coordinate validation testing
    - Photo upload with GPS metadata
    - Offline synchronization scenarios
    - Conflict resolution testing

  Mobile Compatibility:
    - iOS and Android compatibility
    - Various device GPS accuracy
    - Network connectivity scenarios
    - Battery optimization validation
```

---

## 8. Business Value & ROI

### 8.1 Revenue Multiplication Model

```yaml
Circle-Based Revenue Growth:
  Traditional Single Tenant:
    Monthly Revenue: ₹2L per client
    Annual Revenue: ₹24L per client

  Circle-Based Multi-Tenant:
    Vodafone Example:
      MPCG Circle: ₹1.5L/month
      UPE Circle: ₹2L/month
      Gujarat Circle: ₹1.8L/month
      Total Monthly: ₹5.3L (265% increase)
      Total Annual: ₹63.6L per corporate

  Platform Projections:
    Year 1: ₹12.15 Cr (50 corporates × ₹24.3L avg)
    Year 2: ₹34.1 Cr (140 corporates × ₹24.3L avg)
    Year 3: ₹129.3 Cr (530 corporates × ₹24.3L avg)
```

### 8.2 Operational Efficiency Gains

```yaml
Efficiency Improvements:
  Equipment Verification:
    - 70% faster verification with GPS automation
    - 90% reduction in verification errors
    - 80% improvement in audit compliance
    - 60% reduction in asset loss

  Multi-Circle Operations:
    - 3x vendor opportunities per vendor
    - 50% reduction in vendor management overhead
    - 40% improvement in resource utilization
    - 25% reduction in operational costs

  Tenant Autonomy:
    - 90% reduction in custom development requests
    - 80% faster tenant onboarding
    - 95% improvement in organizational fit
    - 70% reduction in support tickets
```

---

## 9. Implementation Roadmap

### Phase 1: Circle-Based Foundation (12 weeks)

**Weeks 1-4: Core Tenant Management**

- Multi-tenant architecture with Corporate/Circle/Vendor hierarchy
- Corporate registration with automatic circle creation
- Circle-vendor invitation and relationship management
- Teleops admin portal for platform management

**Weeks 5-8: Designation Management**

- Tenant-driven designation creation system
- Custom permission framework
- User designation assignments with overrides
- Super Admin role implementation

**Weeks 9-12: Equipment Foundation**

- Category → Model equipment hierarchy
- Equipment inventory management
- Project design workflow for dismantling projects
- Equipment selection and specification system

### Phase 2: VLT-Style Operations (10 weeks)

**Weeks 13-16: GPS Verification System**

- VLT-compatible equipment verification workflow
- Mandatory GPS coordinate capture and validation
- Photo upload with GPS metadata preservation
- Category-organized equipment checklists

**Weeks 17-20: Task Management**

- Task creation from projects with equipment inheritance
- VLT-compatible status progression
- Multi-site task support (MW Far-End/Near-End)
- Team assignment and acceptance workflows

**Weeks 21-22: Offline Synchronization**

- Offline equipment verification capabilities
- Conflict resolution based on timestamp
- Real-time synchronization when connectivity restored
- Progress tracking and updates

### Phase 3: Advanced Features (8 weeks)

**Weeks 23-26: Circle Operations**

- Circle-specific billing and revenue tracking
- Multi-circle vendor performance monitoring
- Corporate consolidated reporting across circles
- Circle analytics and business intelligence

**Weeks 27-30: Integration & Optimization**

- Mobile app API optimization
- Performance tuning and caching
- Advanced security implementation
- Production deployment and monitoring

---

## 7. Circle Billing Implementation

### 7.1 Circle-Specific Pricing Engine

```yaml
Circle Billing Configuration:
  Population-Based Pricing:
    MPCG Circle: ₹1.5L/month (150K population base)
    UPE Circle: ₹2L/month (200K population base)
    Gujarat Circle: ₹1.8L/month (180K population base)
    Mumbai Circle: ₹2.2L/month (220K population base)

  Pricing Factors Implementation:
    - Circle population density (stored in circles master data)
    - Active projects per circle (calculated monthly)
    - Circle vendor count (dynamic calculation)
    - Circle operational complexity score (calculated metric)

  Billing Rules Engine:
    - Base subscription per circle (population-based)
    - Usage-based billing for excess volume
    - Premium feature billing (GPS accuracy, advanced analytics)
    - Vendor relationship fees (per active vendor per circle)
```

### 7.2 Circle Billing Database Schema

```sql
-- Circle Billing Configuration
CREATE TABLE circle_billing_config (
    id BIGSERIAL PRIMARY KEY,
    circle_tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Population-Based Pricing
    circle_population INTEGER NOT NULL,
    base_subscription_amount DECIMAL(15,2) NOT NULL,
    population_tier VARCHAR(20) NOT NULL, -- 'Small', 'Medium', 'Large', 'Metro'

    -- Usage Limits
    included_projects INTEGER DEFAULT 10,
    included_vendors INTEGER DEFAULT 5,
    included_users INTEGER DEFAULT 50,

    -- Premium Features
    gps_accuracy_premium BOOLEAN DEFAULT FALSE,
    advanced_analytics_enabled BOOLEAN DEFAULT FALSE,
    api_integration_enabled BOOLEAN DEFAULT FALSE,

    -- Billing Configuration
    billing_frequency VARCHAR(20) DEFAULT 'Monthly',
    billing_cycle_start INTEGER DEFAULT 1, -- Day of month
    currency VARCHAR(10) DEFAULT 'INR',

    -- Status
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (population_tier IN ('Small', 'Medium', 'Large', 'Metro')),
    CHECK (billing_frequency IN ('Monthly', 'Quarterly', 'Annual'))
);

-- Circle Billing Records
CREATE TABLE circle_billing_records (
    id BIGSERIAL PRIMARY KEY,
    circle_tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Billing Period
    billing_period DATE NOT NULL, -- First day of billing period
    billing_cycle VARCHAR(20) NOT NULL,

    -- Subscription Revenue
    base_subscription_amount DECIMAL(15,2) NOT NULL,
    population_tier VARCHAR(20) NOT NULL,

    -- Usage-Based Billing
    projects_count INTEGER DEFAULT 0,
    projects_over_limit INTEGER DEFAULT 0,
    project_overage_amount DECIMAL(15,2) DEFAULT 0,

    vendors_count INTEGER DEFAULT 0,
    vendors_over_limit INTEGER DEFAULT 0,
    vendor_overage_amount DECIMAL(15,2) DEFAULT 0,

    users_count INTEGER DEFAULT 0,
    users_over_limit INTEGER DEFAULT 0,
    user_overage_amount DECIMAL(15,2) DEFAULT 0,

    -- Premium Features
    gps_premium_amount DECIMAL(15,2) DEFAULT 0,
    analytics_premium_amount DECIMAL(15,2) DEFAULT 0,
    api_integration_amount DECIMAL(15,2) DEFAULT 0,

    -- Calculated Totals
    total_subscription DECIMAL(15,2) NOT NULL,
    total_overage DECIMAL(15,2) NOT NULL,
    total_premium DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Tax and Fees
    tax_amount DECIMAL(15,2) DEFAULT 0,
    service_fee DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL,

    -- Billing Status
    billing_status VARCHAR(30) DEFAULT 'Draft',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    invoice_generated_at TIMESTAMP WITH TIME ZONE,
    payment_due_date DATE,
    payment_received_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_by INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(circle_tenant_id, billing_period),
    CHECK (billing_status IN ('Draft', 'Generated', 'Approved', 'Invoiced', 'Paid', 'Overdue'))
);

-- Corporate Consolidated Billing
CREATE TABLE corporate_consolidated_billing (
    id BIGSERIAL PRIMARY KEY,
    corporate_tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Billing Period
    billing_period DATE NOT NULL,

    -- Circle Revenue Summary
    total_circles INTEGER NOT NULL,
    total_base_subscription DECIMAL(15,2) NOT NULL,
    total_overage DECIMAL(15,2) NOT NULL,
    total_premium DECIMAL(15,2) NOT NULL,
    total_circle_revenue DECIMAL(15,2) NOT NULL,

    -- Corporate Fees
    corporate_oversight_fee DECIMAL(15,2) DEFAULT 0,
    consolidated_reporting_fee DECIMAL(15,2) DEFAULT 0,

    -- Final Amounts
    total_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL,

    -- Status
    billing_status VARCHAR(30) DEFAULT 'Draft',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(corporate_tenant_id, billing_period),
    CHECK (billing_status IN ('Draft', 'Generated', 'Approved', 'Invoiced', 'Paid'))
);

-- Circle Billing Details (per circle breakdown)
CREATE TABLE circle_billing_details (
    id BIGSERIAL PRIMARY KEY,
    consolidated_billing_id BIGINT NOT NULL REFERENCES corporate_consolidated_billing(id),
    circle_billing_record_id BIGINT NOT NULL REFERENCES circle_billing_records(id),

    -- Circle Information
    circle_tenant_id UUID NOT NULL REFERENCES tenants(id),
    circle_name VARCHAR(100) NOT NULL,
    circle_code VARCHAR(20) NOT NULL,

    -- Circle Billing Summary
    circle_subscription DECIMAL(15,2) NOT NULL,
    circle_overage DECIMAL(15,2) NOT NULL,
    circle_premium DECIMAL(15,2) NOT NULL,
    circle_total DECIMAL(15,2) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_circle_billing_config_circle ON circle_billing_config(circle_tenant_id);
CREATE INDEX idx_circle_billing_config_effective ON circle_billing_config(effective_from, effective_to);

CREATE INDEX idx_circle_billing_records_circle ON circle_billing_records(circle_tenant_id);
CREATE INDEX idx_circle_billing_records_period ON circle_billing_records(billing_period);
CREATE INDEX idx_circle_billing_records_status ON circle_billing_records(billing_status);

CREATE INDEX idx_corporate_consolidated_billing_corporate ON corporate_consolidated_billing(corporate_tenant_id);
CREATE INDEX idx_corporate_consolidated_billing_period ON corporate_consolidated_billing(billing_period);
```

### 7.3 Circle Billing APIs

```yaml
# Circle Billing Configuration APIs
GET    /api/v1/circles/{circle_code}/billing/config/          # Get circle billing configuration
PUT    /api/v1/circles/{circle_code}/billing/config/          # Update circle billing configuration
POST   /api/v1/circles/{circle_code}/billing/calculate/       # Calculate current billing amounts

# Circle Billing Records APIs
GET    /api/v1/circles/{circle_code}/billing/records/         # Get circle billing history
GET    /api/v1/circles/{circle_code}/billing/current/         # Get current billing period
POST   /api/v1/circles/{circle_code}/billing/generate/        # Generate billing record
PUT    /api/v1/circles/{circle_code}/billing/{id}/approve/    # Approve billing record

# Corporate Consolidated Billing APIs
GET    /api/v1/corporate/{corp_id}/billing/consolidated/      # Get consolidated billing
POST   /api/v1/corporate/{corp_id}/billing/consolidate/       # Generate consolidated billing
GET    /api/v1/corporate/{corp_id}/billing/circles/           # Get per-circle billing breakdown

# Billing Analytics APIs
GET    /api/v1/billing/analytics/revenue-by-circle/          # Revenue analytics by circle
GET    /api/v1/billing/analytics/growth-trends/              # Revenue growth trends
GET    /api/v1/billing/analytics/population-revenue-correlation/ # Population vs revenue analysis
```

### 7.4 Circle Billing Business Logic

```python
class CircleBillingService:
    """Circle-specific billing calculation and management"""

    def calculate_circle_billing(self, circle_tenant_id, billing_period):
        """Calculate billing for specific circle and period"""
        # Get circle billing configuration
        config = CircleBillingConfig.objects.get(
            circle_tenant_id=circle_tenant_id,
            is_active=True
        )

        # Base subscription (population-based)
        base_subscription = config.base_subscription_amount

        # Calculate usage overages
        usage_metrics = self.get_circle_usage_metrics(circle_tenant_id, billing_period)

        project_overage = max(0, usage_metrics['projects_count'] - config.included_projects) * 1000  # ₹1K per extra project
        vendor_overage = max(0, usage_metrics['vendors_count'] - config.included_vendors) * 500    # ₹500 per extra vendor
        user_overage = max(0, usage_metrics['users_count'] - config.included_users) * 100          # ₹100 per extra user

        # Premium features
        premium_amount = 0
        if config.gps_accuracy_premium:
            premium_amount += 5000  # ₹5K for GPS accuracy premium
        if config.advanced_analytics_enabled:
            premium_amount += 10000  # ₹10K for advanced analytics
        if config.api_integration_enabled:
            premium_amount += 3000   # ₹3K for API integration

        # Calculate totals
        total_subscription = base_subscription
        total_overage = project_overage + vendor_overage + user_overage
        total_premium = premium_amount
        total_amount = total_subscription + total_overage + total_premium

        # Tax calculation (18% GST)
        tax_amount = total_amount * 0.18
        final_amount = total_amount + tax_amount

        # Create billing record
        billing_record = CircleBillingRecord.objects.create(
            circle_tenant_id=circle_tenant_id,
            billing_period=billing_period,
            billing_cycle=config.billing_frequency,
            base_subscription_amount=base_subscription,
            population_tier=config.population_tier,
            projects_count=usage_metrics['projects_count'],
            projects_over_limit=max(0, usage_metrics['projects_count'] - config.included_projects),
            project_overage_amount=project_overage,
            vendors_count=usage_metrics['vendors_count'],
            vendors_over_limit=max(0, usage_metrics['vendors_count'] - config.included_vendors),
            vendor_overage_amount=vendor_overage,
            users_count=usage_metrics['users_count'],
            users_over_limit=max(0, usage_metrics['users_count'] - config.included_users),
            user_overage_amount=user_overage,
            gps_premium_amount=5000 if config.gps_accuracy_premium else 0,
            analytics_premium_amount=10000 if config.advanced_analytics_enabled else 0,
            api_integration_amount=3000 if config.api_integration_enabled else 0,
            total_subscription=total_subscription,
            total_overage=total_overage,
            total_premium=total_premium,
            total_amount=total_amount,
            tax_amount=tax_amount,
            final_amount=final_amount,
            billing_status='Generated',
            payment_due_date=billing_period + timedelta(days=30)
        )

        return billing_record

    def generate_corporate_consolidated_billing(self, corporate_tenant_id, billing_period):
        """Generate consolidated billing for corporate across all circles"""
        # Get all circles under corporate
        circles = Tenant.objects.filter(
            parent_tenant_id=corporate_tenant_id,
            tenant_type='Circle',
            is_active=True
        )

        # Calculate billing for each circle
        total_circles = 0
        total_base_subscription = 0
        total_overage = 0
        total_premium = 0
        circle_billing_records = []

        for circle in circles:
            billing_record = self.calculate_circle_billing(circle.id, billing_period)
            circle_billing_records.append(billing_record)

            total_circles += 1
            total_base_subscription += billing_record.base_subscription_amount
            total_overage += billing_record.total_overage
            total_premium += billing_record.total_premium

        total_circle_revenue = total_base_subscription + total_overage + total_premium

        # Corporate-level fees
        corporate_oversight_fee = total_circles * 5000  # ₹5K per circle for corporate oversight
        consolidated_reporting_fee = 15000  # ₹15K for consolidated reporting

        # Calculate final amounts
        total_amount = total_circle_revenue + corporate_oversight_fee + consolidated_reporting_fee
        tax_amount = total_amount * 0.18
        final_amount = total_amount + tax_amount

        # Create consolidated billing record
        consolidated_billing = CorporateConsolidatedBilling.objects.create(
            corporate_tenant_id=corporate_tenant_id,
            billing_period=billing_period,
            total_circles=total_circles,
            total_base_subscription=total_base_subscription,
            total_overage=total_overage,
            total_premium=total_premium,
            total_circle_revenue=total_circle_revenue,
            corporate_oversight_fee=corporate_oversight_fee,
            consolidated_reporting_fee=consolidated_reporting_fee,
            total_amount=total_amount,
            tax_amount=tax_amount,
            final_amount=final_amount,
            billing_status='Generated'
        )

        # Create circle billing details
        for billing_record in circle_billing_records:
            CircleBillingDetail.objects.create(
                consolidated_billing_id=consolidated_billing.id,
                circle_billing_record_id=billing_record.id,
                circle_tenant_id=billing_record.circle_tenant_id,
                circle_name=billing_record.circle_tenant.organization_name,
                circle_code=billing_record.circle_tenant.circle_code,
                circle_subscription=billing_record.base_subscription_amount,
                circle_overage=billing_record.total_overage,
                circle_premium=billing_record.total_premium,
                circle_total=billing_record.total_amount
            )

        return consolidated_billing

    def get_circle_usage_metrics(self, circle_tenant_id, billing_period):
        """Get circle usage metrics for billing period"""
        start_date = billing_period
        end_date = start_date + timedelta(days=32)  # Cover full month

        # Count active projects
        projects_count = Project.objects.filter(
            tenant_id=circle_tenant_id,
            created_at__gte=start_date,
            created_at__lt=end_date,
            is_active=True
        ).count()

        # Count active vendors
        vendors_count = ClientVendorRelationship.objects.filter(
            circle_tenant_id=circle_tenant_id,
            is_active=True
        ).count()

        # Count active users
        users_count = UserProfile.objects.filter(
            tenant_id=circle_tenant_id,
            is_active=True
        ).count()

        return {
            'projects_count': projects_count,
            'vendors_count': vendors_count,
            'users_count': users_count
        }
```

### 7.5 Automated Billing Workflows

```yaml
Monthly Billing Automation:
  Schedule: 1st of every month at 2:00 AM
  Process: 1. Calculate all circle billing records
    2. Generate corporate consolidated billing
    3. Send billing notifications
    4. Create invoices
    5. Update payment due dates
    6. Notify finance team

Billing Notifications:
  Circle Billing Generated:
    - Circle admin notification
    - Finance team notification
    - Executive summary email

  Corporate Consolidated Billing:
    - Corporate admin notification
    - CFO notification
    - Detailed billing breakdown

  Payment Due Reminders:
    - 7 days before due date
    - 3 days before due date
    - Day of due date
    - Overdue notifications (daily)

Payment Processing:
  - Automatic payment collection integration
  - Manual payment recording
  - Payment reconciliation
  - Dunning process for overdue accounts
```

---

## 10. Success Metrics & KPIs

### 10.1 Business Success Metrics

```yaml
Revenue Metrics:
  - Revenue multiplication: 265% average increase per corporate
  - Customer acquisition: 50+ active corporates within 6 months
  - Circle adoption: 95% of corporates use multiple circles
  - Vendor growth: 3x vendor ecosystem expansion

Operational Metrics:
  - Equipment verification accuracy: 98%+
  - GPS photo compliance: 100% for field operations
  - Task completion time: 40% reduction
  - Asset loss reduction: 90% improvement
```

### 10.2 Technical Success Metrics

```yaml
Performance Metrics:
  - API response time: < 200ms for 95% of requests
  - GPS photo upload: < 2s for standard photos
  - Offline sync time: < 30s for full synchronization
  - System uptime: 99.9% availability

User Experience Metrics:
  - User adoption rate: 95% within 3 months
  - Feature utilization: 90% for core features
  - Mobile app rating: 4.5+ stars
  - Support ticket reduction: 70% decrease
```

---

## 11. Risk Mitigation

### 11.1 Technical Risks

| Risk                                | Probability | Impact   | Mitigation                                     |
| ----------------------------------- | ----------- | -------- | ---------------------------------------------- |
| GPS accuracy issues in remote areas | Medium      | High     | Fallback GPS providers, accuracy validation    |
| Multi-tenant data isolation breach  | Low         | Critical | Comprehensive RLS testing, security audits     |
| Offline sync conflicts              | Medium      | Medium   | Robust conflict resolution, user notifications |
| Circle billing complexity           | Medium      | High     | Phased implementation, extensive testing       |

### 11.2 Business Risks

| Risk                           | Probability | Impact | Mitigation                                 |
| ------------------------------ | ----------- | ------ | ------------------------------------------ |
| Circle adoption resistance     | Medium      | High   | Corporate stakeholder engagement, training |
| Vendor ecosystem fragmentation | Medium      | Medium | Unified vendor portal, incentive programs  |
| Competitive response           | High        | Medium | Patent protection, feature differentiation |

---

## 12. Conclusion

The Teleops Circle-Based Multi-Tenant Platform Backend represents a fundamental evolution in telecom infrastructure management, aligning with the reality that circles operate as independent businesses while providing corporate oversight and vendor ecosystem growth. The platform's sophisticated architecture enables revenue multiplication, operational efficiency, and scalable growth while maintaining complete tenant autonomy and data security.

**Key Innovations:**

- **Circle-Based Revenue Model**: 265% revenue increase through multi-circle operations
- **Tenant Autonomy**: Complete organizational freedom with only Super Admin predefined
- **VLT-Style Operations**: GPS-mandatory verification with offline capabilities
- **Multi-Circle Vendor Growth**: 3x vendor opportunities through circle relationships

**Expected ROI:** ₹129.3 Cr by Year 3 with 530+ corporate tenants and comprehensive circle coverage across Indian telecom markets.

---

**Document History:**

- v2.0 - Complete rewrite for Circle-Based Multi-Tenant Platform (December 28, 2024)
- v1.0 - Initial backend requirements (December 2024)

**Next Reviews:**

- Technical Architecture Review (Week 2)
- Security & Compliance Review (Week 4)
- Performance Optimization Review (Week 8)
