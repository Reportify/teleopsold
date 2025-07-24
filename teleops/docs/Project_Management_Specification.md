# Teleops Project Management Specification

## Overview

The Project Management module handles project creation and organization for both clients and independent vendors. Projects serve as containers for sites and provide the business context for telecom infrastructure work. Based on the proven VLT architecture, this module supports multi-tenant project management with integrated site association capabilities.

---

## Business Context

### Project Architecture

```yaml
Projects (Business Context):
  - Project-specific work containers
  - Client and customer context
  - Geographic scope (circle)
  - Activity definition
  - Site associations

Project-Site Relationship:
  - Projects contain multiple sites
  - Sites must exist in master data first
  - Many-to-many relationship (sites can be in multiple projects)
  - Same tenant isolation (project sites from same tenant)
```

### Multi-Tenant Project Management

1. **Client Projects**: Clients create projects for their telecom infrastructure work
2. **Independent Vendor Projects**: Vendors create projects for their own operations
3. **Site Integration**: Projects reference sites from the same tenant's master data
4. **Bulk Site Management**: Add sites to projects via manual selection or bulk upload

---

## Project Data Structure

### Core Project Fields

```yaml
Required Fields:
  - project_name: string (descriptive project name)
  - project_type: enum (Dismantle, Other)
  - client: integer (foreign key to clients table)
  - customer: integer (foreign key to customers table)
  - circle: string (telecom circle/region)
  - activity: string (description of work to be performed)

System Fields:
  - id: bigint (auto-generated primary key)
  - tenant_id: uuid (multi-tenant isolation)
  - created_by: integer (user who created project)
  - created_at: timestamp
  - updated_at: timestamp
  - deleted_at: timestamp (soft delete)

Project-Site Association:
  - project_sites table (many-to-many relationship)
  - Tracks which sites belong to which projects
  - Maintains tenant isolation

Project Design Integration:
  - Dismantle projects automatically trigger design phase
  - Equipment and material allocation workflow
  - Technology-specific dismantling templates
  - Site-specific equipment requirements
```

### Circle Options (Indian Telecom)

```yaml
Predefined Circles:
  - Andhra Pradesh
  - Assam
  - Bihar
  - Chennai
  - Gujarat
  - Haryana
  - Himachal Pradesh
  - Jammu & Kashmir
  - Karnataka
  - Kerala
  - Kolkata
  - Maharashtra & Goa
  - Madhya Pradesh & Chhattisgarh
  - Mumbai
  - North East
  - Odisha
  - Punjab
  - Rajasthan
  - Tamil Nadu
  - UP (East)
  - UP (West)
  - West Bengal
  - Mumbai Corporate
```

---

## Project Creation Features

### 1. Single Project Creation

#### Project Information Form

```yaml
Form Sections:
  Project Details:
    - Project Name: text input (required)
    - Project Type: radio buttons (Dismantle, Other) (required)
    - Activity: text area (required, description of work)

  Business Context:
    - Client: dropdown (from clients API, required)
    - Customer: dropdown (from customers API, required)
    - Circle: dropdown (predefined telecom circles, required)

  Conditional Fields:
    - If Project Type = "Dismantle":
        - Show note: "You will design equipment allocations after creation"
        - Prepare for automatic design phase redirect

Validation Rules:
  - Project name required and non-empty
  - Project type must be selected (Dismantle or Other)
  - Client must be valid and active
  - Customer must be valid and active
  - Circle must be from predefined list
  - Activity description required
  - All dropdowns must have valid selections
```

#### Project Creation Process

```yaml
Creation Workflow:
  Step 1: Form Validation
    - Real-time field validation
    - Client/customer existence check
    - Required field validation
    - Business rule validation
    - Project type selection validation

  Step 2: Project Creation
    - Create project record in tenant database
    - Generate system ID
    - Set initial status
    - Log creation activity

  Step 3: Project Type Handling
    - If project_type = "Dismantle":
      - Initialize project design record
      - Redirect to project design interface
      - Show equipment allocation workflow
    - If project_type = "Other":
      - Display standard project confirmation
      - Option to add sites to project

  Step 4: Post-Creation Options
    - View created project details
    - Add sites to project (for non-dismantle)
    - Design equipment allocations (for dismantle)
    - Create another project
```

