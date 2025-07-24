# Project Management: VLT to Teleops Enhancement Summary

## Core Project Architecture

### **Project Structure (Based on VLT)**

```yaml
Required Fields:
  - project_name: string (descriptive project name)
  - project_type: enum (Dismantle, Other) ← NEW FIELD
  - client_id: integer (foreign key to clients)
  - customer_id: integer (foreign key to customers)
  - circle: string (telecom circle/region)
  - activity: string (work description)

System Fields:
  - tenant_id: uuid (multi-tenant isolation)
  - created_by, created_at, updated_at, deleted_at

Project Type Integration:
  - Dismantle projects automatically trigger design phase
  - Other projects follow standard workflow
  - Conditional UI and workflows based on type
```

### **Multi-Tenant Project Management**

```yaml
Client Projects:
  - Clients create projects in their tenant
  - Access to client/customer dropdowns
  - Can associate sites from their master data

Independent Vendor Projects:
  - Vendors create projects in their own tenant
  - Independent client/customer management
  - Use their own site master data
```

---

## Project Type Classification & Design Integration

### **Project Types & Workflows**

```yaml
Dismantle Projects:
  Workflow:
    - Standard project creation with type selection
    - Automatic design phase activation
    - Equipment type selection and specifications
    - Design validation and approval
    - Ready for inventory management phase

  Features:
    - Cross-technology equipment usage
    - Equipment type templates for guidance
    - Equipment specifications and requirements
    - Design approval workflow

Other Projects:
  Workflow:
    - Standard project creation
    - Direct to site management
    - Traditional project operations
    - No design phase required

  Features:
    - Site association and management
    - Standard project workflows
    - Future non-dismantle projects

Conditional Behavior:
  - Project creation form includes type selection
  - Post-creation workflow depends on type
  - UI components show/hide based on type
  - API endpoints handle type-specific logic
```

---

## Key Features from VLT Integration

### 1. **Project Creation Form (VLT-Based)**

```yaml
Form Fields (Matching VLT):
  - Project Name: text input
  - Client: dropdown (API-driven)
  - Customer: dropdown (API-driven)
  - Circle: dropdown (23 Indian telecom circles)
  - Activity: text area description

Validation:
  - All fields required
  - Client/customer existence check
  - Circle from predefined list
  - Project name unique within tenant
```

### 2. **Indian Telecom Circles (VLT Standard)**

```yaml
Complete Circle List:
  - Andhra Pradesh, Assam, Bihar, Chennai, Gujarat
  - Haryana, Himachal Pradesh, Jammu & Kashmir, Karnataka
  - Kerala, Kolkata, Maharashtra & Goa, MP & Chhattisgarh
  - Mumbai, North East, Odisha, Punjab, Rajasthan
  - Tamil Nadu, UP (East), UP (West), West Bengal, Mumbai Corporate
```

### 3. **Project Management Interface**

```yaml
Project Listing (Enhanced VLT):
  Display Fields:
    - Project name (title)
    - Client + Customer (subtitle)
    - Circle badge
    - Site count indicator
    - Activity description preview

  Search & Filter:
    - Text search across name, client, customer, activity
    - Multi-select client/customer filters
    - Circle filtering
    - Date range filtering
    - Site count ranges

  Actions (Permission-Based):
    - Add/Edit/Delete projects
    - View project details
    - Add sites to project
    - Bulk upload sites
```

---

## Enhanced Site Integration Features

### 1. **Project-Site Association**

```yaml
Database Relationship: projects -> project_sites <- sites

Key Features:
  - Many-to-many relationship
  - Sites can belong to multiple projects
  - Tenant isolation maintained
  - Audit trail of associations

Business Logic:
  - Sites must exist in master data first
  - Only same-tenant sites can be associated
  - No duplicate associations within project
  - Automatic site count tracking
```

### 2. **Site Association Methods**

```yaml
Manual Selection:
  - Browse available sites from tenant
  - Filter by cluster, town, search
  - Multi-select with drag-drop
  - Real-time validation

Bulk Upload:
  - Excel template with site master data fields
  - Creates missing sites automatically
  - Associates all sites with project
  - Detailed processing report
```

### 3. **Bulk Site Upload Process**

```yaml
Excel Template:
  Required Columns:
    - SiteID, GlobalID, SiteName, Town, Cluster, Latitude, Longitude

Processing Logic:
  Step 1: Parse and validate Excel data
  Step 2: Check existing sites in master data
  Step 3: Create missing sites in Site Master Data
  Step 4: Associate all sites (existing + new) with project
  Step 5: Provide detailed results report

Benefits:
  - Ensures Site Master Data integrity
  - No orphaned project sites
  - Bulk efficiency for large projects
  - Automatic data validation
```

---

## Technical Implementation

### 1. **Database Schema**

```sql
-- Project Type Enum
CREATE TYPE project_type_enum AS ENUM ('Dismantle', 'Other');

-- Core Projects Table
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Project Information
    project_name VARCHAR(255) NOT NULL,
    project_type project_type_enum NOT NULL DEFAULT 'Other', -- NEW FIELD
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    circle VARCHAR(100) NOT NULL,
    activity TEXT,

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, project_name)
);

-- Supporting tables
clients: id, tenant_id, name
customers: id, tenant_id, name
project_sites: project_id, site_id, added_at, added_by

-- Design Integration Tables (for Dismantle projects)
project_designs: id, project_id, design_status, total_equipment_types_count, design_notes
project_equipment_selections: id, project_id, equipment_id, specifications, is_required

-- Constraints
- Project name unique within tenant
- Circle must be from predefined list
- Client/customer must exist and be active
- Sites must be from same tenant
- Project type determines workflow behavior
```