### 2. Site Association Features

#### Manual Site Selection

```yaml
Site Selection Interface:
  Available Sites:
    - List sites from same tenant
    - Filter by cluster, town, or search
    - Show site details (ID, name, location)
    - Multi-select capability

  Site Assignment:
    - Drag-and-drop interface
    - Bulk selection checkboxes
    - Real-time site count update
    - Validation for duplicate assignments

Business Logic:
  - Only sites from same tenant can be added
  - Sites can belong to multiple projects
  - No duplicate site assignments within project
  - Maintain audit trail of site associations
```

#### Bulk Site Upload to Project

```yaml
Bulk Upload Process:
  Step 1: Template Download
    - Excel template with required columns
    - Same fields as Site Master Data
    - Sample data for reference
    - Validation rules documentation

  Step 2: File Upload & Validation
    - Upload Excel file with site data
    - Validate against Site Master Data requirements
    - Check for existing sites in master data
    - Preview sites to be created/associated

  Step 3: Site Creation & Association
    - Create missing sites in Site Master Data first
    - Associate all sites (existing + new) with project
    - Maintain referential integrity
    - Provide detailed processing report

Excel Template Columns:
  - SiteID: string (unique within tenant)
  - GlobalID: string (unique within tenant)
  - SiteName: string
  - Town: string
  - Cluster: string
  - Latitude: decimal (-90 to 90)
  - Longitude: decimal (-180 to 180)
```

---

## Project Management Interface

### 1. Project Listing & Search

#### Advanced Filtering System

```yaml
Search Capabilities:
  Text Search:
    - Project name (partial match)
    - Client name (partial match)
    - Customer name (partial match)
    - Activity description (partial match)

  Business Filters:
    - Client dropdown (multi-select)
    - Customer dropdown (multi-select)
    - Circle dropdown (multi-select)
    - Creation date ranges
    - Activity type filtering

  Project Status:
    - Active projects
    - Completed projects
    - Recently created
    - Site count ranges

Sorting Options:
  - Project name (alphabetical)
  - Creation date (recent first)
  - Client name (alphabetical)
  - Site count (high to low)
  - Last updated (recent first)
```

#### Display Modes

```yaml
List View:
  Compact Cards:
    - Project name (title)
    - Client + Customer (subtitle)
    - Circle badge
    - Site count indicator
    - Last updated date

  Detailed Cards:
    - All compact info plus:
    - Activity description preview
    - Creation date and creator
    - Associated site list preview
    - Quick action buttons

Table View:
  - Sortable columns
  - Bulk selection for operations
  - Export functionality (Excel/CSV)
  - Custom column configuration
  - Permission-based action buttons
```

### 2. Project Details Page

#### Project Information Display

```yaml
Information Sections:
  Project Overview:
    - Project name and description
    - Client and customer details
    - Circle and activity information
    - Creation and last update timestamps

  Associated Sites:
    - List of all project sites
    - Site details (ID, name, location)
    - Quick links to site master data
    - Site status within project context

  Project Statistics:
    - Total site count
    - Sites by cluster distribution
    - Geographic coverage map
    - Project timeline and milestones

  Activity History:
    - Project creation log
    - Site association history
    - Modification audit trail
    - User activity tracking

Action Buttons:
  - Edit Project Details
  - Add Sites to Project
  - Bulk Upload Sites
  - Remove Sites from Project
  - Export Project Data
  - Archive Project
```

---

## Database Schema

### 1. Core Tables

```sql
-- Projects Table
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Project Information
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(50) NOT NULL DEFAULT 'Other',
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    circle VARCHAR(100) NOT NULL,
    activity TEXT NOT NULL,

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'active',

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,

    -- Constraints
    UNIQUE(tenant_id, project_name),
    CHECK (project_type IN ('Dismantle', 'Other')),
    CHECK (circle IN ('Andhra Pradesh', 'Assam', 'Bihar', 'Chennai', 'Gujarat',
                      'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Karnataka',
                      'Kerala', 'Kolkata', 'Maharashtra & Goa',
                      'Madhya Pradesh & Chhattisgarh', 'Mumbai', 'North East',
                      'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'UP (East)',
                      'UP (West)', 'West Bengal', 'Mumbai Corporate'))
);

-- Project-Site Association Table
CREATE TABLE project_sites (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

    -- Association Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,

    -- Constraints
    UNIQUE(project_id, site_id)
);

-- Clients Table (Referenced by Projects)
CREATE TABLE clients (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,

    UNIQUE(tenant_id, name)
);

-- Customers Table (Referenced by Projects)
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,

    UNIQUE(tenant_id, name)
);
```

### 2. Indexes for Performance

```sql
-- Project Indexes
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_circle ON projects(circle);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Project-Site Association Indexes
CREATE INDEX idx_project_sites_project ON project_sites(project_id);
CREATE INDEX idx_project_sites_site ON project_sites(site_id);
CREATE INDEX idx_project_sites_added_at ON project_sites(added_at);

-- Client/Customer Indexes
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- Full-text search index for projects
CREATE INDEX idx_projects_search ON projects USING GIN (
    to_tsvector('english',
        COALESCE(project_name, '') || ' ' ||
        COALESCE(activity, '')
    )
);
```

---

## API Endpoints

### Project Management APIs

```yaml
# Core Project CRUD Operations
GET    /api/projects/                    # List tenant's projects with filtering
POST   /api/projects/                    # Create new project (with type handling)
GET    /api/projects/{id}/               # Get project details
PUT    /api/projects/{id}/               # Update project information
DELETE /api/projects/{id}/               # Soft delete project

# Project Type & Design Integration
POST   /api/projects/{id}/initialize-design/ # Initialize design for dismantle projects
GET    /api/projects/{id}/design-status/     # Check if project has design phase

# Project-Site Management
GET    /api/projects/{id}/sites/         # List project's associated sites
POST   /api/projects/{id}/sites/         # Add sites to project (manual selection)
DELETE /api/projects/{id}/sites/{site_id}/ # Remove site from project
POST   /api/projects/{id}/bulk-upload-sites/ # Bulk upload sites to project

# Project Data & Reporting
GET    /api/projects/{id}/statistics/    # Project statistics and metrics
GET    /api/projects/{id}/export/        # Export project data
GET    /api/projects/export/             # Export filtered projects list

# Supporting Data APIs
GET    /api/clients/                     # List available clients
GET    /api/customers/                   # List available customers
GET    /api/circles/                     # List telecom circles

# Search and Filtering
GET    /api/projects/search/             # Advanced project search
POST   /api/projects/validate-name/      # Check project name availability
```

---

## Business Logic Layer

### Project Service