### 2. **API Architecture**

```yaml
Project Management:
  GET/POST /api/projects/              # List/create projects (includes type)
  GET/PUT/DELETE /api/projects/{id}/   # Project CRUD

Site Association:
  GET /api/projects/{id}/sites/        # List project sites
  POST /api/projects/{id}/sites/       # Add sites manually
  POST /api/projects/{id}/bulk-upload-sites/ # Bulk upload

Design Management (Dismantle Projects Only):
  GET/POST /api/projects/{id}/design/  # Design management
  GET/POST /api/projects/{id}/design/equipment-types/ # Equipment type selection
  POST /api/projects/{id}/design/apply-template/ # Apply equipment type template
  POST /api/projects/{id}/design/validate/ # Design validation
  POST /api/projects/{id}/design/submit-review/ # Submit for review

Supporting APIs:
  GET /api/clients/                    # Client dropdown
  GET /api/customers/                  # Customer dropdown
  GET /api/circles/                    # Circle list
  GET /api/equipment-type-templates/   # Equipment type templates (if Dismantle project)
```

### 3. **Frontend Components (VLT-Style)**

```typescript
interface Project {
  id: number;
  project_name: string;
  project_type: "Dismantle" | "Other"; // NEW FIELD
  client_id: number;
  customer_id: number;
  client_name?: string;
  customer_name?: string;
  circle: string;
  activity: string;
  site_count?: number;
  has_design?: boolean; // For Dismantle projects
  design_status?: "Draft" | "Under Review" | "Approved" | "Locked"; // Design status
}

interface ProjectDesign {
  id: number;
  project_id: number;
  design_status: "Draft" | "Under Review" | "Approved" | "Locked";
  total_equipment_types_count: number;
  design_notes?: string;
}

// Matches VLT component structure with design integration
useProjectManagement() {
  createProject(projectData)
  addSitesToProject(projectId, siteIds)
  bulkUploadSites(projectId, file)
  loadProjects()

  // Design methods for Dismantle projects
  initializeDesign(projectId)
  addEquipmentType(projectId, equipmentData)
  validateDesign(projectId)
  submitDesignForReview(projectId)
}
```

---

## Business Benefits

### 1. **Multi-Tenant Isolation**

- Clean separation between client and vendor projects
- Independent client/customer management per tenant
- Secure site data boundaries
- Scalable for multiple organizations

### 2. **Site Master Data Integration**

- Projects ensure site data exists in master data
- No orphaned or incomplete site records
- Consistent geographic and contact information
- Reusable sites across multiple projects

### 3. **VLT Compatibility**

- Familiar interface for existing VLT users
- Same project structure and workflows
- Proven Indian telecom circle definitions
- Permission-based access control

### 4. **Operational Efficiency**

- Bulk site upload with validation
- Automatic site creation when needed
- Real-time search and filtering
- Project-based work organization

---

## Clarified Project Workflow Integration

```yaml
4-Phase Project Workflow:
  Phase 1: Project Creation
    - Business context establishment
    - Administrative setup
    - No equipment involvement

  Phase 2: Design Phase (Dismantle Projects Only)
    - Equipment category selection (CABINET, CARDS, DXU, etc.)
    - Model selection within categories
    - Equipment specifications definition
    - NO quantities or site allocations [[memory:2745723]]
    - Design approval required

  Phase 3: Site Association & Inventory Management
    - Site selection and association
    - Equipment inventory creation (using approved design)
    - Quantities per category-model per site
    - Site-specific equipment allocations

  Phase 4: Task Creation & Execution
    - Tasks inherit equipment from project site inventory
    - Category-organized verification checklists
    - Mobile app VLT-style verification
    - Equipment verification with GPS tagging

Workflow Dependencies Clarified:
  Dismantle Projects (Full 4-Phase): Project Creation → Design Phase → Site & Inventory → Task Creation
    - Design defines WHAT equipment (categories and models)
    - Inventory defines HOW MUCH and WHERE (quantities per site)
    - Tasks define WHO and WHEN (team assignment and execution)

  Other Projects (Simplified 3-Phase): Project Creation → Site Association → Task Creation
    - Skip design phase for simpler project types
    - Direct project-to-task workflow
    - Equipment defined at task level

Equipment Flow Inheritance:
  - Design: Equipment categories and models selected
  - Inventory: Quantities allocated per site using design template
  - Tasks: Equipment inherited from site inventory with verification workflows
  - Mobile App: Category-based verification checklists generated
```

---

## Implementation Priority

### Phase 1: Core Projects with Type Integration (Immediate)

1. Basic project CRUD with VLT form structure + project_type field
2. Client/customer management
3. Circle dropdown with Indian telecom circles
4. Project listing with search/filter + type filtering
5. Conditional UI based on project type

### Phase 2: Design Integration for Dismantle Projects (Short-term)

1. Design phase initialization for Dismantle projects
2. Equipment type selection interface
3. Equipment type templates
4. Basic design validation and approval

### Phase 3: Site Integration (Medium-term)

1. Manual site selection and association
2. Project-site relationship management
3. Site listing within projects

### Phase 4: Advanced Features (Long-term)

1. Excel template for bulk site upload
2. Site master data validation and creation
3. Bulk processing with error handling
4. Advanced design workflows and reporting

---

This Project Management specification maintains VLT compatibility while adding proper multi-tenancy and site master data integration, creating a solid foundation for task management and work execution workflows.