```python
class ProjectService:
    """Core business logic for project management"""

    def create_project(self, project_data, user):
        """Create new project with validation"""
        # Validate project data
        self.validate_project_data(project_data, user.tenant_id)

        # Check project name uniqueness within tenant
        self.validate_project_name(project_data['project_name'], user.tenant_id)

        # Validate client and customer existence
        self.validate_client_customer(
            project_data['client_id'],
            project_data['customer_id'],
            user.tenant_id
        )

        # Create project record
        project = Project.objects.create(
            tenant_id=user.tenant_id,
            **project_data,
            created_by=user
        )

        # Log creation activity
        self.log_project_activity(project, 'created', user)

        return project

    def add_sites_to_project(self, project_id, site_ids, user):
        """Add existing sites to project"""
        project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

        # Validate all sites exist in same tenant
        sites = Site.objects.filter(
            id__in=site_ids,
            tenant_id=user.tenant_id,
            deleted_at__isnull=True
        )

        if len(sites) != len(site_ids):
            raise ValidationError("Some sites not found or not accessible")

        # Create associations (ignore duplicates)
        associations_created = 0
        for site in sites:
            association, created = ProjectSite.objects.get_or_create(
                project=project,
                site=site,
                defaults={'added_by': user}
            )
            if created:
                associations_created += 1

        # Log site additions
        self.log_project_activity(
            project, 'sites_added', user,
            details={'sites_added': associations_created, 'total_sites': len(site_ids)}
        )

        return associations_created

    def bulk_upload_sites_to_project(self, project_id, file_data, user):
        """Process bulk site upload for project"""
        project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

        # Parse and validate Excel file
        df = self.parse_excel_file(file_data)
        validation_results = self.validate_bulk_site_data(df, user.tenant_id)

        sites_created = []
        sites_associated = []

        # Process each row
        for index, row in df.iterrows():
            site_data = self.extract_site_data_from_row(row)

            # Check if site exists in master data
            existing_site = Site.objects.filter(
                tenant_id=user.tenant_id,
                site_id=site_data['site_id'],
                deleted_at__isnull=True
            ).first()

            if existing_site:
                site = existing_site
            else:
                # Create site in master data first
                site = Site.objects.create(
                    tenant_id=user.tenant_id,
                    **site_data,
                    created_by=user
                )
                sites_created.append(site)

            # Associate site with project
            association, created = ProjectSite.objects.get_or_create(
                project=project,
                site=site,
                defaults={'added_by': user}
            )
            if created:
                sites_associated.append(site)

        # Log bulk operation
        self.log_bulk_site_upload(user, project, len(sites_created), len(sites_associated))

        return {
            'sites_created': sites_created,
            'sites_associated': sites_associated,
            'validation_errors': validation_results['errors']
        }

    def validate_project_data(self, project_data, tenant_id):
        """Validate project creation data"""
        required_fields = ['project_name', 'client_id', 'customer_id', 'circle', 'activity']

        for field in required_fields:
            if not project_data.get(field):
                raise ValidationError(f"{field} is required")

        # Validate circle is in predefined list
        valid_circles = [
            'Andhra Pradesh', 'Assam', 'Bihar', 'Chennai', 'Gujarat',
            'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Karnataka',
            'Kerala', 'Kolkata', 'Maharashtra & Goa',
            'Madhya Pradesh & Chhattisgarh', 'Mumbai', 'North East',
            'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'UP (East)',
            'UP (West)', 'West Bengal', 'Mumbai Corporate'
        ]

        if project_data['circle'] not in valid_circles:
            raise ValidationError("Invalid circle selection")

    def validate_client_customer(self, client_id, customer_id, tenant_id):
        """Validate client and customer exist and are accessible"""
        client = Client.objects.filter(
            id=client_id,
            tenant_id=tenant_id,
            deleted_at__isnull=True
        ).first()

        if not client:
            raise ValidationError("Invalid or inaccessible client")

        customer = Customer.objects.filter(
            id=customer_id,
            tenant_id=tenant_id,
            deleted_at__isnull=True
        ).first()

        if not customer:
            raise ValidationError("Invalid or inaccessible customer")

        return client, customer
```

---

## Frontend Components

### Project Management TypeScript Interfaces

```typescript
// Project Management Types
interface Project {
  id: number;
  tenant_id: string;
  project_name: string;
  project_type: "Dismantle" | "Other";
  client_id: number;
  customer_id: number;
  client_name?: string;
  customer_name?: string;
  circle: string;
  activity: string;
  status: string;
  site_count?: number;
  has_design?: boolean;
  design_status?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface CreateProjectRequest {
  project_name: string;
  project_type: "Dismantle" | "Other";
  client_id: number;
  customer_id: number;
  circle: string;
  activity: string;
}

interface ProjectSite {
  id: number;
  project_id: number;
  site_id: number;
  site: Site;
  added_at: string;
  added_by: number;
}

interface Client {
  id: number;
  name: string;
  tenant_id: string;
}

interface Customer {
  id: number;
  name: string;
  tenant_id: string;
}

interface ProjectFilters {
  client_ids?: number[];
  customer_ids?: number[];
  circles?: string[];
  status?: string[];
  created_after?: string;
  created_before?: string;
  site_count_min?: number;
  site_count_max?: number;
}

interface BulkSiteUploadResult {
  sites_created: Site[];
  sites_associated: Site[];
  validation_errors: ValidationError[];
  total_processed: number;
}

// Project Management Hook
export const useProjectManagement = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});

  const createProject = useCallback(async (projectData: CreateProjectRequest) => {
    setLoading(true);
    try {
      const newProject = await projectAPI.create(projectData);
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addSitesToProject = useCallback(async (projectId: number, siteIds: number[]) => {
    try {
      const result = await projectAPI.addSites(projectId, siteIds);
      // Refresh project to update site count
      await loadProjects();
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const bulkUploadSites = useCallback(async (projectId: number, file: File) => {
    setLoading(true);
    try {
      const result = await projectAPI.bulkUploadSites(projectId, file);
      // Refresh projects to update counts
      await loadProjects();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    projects,
    loading,
    filters,
    setFilters,
    createProject,
    addSitesToProject,
    bulkUploadSites,
    loadProjects,
  };
};
```

---

## User Experience Flows

### 1. Project Creation Flow

```yaml
Step 1: Access Project Management
  - Navigate to "Projects" from main dashboard
  - Click "Create Project" button
  - Open project creation form

Step 2: Fill Project Information
  - Enter project name
  - Select client from dropdown
  - Select customer from dropdown
  - Choose telecom circle
  - Describe activity/work scope

Step 3: Validation & Creation
  - Real-time form validation
  - Client/customer verification
  - Project name uniqueness check
  - Submit for creation

Step 4: Post-Creation Options
  - View created project details
  - Add sites to project immediately
  - Create another project
  - Navigate to project management
```

### 2. Site Association Flow

```yaml
Manual Site Selection:
  Step 1: Open Project Details
    - Navigate to specific project
    - Click "Add Sites" button
    - View available sites from tenant

  Step 2: Site Selection
    - Browse available sites
    - Use search and filters
    - Multi-select desired sites
    - Preview selection summary

  Step 3: Association
    - Confirm site selection
    - Process site associations
    - Update project site count
    - View updated project details

Bulk Site Upload:
  Step 1: Download Template
    - Click "Bulk Upload Sites"
    - Download Excel template
    - Review required fields

  Step 2: Prepare Data
    - Fill Excel with site data
    - Include all master data fields
    - Validate data completeness

  Step 3: Upload & Process
    - Upload completed Excel file
    - Review validation results
    - Process site creation and association
    - View detailed results report
```

### 2. Task Management Integration

```yaml
Project-Task Relationship:
  - Tasks created manually from projects by project owners only (Client/Independent Vendor)
  - Contracted vendors cannot create tasks (only assigned to existing tasks)
  - Projects provide context: client/customer, circle, activity
  - Site selection from project sites for task creation
  - Equipment requirements inherited from project inventory
  - Task assignment and execution workflow

Task Creation Process:
  Step 1: Project Prerequisites
    - Project exists with completed design (for dismantling)
    - Sites are associated with project
    - Equipment inventory allocated to project sites
    - Project is in ready state for task creation

  Step 2: Task Creation from Project (Project Owner Only)
    - Project owner (Client/Independent Vendor) selects "Create Task" from project
    - System validates project is ready for task creation
    - Project owner selects specific sites from project for the task
    - System inherits equipment requirements from selected sites
    - Task created with ALLOCATED status (ready for vendor assignment)

  Step 3: Task Assignment and Execution
    - Vendor assigns task to team
    - Team accepts assignment
    - Work execution begins
    - Progress tracked at task level

Complete Workflow Integration: 1. Project Creation → 2. [If Dismantle] Design Phase → 3. Site Association → 4. Inventory Management → 5. Task Creation → 6. Task Assignment → 7. Work Execution
```

### 3. Complete Project Workflow

```yaml
Full Project Lifecycle:
  Phase 1: Project Setup
    - Project creation with type selection
    - Client/customer/circle configuration
    - Activity description and scope definition

  Phase 2: Design & Planning (Dismantling Projects)
    - Equipment type selection (WHAT equipment needed)
    - Technical specifications and requirements
    - Design validation and approval
    - Ready for inventory management

  Phase 3: Site & Inventory Management
    - Site association with project
    - Equipment quantity allocation per site (HOW MUCH)
    - Serial number assignments
    - Site-specific equipment planning

  Phase 4: Task Creation & Assignment
    - Project owners (Client/Independent Vendor) create tasks from project
    - Contracted vendors cannot create tasks (only assigned to existing tasks)
    - Site selection for specific tasks
    - Equipment requirements inherited from project inventory
    - Task assignment to teams

  Phase 5: Work Execution
    - Team acceptance of task assignments
    - On-site work with equipment verification
    - Progress tracking and reporting
    - Quality assurance and completion

Integration Benefits:
  - Consistent project context across all tasks
  - Equipment requirements defined once, inherited by tasks
  - Site master data maintained centrally
  - Complete audit trail from project to completion
```

---

## Integration Points

### 1. Site Master Data Integration

```yaml
Site Validation:
  - All project sites must exist in Site Master Data
  - Bulk upload creates missing sites automatically
  - Maintains referential integrity
  - Ensures data consistency

Data Dependencies:
  - Project site associations reference Site Master Data
  - Site creation follows master data validation rules
  - Geographic clustering maintained through sites
  - Contact information inherited from sites
```

### 2. Equipment Design Integration

```yaml
Design Phase Integration:
  - Dismantling projects trigger automatic design phase
  - Equipment type selection and specification
  - Technical requirements definition
  - Design validation and approval workflow
  - Integration with inventory management phase
```

### 3. Multi-Tenant Security

```yaml
Data Isolation:
  - Projects isolated by tenant
  - Client/customer lists tenant-specific
  - Site associations within tenant only
  - Cross-tenant project visibility restricted

Permission Integration:
  - Role-based project management access
  - Client vs vendor project creation rights
  - Site association permissions
  - Bulk operation restrictions
```

---

## Implementation Roadmap

### Phase 1: Core Project Management (Weeks 1-3)

- Basic project CRUD operations
- Client and customer management
- Project creation form with validation
- Project listing with search/filter
- Permission-based access control

### Phase 2: Site Association (Weeks 4-5)

- Manual site selection and association
- Project-site relationship management
- Site listing within projects
- Association audit trail

### Phase 3: Bulk Operations (Weeks 6-7)

- Excel template for bulk site upload
- Bulk validation and processing
- Site master data integration
- Error handling and reporting

### Phase 4: Advanced Features (Weeks 8-9)

- Advanced filtering and search
- Project statistics and analytics
- Export functionality
- Mobile responsiveness
- Performance optimization

---

This specification provides the foundation for implementing Project Management in Teleops, building on the VLT architecture while adding proper multi-tenancy and site master data integration. Projects serve as the business context containers that will enable task management and work execution workflows.

## Project Workflow Sequence

The Teleops platform implements a structured **4-Phase Project Workflow** that ensures systematic project execution from initial creation through task completion:

### **Phase 1: Project Creation**

**Purpose**: Establish project context and business framework

```yaml
Project Creation Scope:
  Business Context:
    - Project name and description
    - Client and customer identification
    - Project type (Dismantle, Installation, Maintenance, Survey)
    - Geographic scope (telecom circle)
    - Timeline and business objectives

  Administrative Setup:
    - Project manager assignment
    - Initial team identification
    - Budget and contract framework
    - Stakeholder identification

  Key Outputs:
    - Project registered in system
    - Business context established
    - Ready for design phase (Dismantle projects only)
    - Ready for site association (other project types)

  No Equipment Involved:
    - No equipment selection or specification
    - No quantities or allocations
    - Pure business and administrative setup
```

### **Phase 2: Design Phase (Dismantle Projects Only)**

**Purpose**: Define WHAT equipment categories and models are needed [[memory:2745723]]

```yaml
Design Phase Scope:
  Equipment Category Selection:
    - Browse equipment categories (CABINET, CARDS, DXU, PSU, etc.)
    - Select relevant categories for dismantling project
    - Define category-specific requirements
    - Document equipment specifications

  Model Selection within Categories:
    - Select specific models within each category
    - Define model-specific requirements
    - Add custom models if needed
    - Document model specifications and requirements

  Design Validation:
    - Review selected category-model combinations
    - Validate equipment specifications
    - Approve design for implementation
    - Design sign-off by stakeholders

  Critical Design Constraints:
    - NO quantities defined in design phase
    - NO site-specific allocations
    - NO equipment inventory creation
    - Focus purely on WHAT equipment, not HOW MUCH

  Key Outputs:
    - Approved equipment category-model combinations
    - Equipment specifications per model
    - Design approved and ready for inventory phase
    - Blueprint for inventory management

  Design Inheritance:
    - Equipment categories and models flow to inventory phase
    - Specifications guide quantity allocation
    - Design serves as template for site-specific inventory
```

### **Phase 3: Site Association & Inventory Management**

**Purpose**: Define WHERE and HOW MUCH - site allocation and equipment quantities

```yaml
Site Association Scope:
  Site Selection and Association:
    - Browse and select sites for project
    - Associate sites with project context
    - Validate site master data
    - Create project-site relationships

  Equipment Inventory Creation (Dismantle Projects):
    - Takes approved design as input (category-model combinations)
    - Allocate quantities per category-model per site
    - Create site-specific equipment inventory
    - Define equipment verification requirements per site

  Inventory Management Benefits:
    - Inherits equipment structure from design phase
    - Focuses on quantities and site-specific allocation
    - Creates actionable inventory for task creation
    - Maintains design integrity while adding operational detail

  Key Outputs:
    - Sites associated with project
    - Site-specific equipment inventory (Dismantle projects)
    - Equipment quantities allocated per site
    - Ready for task creation and execution

  Inventory Inheritance:
    - Equipment types from design phase
    - Site-specific quantities and allocations
    - Equipment flows to task creation
    - Verification requirements per equipment item
```

### **Phase 4: Task Creation & Execution**

**Purpose**: Create executable work orders with equipment inheritance

```yaml
Task Creation Scope:
  Task Generation:
    - Create tasks from approved projects
    - Select sites from project site associations
    - Inherit equipment from project site inventory
    - Define task scope and requirements

  Equipment Inheritance:
    - Tasks automatically inherit equipment from project inventory
    - Site-specific equipment allocations included
    - Category-model-quantity combinations per task
    - Verification requirements inherited from design

  Team Assignment & Execution:
    - Assign tasks to field teams
    - Team acceptance workflow
    - Mobile app equipment verification
    - Progress tracking and completion

  Key Outputs:
    - Executable tasks with complete equipment context
    - Field teams with verification checklists
    - Equipment verification workflow active
    - Progress tracking and reporting enabled

Workflow Integration Benefits:
  - Design defines WHAT equipment (categories and models)
  - Inventory defines HOW MUCH and WHERE (quantities per site)
  - Tasks define WHO and WHEN (team assignment and execution)
  - Clear separation of concerns across phases
  - Equipment context flows seamlessly through all phases
```

---

## Project Type Workflows

### **Dismantle Project Workflow**

**Full 4-Phase Workflow Required**

```yaml
Dismantle Project Sequence:
  Phase 1: Project Creation
    - Business context and administrative setup
    - Client identification and project scope
    - No equipment involved at this stage

  Phase 2: Design Phase (Mandatory)
    - Equipment category selection (CABINET, CARDS, etc.)
    - Model selection within categories (RBS-2964, EDRU 9P-03, etc.)
    - Equipment specifications and requirements
    - NO quantities or site allocations
    - Design approval required before proceeding

  Phase 3: Site Association & Inventory
    - Site selection and association
    - Equipment quantities allocated per site using approved design
    - Site-specific inventory created from design template
    - Quantities per category-model per site defined

  Phase 4: Task Creation & Execution
    - Tasks inherit equipment from site inventory
    - Category-organized verification checklists
    - Mobile app VLT-style verification workflow
    - Equipment verification with GPS tagging

Design Phase Benefits for Dismantle:
  - Systematic equipment planning before site work
  - Standardized equipment verification checklists
  - Consistent dismantling scope across sites
  - Equipment verification workflow optimization
```

### **Other Project Workflows**

**Simplified 3-Phase Workflow**

```yaml
Installation/Maintenance/Survey Projects:
  Phase 1: Project Creation
    - Business context and administrative setup
    - Project scope and objectives defined

  Phase 2: Site Association (Direct)
    - Skip design phase (no complex equipment planning needed)
    - Direct site selection and association
    - Simple project-site relationships

  Phase 3: Task Creation & Execution
    - Tasks created from project sites
    - Equipment defined at task level (simpler scope)
    - Standard task execution workflow

Workflow Simplification Benefits:
  - Faster project setup for simpler work types
  - Reduced administrative overhead
  - Direct path from project to task execution
  - Appropriate complexity for project type
```
