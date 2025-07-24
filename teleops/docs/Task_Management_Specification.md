# Teleops Task Management Specification

## Overview

The Task Management module handles work assignment and execution for dismantling projects. This module supports both **single-site tasks** (2G, 3G) and **multi-site tasks** (MW far-end/near-end coordination), implementing a **task-centric architecture** where tasks drive workflow and sites provide metadata context.

---

## Business Context

### Task Architecture

```yaml
Task Definition:
  - Work unit referencing one or more sites for dismantling
  - Created manually by Client/Independent Vendor from projects with completed inventory
  - Assigned to teams for execution
  - Tracked through status workflow until completion

Multi-Site Support:
  MW Projects:
    - Task references 2 sites: Far-end (Site A) + Near-end (Site B)
    - Coordinated dismantling across both locations
    - Single task progress tracking for entire work unit
    - Sites remain independent metadata containers

  2G/3G Projects:
    - Task references 1 site: Single location dismantling
    - Standard workflow and progress tracking
    - Site remains independent metadata container

Site-Task Relationship Architecture:
  - Tasks REFERENCE sites (do not contain them)
  - Sites are pure metadata containers (location, access info)
  - Sites have no operational status or assignment tracking
  - Sites are created once and referenced by multiple tasks
  - Task status is tracked at task level, not site level

Task Lifecycle: 1. Project Creation and Design (equipment types defined)
  2. Site Association (sites added to project)
  3. Inventory Management (equipment quantities allocated to project sites)
  4. Task Creation (Client/Independent Vendor creates task from project, selects sites)
  5. Team Assignment (Vendor assigns team to task)
  6. Assignment Acceptance (team accepts the task)
  7. Work Execution (on-site activities)
  8. Progress Tracking (task-level completion)
  9. Task Completion (all required work completed)
  10. Quality Review & Closure
```

### Integration with Existing Modules

```yaml
Project Integration:
  - Tasks created manually from projects with completed inventory
  - Equipment requirements inherited from project site inventory
  - Project context (client, customer, circle) carried forward

Site Integration:
  - Task creation includes site selection from project sites
  - Tasks reference sites through task-site relationship table
  - Sites provide location metadata and access information
  - Multi-site tasks coordinate work across referenced locations
  - Sites remain pure metadata containers (no operational state)
  - Site master data is independent of task lifecycle
  - Multiple tasks can reference the same site at different times

Inventory Integration:
  - Task equipment requirements inherited from project site inventory
  - Site-specific equipment allocations provide work context
  - Serial number tracking and verification at task level

Team Integration:
  - Tasks assigned to teams (not individual users)
  - Team-based access control and notifications
  - Assignment transfer capabilities between teams
```

---

## Task Data Structure

### Core Task Fields

```yaml
Required Fields:
  - task_name: string (descriptive task name)
  - task_type: enum (Dismantling_Single_Site, Dismantling_Multi_Site_MW, Non_Dismantling)
  - project_id: bigint (reference to project)
  - client_id: integer (inherited from project)
  - customer_id: integer (inherited from project)
  - activity: text (work description from project)
  - priority: enum (Low, Medium, High, Critical)
  - estimated_duration_hours: integer

Task Creation Context:
  - created_from: enum (Project_Task_Creation) # Manual creation from project by project owner
  - created_by: integer (project owner: client/independent vendor who created task)
  - creation_date: timestamp (when task was created)
  - selected_sites: array (sites selected from project for this task)

Task Creation Authority:
  - Client Tenants: Can create tasks from their own projects
  - Independent Vendor Tenants: Can create tasks from projects they own
  - Contracted Vendors: CANNOT create tasks (can only be assigned existing tasks)
  - Corporate Tenants: Cannot create tasks (oversight role only)

Status Management:
  - status: enum (ALLOCATED, ASSIGNING, ASSIGNED, WIP, DONE, PARTIALLY_DONE, IN_ISSUE, DEALLOCATED)
  - progress_percentage: decimal (0-100, single source of truth)
  - assigned_team_id: integer (current assigned team, initially NULL)
  - assignment_date: timestamp (when team assigned)
  - start_date: timestamp (when work began)
  - completion_date: timestamp (when task completed)

Multi-Site Coordination:
  - requires_coordination: boolean (true for MW tasks)
  - coordination_notes: text (special instructions)
  - site_completion_order: json (required sequence if applicable)
  - sites_count: integer (number of sites in task)

Task Context (Referenced from Related Entities):
  - site_references: array (site IDs referenced by this task)
  - site_details: object (location, access, safety information fetched from site master data)
  - project_details: object (client, customer, activity context from project)
  - planned_inventory: array (equipment allocated to referenced sites in project)
  - assignment_details: object (team assignment information)
  - timeline: array (task events and status changes)

Site Metadata Access:
  - Task accesses site information through references
  - Site data remains in site master data tables
  - Task queries site information when needed
  - No duplication of site data in task records

System Fields:
  - id: bigint (auto-generated primary key)
  - tenant_id: uuid (multi-tenant isolation)
  - created_at: timestamp
  - updated_at: timestamp
  - deleted_at: timestamp (soft delete)
```

### Task-Site Reference Architecture

```yaml
Task-Site Relationship Table (task_site_references):
  - id: bigint (primary key)
  - task_id: bigint (reference to tasks table)
  - site_id: bigint (reference to sites table)
  - site_role: enum (Primary, Far_End, Near_End) ← For MW coordination
  - sequence_order: integer (execution order within task)
  - estimated_duration_hours: integer (site-specific estimate)
  - work_instructions: text (site-specific notes)
  - created_at: timestamp
  - updated_at: timestamp

Sites Table (Pure Metadata Container):
  - site_id: bigint (primary key)
  - site_name: string (site identifier)
  - location_details: object (GPS, address, access info)
  - contact_information: object (site contacts)
  - safety_requirements: text (safety protocols)
  - access_instructions: text (site access details)
  - No progress tracking fields
  - No status fields
  - No assignment fields
  - No operational state

Tasks Table (Operational State Container):
  - task_id: bigint (primary key)
  - task_name: string
  - status: enum (operational workflow status)
  - progress_percentage: decimal (task progress)
  - assigned_team_id: integer (team assignment)
  - All operational and workflow fields

Architectural Benefits:
  - Clear separation of concerns
  - Sites reusable across multiple tasks
  - Site metadata independent of task lifecycle
  - Task progress tracked at appropriate level
  - No data duplication between sites and tasks

MW Task Example:
  Task ID: 1001
  References:
    - Site A (ID: 501): site_role=Far_End, sequence_order=1
    - Site B (ID: 502): site_role=Near_End, sequence_order=2
  Progress: Single task-level progress (0-100%)
  Site Data: Fetched from sites table when needed

2G/3G Task Example:
  Task ID: 1002
  References:
    - Site C (ID: 503): site_role=Primary, sequence_order=1
  Progress: Single task-level progress (0-100%)
  Site Data: Fetched from sites table when needed
```

### Task Assignment System

```yaml
Assignment Model:
  - assignment_id: bigint (unique assignment identifier)
  - task_id: bigint (reference to task)
  - team_id: integer (assigned team)
  - assignment_type: enum (Initial, Transfer, Reassignment)
  - assigned_by: integer (user who made assignment)
  - assigned_at: timestamp
  - accepted_by: integer (team member who accepted)
  - accepted_at: timestamp
  - status: enum (Pending, Accepted, In_Progress, Completed, Cancelled)
  - transfer_reason: text (if reassigned to different team)
  - estimated_start_date: timestamp
  - actual_start_date: timestamp

Assignment Transfer:
  - Original assignment marked as 'Transferred'
  - New assignment created with transfer_reason
  - Audit trail maintained for accountability
  - Team notifications for both old and new teams
```

---

## Task Status Workflow

### Status Definitions

```yaml
ALLOCATED:
  - Task manually created by Client/Independent Vendor from project
  - Client/vendor selected specific sites from project for this task
  - Contains all site details, project context, and planned inventory from selected sites
  - No team assigned yet (assigned_team_id = NULL)
  - Awaiting vendor to assign team

ASSIGNING:
  - Vendor has assigned task to a team
  - Team notified and can view all task details
  - Team can accept or request reassignment
  - Timeout mechanism for unaccepted assignments

ASSIGNED:
  - Team has accepted the task assignment
  - Team can view all task details:
    * Site information and locations (from site master data)
    * Project details and context
    * Planned inventory and equipment (from project site inventory)
    * Work instructions and requirements
  - Pre-work planning and preparation phase
  - Ready to start on-site work

WIP (Work In Progress):
  - Team has started on-site work
  - Progress tracking and regular updates
  - Work happening at any of the task's sites
  - Team updates progress based on current location

DONE:
  - All required work completed successfully
  - Quality checks passed
  - Documentation submitted and approved

PARTIALLY_DONE:
  - Some work completed, other work incomplete
  - Used for tasks requiring partial completion tracking
  - Requires follow-up action plan

IN_ISSUE:
  - Task encountered problems requiring intervention
  - Work may be paused pending resolution
  - Escalation to management required

DEALLOCATED:
  - Task removed from team assignment
  - Work discontinued or cancelled
  - Inventory and resources released
```

### Status Transitions

```yaml
Valid Transitions: ALLOCATED → ASSIGNING (task assigned to team)
  ASSIGNING → ASSIGNED (team accepts assignment)
  ASSIGNING → ALLOCATED (assignment rejected/timeout)
  ASSIGNED → WIP (work starts)
  WIP → DONE (all work completed)
  WIP → PARTIALLY_DONE (partial completion)
  WIP → IN_ISSUE (problems encountered)
  PARTIALLY_DONE → WIP (resuming incomplete work)
  PARTIALLY_DONE → DONE (completing remaining work)
  IN_ISSUE → WIP (issues resolved, work resumes)
  IN_ISSUE → DEALLOCATED (task cancelled due to issues)
  Any Status → DEALLOCATED (administrative cancellation)

Progress Management:
  - Task progress updated directly (no site-level aggregation)
  - Mobile app updates task progress based on current location
  - Progress reflects overall completion of work requirements
  - Sites provide context for where work is happening
```

---

## Multi-Site Task Coordination

### MW Project Task Structure

```yaml
MW Dismantling Task Components:
  Task Level (Work Unit):
    - Overall task coordination and management
    - Single progress tracking (0-100%)
    - Single status (WIP means work happening at any site)
    - Team assignment and scheduling
    - Equipment requirements across all sites

  Site A (Far-End Metadata):
    - Location data: coordinates, access instructions
    - Equipment allocation: what equipment is at this site
    - Work context: site-specific requirements
    - NO progress tracking, NO status fields

  Site B (Near-End Metadata):
    - Location data: coordinates, access instructions
    - Equipment allocation: what equipment is at this site
    - Work context: site-specific requirements
    - NO progress tracking, NO status fields

  Coordination Approach:
    - Team manages work sequence across sites
    - Task progress reflects overall completion
    - Sites provide location context and equipment data
    - Mobile app filters equipment by current location
```

### Work Coordination Workflow

```yaml
Multi-Site Work Coordination:
  Step 1: Task Assignment
    - Entire MW task assigned to single team
    - Team responsible for coordinating work across sites
    - Unified assignment and acceptance process

  Step 2: Work Planning
    - Team plans work sequence across sites
    - Uses site metadata for planning (location, equipment)
    - Determines resource allocation strategy

  Step 3: Mobile Execution
    - Team opens task in mobile app
    - Selects current location (Site A or Site B)
    - App filters equipment/work by current site
    - Updates task progress based on work completed

  Step 4: Task Completion
    - All required work completed across all sites
    - Task marked as DONE (single completion event)
    - Quality review covers entire task scope
```

---

## Database Schema

### Core Task Tables

```sql
-- Tasks Table
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Task Information
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'Single_Site',
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium',

    -- Status Management (Single Source of Truth)
    status VARCHAR(50) NOT NULL DEFAULT 'ALLOCATED',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,

    -- Duration Estimates
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,

    -- Multi-Site Coordination
    requires_coordination BOOLEAN DEFAULT false,
    coordination_notes TEXT,
    site_completion_order JSONB,
    sites_count INTEGER DEFAULT 1,

    -- Timestamps
    assignment_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CHECK (task_type IN ('Single_Site', 'Multi_Site_MW')),
    CHECK (status IN ('ALLOCATED', 'ASSIGNING', 'ASSIGNED', 'WIP', 'DONE', 'PARTIALLY_DONE', 'IN_ISSUE', 'DEALLOCATED')),
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Task-Site Relationships (Metadata Links Only)
CREATE TABLE task_sites (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

    -- Site Role in Task
    site_role VARCHAR(50) NOT NULL DEFAULT 'Primary',
    sequence_order INTEGER NOT NULL DEFAULT 1,

    -- Site-Specific Context
    estimated_duration_hours INTEGER,
    work_instructions TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(task_id, site_id),
    CHECK (site_role IN ('Primary', 'Far_End', 'Near_End'))
);

-- Task Assignments
CREATE TABLE task_assignments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Assignment Details
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'Initial',
    assigned_by INTEGER NOT NULL REFERENCES auth_user(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Acceptance Tracking
    accepted_by INTEGER REFERENCES auth_user(id),
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Status and Transfer
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    transfer_reason TEXT,
    previous_assignment_id INTEGER REFERENCES task_assignments(id),

    -- Date Management
    estimated_start_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (assignment_type IN ('Initial', 'Transfer', 'Reassignment')),
    CHECK (status IN ('Pending', 'Accepted', 'In_Progress', 'Completed', 'Cancelled', 'Transferred'))
);

-- Task Timeline (VLT Compatible)
CREATE TABLE task_timeline (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- VLT Compatible Fields
    allocation_id INTEGER REFERENCES allocations(id),
    assignment_id INTEGER REFERENCES task_assignments(id),
    allocation_type VARCHAR(100),
    assignment_type VARCHAR(100),
    team_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remarks TEXT,
    updated_by INTEGER REFERENCES auth_user(id),

    -- Additional Context
    task_site_id INTEGER REFERENCES task_sites(id),
    metadata JSONB,

    -- Indexes
    INDEX(task_id, timestamp),
    INDEX(assignment_id),
    INDEX(status)
);

-- Sites Table (Pure Metadata - No Workflow Fields)
CREATE TABLE sites (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Site Metadata Only
    global_id VARCHAR(255) UNIQUE,
    site_id VARCHAR(255),
    site_name VARCHAR(255),
    town VARCHAR(255),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    planned_activity TEXT,
    access_instructions TEXT,
    safety_notes TEXT,

    -- NO status field
    -- NO current_assignment field
    -- NO progress fields

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_team ON task_assignments(team_id);
CREATE INDEX idx_task_sites_task ON task_sites(task_id);
CREATE INDEX idx_task_timeline_task_timestamp ON task_timeline(task_id, timestamp);
```

### Performance Indexes

```sql
-- Task Indexes
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_assignment_date ON tasks(assignment_date);
CREATE INDEX idx_tasks_completion_date ON tasks(completion_date);

-- Task-Site Indexes
CREATE INDEX idx_task_sites_task ON task_sites(task_id);
CREATE INDEX idx_task_sites_site ON task_sites(site_id);

-- Assignment Indexes
CREATE INDEX idx_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_assignments_team ON task_assignments(team_id);
CREATE INDEX idx_assignments_status ON task_assignments(status);
CREATE INDEX idx_assignments_assigned_at ON task_assignments(assigned_at);

-- Timeline Indexes
CREATE INDEX idx_timeline_task ON task_timeline(task_id);
CREATE INDEX idx_timeline_status ON task_timeline(status);
CREATE INDEX idx_timeline_timestamp ON task_timeline(timestamp);
CREATE INDEX idx_timeline_assignment ON task_timeline(assignment_id);
CREATE INDEX idx_timeline_allocation ON task_timeline(allocation_id);

-- Equipment Verification Tables
CREATE TABLE task_equipment_verification (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

    -- Equipment Information (Tenant-Created Categories)
    equipment_category_id BIGINT NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
    equipment_model_id BIGINT NOT NULL REFERENCES equipment_models(id) ON DELETE CASCADE,
    planned_serial_number VARCHAR(255),

    -- Verification Status
    verification_status VARCHAR(50) NOT NULL DEFAULT 'Not_Started',
    is_found BOOLEAN, -- null = not verified, true = found, false = not found
    actual_serial_number VARCHAR(255),
    serial_number_match BOOLEAN,
    not_found_reason VARCHAR(255),
    condition_assessment TEXT,
    verification_notes TEXT,

    -- GPS Location (Mandatory with Accuracy Requirements)
    gps_coordinates POINT,
    gps_accuracy DECIMAL(8,2), -- meters (acceptable: ≤10m, target: ≤5m)
    gps_captured_at TIMESTAMP WITH TIME ZONE,

    -- Verification Metadata
    verified_by INTEGER REFERENCES auth_user(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints (Updated for Tenant-Created Categories)
    CHECK (verification_status IN ('Not_Started', 'In_Progress', 'Completed')),
    UNIQUE(task_id, site_id, equipment_category_id, equipment_model_id)
);

-- Equipment Verification Photos
CREATE TABLE task_equipment_verification_photos (
    id BIGSERIAL PRIMARY KEY,
    verification_id BIGINT NOT NULL REFERENCES task_equipment_verification(id) ON DELETE CASCADE,

    -- Photo Information
    photo_filename VARCHAR(255) NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    photo_type VARCHAR(50) NOT NULL, -- 'equipment_found', 'equipment_condition', 'site_overview', 'not_found_area'

    -- GPS Information (Mandatory with Accuracy Requirements)
    gps_coordinates POINT NOT NULL,
    gps_accuracy DECIMAL(8,2), -- meters (acceptable: ≤10m, target: ≤5m)
    gps_captured_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Photo Metadata
    file_size BIGINT,
    image_width INTEGER,
    image_height INTEGER,
    exif_data JSONB,

    -- Audit Fields
    uploaded_by INTEGER REFERENCES auth_user(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (photo_type IN ('equipment_found', 'equipment_condition', 'site_overview', 'not_found_area'))
);

-- Equipment Verification Indexes
CREATE INDEX idx_equipment_verification_task ON task_equipment_verification(task_id);
CREATE INDEX idx_equipment_verification_site ON task_equipment_verification(site_id);
-- Index removed - use equipment_category_id index below
CREATE INDEX idx_equipment_verification_category_id ON task_equipment_verification(equipment_category_id);
CREATE INDEX idx_equipment_verification_model_id ON task_equipment_verification(equipment_model_id);
CREATE INDEX idx_equipment_verification_status ON task_equipment_verification(verification_status);
CREATE INDEX idx_equipment_verification_found ON task_equipment_verification(is_found);
CREATE INDEX idx_equipment_verification_verified_at ON task_equipment_verification(verified_at);

-- Equipment Verification Photos Indexes
CREATE INDEX idx_equipment_photos_verification ON task_equipment_verification_photos(verification_id);
CREATE INDEX idx_equipment_photos_type ON task_equipment_verification_photos(photo_type);
CREATE INDEX idx_equipment_photos_uploaded_at ON task_equipment_verification_photos(uploaded_at);
```

---

## API Endpoints

### Task Management APIs

```yaml
# Core Task Operations
GET    /api/tasks/                      # List tasks with filtering
GET    /api/tasks/{id}/                 # Get task details with all sites
PUT    /api/tasks/{id}/                 # Update task information
DELETE /api/tasks/{id}/                 # Soft delete task

# Task Creation (Manual from Project)
POST   /api/projects/{id}/create-task/  # Client/vendor creates task from project
POST   /api/projects/{id}/tasks/        # Alternative endpoint for task creation
GET    /api/projects/{id}/task-ready/   # Check if project is ready for task creation

# Task Assignment Management
POST   /api/tasks/{id}/assign/          # Vendor assigns task to team
POST   /api/tasks/{id}/accept/          # Team accepts task assignment
POST   /api/tasks/{id}/transfer/        # Transfer task to different team
POST   /api/tasks/{id}/deallocate/      # Remove task assignment

# Task Status Management
POST   /api/tasks/{id}/start/           # Team starts task work (moves to WIP)
POST   /api/tasks/{id}/complete/        # Mark task as completed
POST   /api/tasks/{id}/report-issue/    # Report task issue
POST   /api/tasks/{id}/resolve-issue/   # Resolve task issue

# Task Details for Team View
GET    /api/tasks/{id}/details/         # Get complete task details (sites, project, inventory, assignment, timeline)
GET    /api/tasks/{id}/sites/           # Get all sites in task with metadata
GET    /api/tasks/{id}/current-location/ # Get current work location context

# Task Progress and Reporting
GET    /api/tasks/{id}/progress/        # Get task progress information
GET    /api/tasks/{id}/timeline/        # Get task timeline/audit trail
PUT    /api/tasks/{id}/progress/        # Update task progress
POST   /api/tasks/{id}/update-progress/ # Submit progress update with location context

# Task Filtering and Search
GET    /api/tasks/by-team/{team_id}/    # Get tasks assigned to specific team
GET    /api/tasks/by-status/{status}/   # Get tasks by status
GET    /api/tasks/search/               # Advanced task search with filters

# Task Content Access (Inherited from Project)
GET    /api/tasks/{id}/project-details/ # Get project context information
GET    /api/tasks/{id}/planned-inventory/ # Get equipment allocated to task sites (from project)
GET    /api/tasks/{id}/assignment-details/ # Get current assignment information

# Mobile App Integration
GET    /api/tasks/{id}/mobile-context/  # Get mobile app context (current location, equipment, etc.)
GET    /api/tasks/{id}/dismantling/     # Get dismantling work details for mobile app

# Reporting and Analytics
GET    /api/tasks/statistics/           # Task completion statistics
GET    /api/tasks/team-workload/        # Team workload analysis
GET    /api/tasks/export/               # Export task data
```

### Key API Workflow Examples

```yaml
# Client/Vendor Task Creation Workflow
1. GET /api/projects/{id}/task-ready/
   # Check if project has completed design and inventory

2. POST /api/projects/{id}/create-task/
   # Create task from project with site selection
   # Body: {
   #   "task_name": "MW Dismantling - North Region",
   #   "site_ids": [123, 456],
   #   "priority": "High",
   #   "estimated_duration_hours": 48
   # }

3. GET /api/tasks/{id}/details/
   # View created task with inherited inventory and site details

# Team Task Management Workflow
1. GET /api/tasks/by-team/{team_id}/
   # Returns tasks assigned to team (status: ASSIGNING, ASSIGNED, WIP)

2. GET /api/tasks/{id}/details/
   # Team views complete task details:
   # - Sites and locations (from site master data)
   # - Project context
   # - Planned inventory (from project site inventory)
   # - Assignment information
   # - Timeline/audit trail

3. POST /api/tasks/{id}/accept/
   # Team accepts assignment (ASSIGNING → ASSIGNED)

4. POST /api/tasks/{id}/start/
   # Team starts work (ASSIGNED → WIP)

5. PUT /api/tasks/{id}/progress/
   # Team updates progress during work

6. POST /api/tasks/{id}/complete/
   # Task completion (WIP → DONE)

# Vendor Task Assignment Workflow
1. GET /api/tasks/?status=ALLOCATED
   # Vendor sees unassigned tasks (created by clients/vendors)

2. POST /api/tasks/{id}/assign/
   # Vendor assigns task to team (ALLOCATED → ASSIGNING)

3. GET /api/tasks/{id}/timeline/
   # Monitor assignment status and team acceptance
```

---

## Business Logic Layer

### Task Service

```python
class TaskService:
    """Core business logic for task management"""

    def create_task_from_project(self, project_id, task_data, creating_user):
        """Client/Independent Vendor creates task from project with site selection"""
        # This is triggered when client/vendor decides to create work task from project
        project = Project.objects.get(id=project_id, tenant_id=creating_user.tenant_id)

        # Validate project has completed inventory
        if not self.validate_project_ready_for_tasks(project):
            raise ValidationError("Project must have completed inventory to create tasks")

        # Get selected sites for task (from task_data)
        selected_site_ids = task_data.get('site_ids', [])
        if not selected_site_ids:
            raise ValidationError("Must select at least one site for task")

        # Validate selected sites exist in project or can be added
        validated_sites = self.validate_and_prepare_sites(project, selected_site_ids, creating_user)

        # Determine task type based on project and selected sites
        site_count = len(validated_sites)
        task_type = self.determine_task_type(project, site_count)

        # Generate task name
        task_name = task_data.get('task_name', f"{project.name} - {site_count} Site{'s' if site_count > 1 else ''}")

        # Create task record
        task = Task.objects.create(
            tenant_id=creating_user.tenant_id,
            task_name=task_name,
            task_type=task_type,
            project_id=project_id,
            activity=project.activity,
            priority=task_data.get('priority', 'Medium'),
            estimated_duration_hours=task_data.get('estimated_duration_hours'),
            created_from='Project_Task_Creation',
            created_by=creating_user,
            creation_date=timezone.now(),
            requires_coordination=(task_type == 'Dismantling_Multi_Site_MW'),
            sites_count=site_count,
            status='ALLOCATED',  # Initially no team assigned
            assigned_team_id=None  # No team assigned yet
        )

        # Create task-site relationships
        self.create_task_site_relationships(task, validated_sites, task_type)

        # Log task creation
        self.log_task_event(
            task, 'ALLOCATED',
            f'Task created from project by {creating_user.get_full_name()} with {site_count} sites',
            creating_user
        )

        return task

    def validate_project_ready_for_tasks(self, project):
        """Validate project is ready for task creation"""
        # Check if project has sites
        if not project.sites.exists():
            return False

        # For dismantling projects, check if design and inventory are complete
        if project.project_type == 'Dismantle':
            # Check design is approved
            design = getattr(project, 'design', None)
            if not design or design.design_status != 'Approved':
                return False

            # Check inventory exists
            inventory_count = ProjectSiteEquipmentAllocation.objects.filter(
                project=project
            ).count()
            if inventory_count == 0:
                return False

        return True

    def validate_and_prepare_sites(self, project, site_ids, user):
        """Validate sites exist or can be added to project and master data"""
        validated_sites = []

        for site_id in site_ids:
            # Check if site exists in master data
            site = Site.objects.filter(
                Q(id=site_id) | Q(site_id=site_id),
                tenant_id=user.tenant_id,
                deleted_at__isnull=True
            ).first()

            if site:
                # Site exists in master data
                # Check if it's associated with project
                if not project.sites.filter(id=site.id).exists():
                    # Add site to project
                    project.sites.add(site)

                validated_sites.append(site)
            else:
                # Site doesn't exist - would need to be created
                # This would require additional site data in task_data
                raise ValidationError(f"Site {site_id} not found in master data")

        return validated_sites

    def determine_task_type(self, project, site_count):
        """Determine task type based on project characteristics and site count"""

        # Check if it's a dismantling project
        if project.project_type == 'Dismantle':
            # For dismantling projects, determine if single or multi-site
            if site_count == 2 and 'MW' in project.activity.upper():
                return 'Dismantling_Multi_Site_MW'
            else:
                return 'Dismantling_Single_Site'
        else:
            return 'Non_Dismantling'

    def create_task_site_relationships(self, task, validated_sites, task_type):
        """Create task-site relationships based on task type"""

        if task_type in ['Dismantling_Single_Site', 'Non_Dismantling']:
            # Single site task
            for i, site in enumerate(validated_sites):
                TaskSite.objects.create(
                    task=task,
                    site=site,
                    site_role='Primary',
                    sequence_order=i + 1,
                    work_instructions=f"Work at {site.site_name}"
                )

        elif task_type == 'Dismantling_Multi_Site_MW':
            # Multi-site MW task - assign Far_End and Near_End roles
            if len(validated_sites) != 2:
                # If not exactly 2 sites, treat as multiple single-site tasks
                for i, site in enumerate(validated_sites):
                    TaskSite.objects.create(
                        task=task,
                        site=site,
                        site_role='Primary',
                        sequence_order=i + 1,
                        work_instructions=f"MW work at {site.site_name}"
                    )
            else:
                # Create proper Far_End and Near_End relationships
                TaskSite.objects.create(
                    task=task,
                    site=validated_sites[0],
                    site_role='Far_End',
                    sequence_order=1,
                    work_instructions=f"MW Far-End work at {validated_sites[0].site_name}"
                )

                TaskSite.objects.create(
                    task=task,
                    site=validated_sites[1],
                    site_role='Near_End',
                    sequence_order=2,
                    work_instructions=f"MW Near-End work at {validated_sites[1].site_name}"
                )

    def assign_task_to_team(self, task_id, team_id, assigned_by_user, estimated_start_date=None):
        """Vendor assigns task to team"""
        task = Task.objects.get(id=task_id, tenant_id=assigned_by_user.tenant_id)

        if task.status != 'ALLOCATED':
            raise ValidationError("Task must be in ALLOCATED status to assign")

        # Check if team exists and is active
        team = Team.objects.get(id=team_id, tenant_id=assigned_by_user.tenant_id)

        # Create assignment record
        assignment = TaskAssignment.objects.create(
            task=task,
            team=team,
            assignment_type='Initial',
            assigned_by=assigned_by_user,
            estimated_start_date=estimated_start_date,
            status='Pending'
        )

        # Update task status and assignment
        task.status = 'ASSIGNING'
        task.assigned_team_id = team_id
        task.assignment_date = timezone.now()
        task.save()

        # Log assignment
        self.log_task_event(
            task, 'ASSIGNING',
            f"Task assigned to team {team.name} by {assigned_by_user.get_full_name()}",
            assigned_by_user,
            assignment_id=assignment.id,
            team_name=team.name
        )

        return assignment

    def accept_task_assignment(self, task_id, accepting_user):
        """Team member accepts task assignment"""
        task = Task.objects.get(id=task_id, tenant_id=accepting_user.tenant_id)

        if task.status != 'ASSIGNING':
            raise ValidationError("Task must be in ASSIGNING status to accept")

        # Get current assignment
        assignment = TaskAssignment.objects.filter(
            task=task,
            status='Pending'
        ).first()

        if not assignment:
            raise ValidationError("No pending assignment found for this task")

        # Verify user is member of assigned team
        if not self.user_is_team_member(accepting_user, assignment.team):
            raise ValidationError("You can only accept assignments for your own team")

        # Update assignment
        assignment.accepted_by = accepting_user
        assignment.accepted_at = timezone.now()
        assignment.status = 'Accepted'
        assignment.save()

        # Update task status
        task.status = 'ASSIGNED'
        task.save()

        # Log acceptance
        self.log_task_event(
            task, 'ASSIGNED',
            f"Assignment accepted by {accepting_user.get_full_name()}",
            accepting_user,
            assignment_id=assignment.id,
            team_name=assignment.team.name
        )

        return assignment

    def start_task_work(self, task_id, starting_user):
        """Start task work (moves to WIP)"""
        task = Task.objects.get(id=task_id, tenant_id=starting_user.tenant_id)

        if task.status != 'ASSIGNED':
            raise ValidationError("Task must be ASSIGNED to start work")

        # Verify user is member of assigned team
        current_assignment = task.current_assignment
        if not self.user_is_team_member(starting_user, current_assignment.team):
            raise ValidationError("You can only start work for your assigned team")

        # Update task and assignment
        task.status = 'WIP'
        task.start_date = timezone.now()
        task.save()

        current_assignment.status = 'In_Progress'
        current_assignment.actual_start_date = timezone.now()
        current_assignment.save()

        # Log work start
        self.log_task_event(
            task, 'WIP',
            f"Work started by {starting_user.get_full_name()}",
            starting_user,
            assignment_id=current_assignment.id,
            team_name=current_assignment.team.name
        )

        return task

    def update_task_progress(self, task_id, progress_data, updating_user, current_site_id=None):
        """Update task progress based on work completion"""
        task = Task.objects.get(id=task_id, tenant_id=updating_user.tenant_id)

        # Verify user is member of assigned team
        current_assignment = task.current_assignment
        if not self.user_is_team_member(updating_user, current_assignment.team):
            raise ValidationError("You can only update progress for your assigned team")

        # Update task progress
        if 'progress_percentage' in progress_data:
            task.progress_percentage = progress_data['progress_percentage']

        if 'actual_duration_hours' in progress_data:
            task.actual_duration_hours = progress_data['actual_duration_hours']

        # Auto-complete task if 100% progress
        if task.progress_percentage >= 100 and task.status == 'WIP':
            task.status = 'DONE'
            task.completion_date = timezone.now()

        task.save()

        # Log progress update
        site_context = ""
        if current_site_id:
            site = Site.objects.get(id=current_site_id)
            site_context = f" at {site.site_name}"

        self.log_task_event(
            task, task.status,
            f"Progress updated to {task.progress_percentage}%{site_context}",
            updating_user,
            assignment_id=current_assignment.id,
            team_name=current_assignment.team.name
        )

        return task

    def complete_task(self, task_id, completing_user):
        """Complete entire task"""
        task = Task.objects.get(id=task_id, tenant_id=completing_user.tenant_id)

        if task.status != 'WIP':
            raise ValidationError("Task must be in WIP status to complete")

        # Verify user is member of assigned team
        current_assignment = task.current_assignment
        if not self.user_is_team_member(completing_user, current_assignment.team):
            raise ValidationError("You can only complete tasks for your assigned team")

        # Update task status
        task.status = 'DONE'
        task.progress_percentage = 100.00
        task.completion_date = timezone.now()
        task.save()

        # Update assignment status
        current_assignment.status = 'Completed'
        current_assignment.save()

        # Log completion
        self.log_task_event(
            task, 'DONE',
            f"Task completed by {completing_user.get_full_name()}",
            completing_user,
            assignment_id=current_assignment.id,
            team_name=current_assignment.team.name
        )

        return task

    def transfer_task(self, task_id, new_team_id, transfer_reason, transferring_user):
        """Transfer task to different team"""
        task = Task.objects.get(id=task_id, tenant_id=transferring_user.tenant_id)

        if task.status not in ['ASSIGNING', 'ASSIGNED']:
            raise ValidationError("Can only transfer tasks in ASSIGNING or ASSIGNED status")

        # Get current assignment
        current_assignment = TaskAssignment.objects.filter(
            task=task,
            status__in=['Pending', 'Accepted']
        ).first()

        if not current_assignment:
            raise ValidationError("No active assignment found to transfer")

        # Mark current assignment as transferred
        current_assignment.status = 'Transferred'
        current_assignment.save()

        # Create new assignment
        new_team = Team.objects.get(id=new_team_id, tenant_id=transferring_user.tenant_id)
        new_assignment = TaskAssignment.objects.create(
            task=task,
            team=new_team,
            assignment_type='Transfer',
            assigned_by=transferring_user,
            transfer_reason=transfer_reason,
            previous_assignment=current_assignment,
            status='Pending'
        )

        # Update task status back to ASSIGNING
        task.status = 'ASSIGNING'
        task.save()

        # Log transfer
        self.log_task_event(
            task, 'ASSIGNING',
            f"Task transferred to team {new_team.name}: {transfer_reason}",
            transferring_user,
            assignment_id=new_assignment.id,
            team_name=new_team.name
        )

        return new_assignment

    def get_task_details_for_team(self, task_id, requesting_user):
        """Get complete task details for team to view"""
        task = Task.objects.get(id=task_id, tenant_id=requesting_user.tenant_id)

        # Verify user is member of assigned team
        if not self.user_is_team_member(requesting_user, task.assigned_team_id):
            raise ValidationError("You can only view details for your assigned tasks")

        # Get all task components
        task_details = {
            'task': task,
            'sites': self.get_task_sites(task),
            'site_details': self.get_site_details(task),
            'project_details': self.get_project_details(task),
            'planned_inventory': self.get_planned_inventory(task),
            'assignment_details': self.get_assignment_details(task),
            'timeline': self.get_task_timeline(task)
        }

        return task_details

    def get_task_sites(self, task):
        """Get all sites in task with metadata"""
        return TaskSite.objects.filter(task=task).select_related('site')

    def get_site_details(self, task):
        """Get detailed site information"""
        task_sites = TaskSite.objects.filter(task=task).select_related('site')
        return [
            {
                'site_id': ts.site.id,
                'site_name': ts.site.site_name,
                'location': {
                    'latitude': ts.site.latitude,
                    'longitude': ts.site.longitude,
                    'town': ts.site.town
                },
                'access_instructions': ts.site.access_instructions,
                'safety_notes': ts.site.safety_notes,
                'planned_activity': ts.site.planned_activity,
                'site_role': ts.site_role,
                'work_instructions': ts.work_instructions
            }
            for ts in task_sites
        ]

    def get_project_details(self, task):
        """Get project context information"""
        project = task.project
        return {
            'project_name': project.name,
            'client_name': project.client.name if project.client else None,
            'customer_name': project.customer.name if project.customer else None,
            'circle': project.circle,
            'activity': project.activity
        }

    def get_planned_inventory(self, task):
        """Get equipment allocated to task sites (inherited from project inventory)"""
        task_sites = TaskSite.objects.filter(task=task)
        site_ids = [ts.site_id for ts in task_sites]

        # Get equipment allocations from project inventory for task sites
        inventory = ProjectSiteEquipmentAllocation.objects.filter(
            project_id=task.project_id,
            site_id__in=site_ids
        ).select_related('equipment')

        # Group by site for task context
        inventory_by_site = {}
        for allocation in inventory:
            site_id = allocation.site_id
            if site_id not in inventory_by_site:
                inventory_by_site[site_id] = []

            # Get serial assignments for this allocation
            serial_assignments = ProjectEquipmentSerialAssignment.objects.filter(
                allocation=allocation
            )

            inventory_by_site[site_id].append({
                'allocation_id': allocation.id,
                'equipment_id': allocation.equipment.id,
                'equipment_name': allocation.equipment.equipment_name,
                'equipment_type': allocation.equipment.equipment_type,
                'planned_quantity': allocation.planned_quantity,
                'equipment_notes': allocation.equipment_notes,
                'serial_assignments': [
                    {
                        'serial_number': sa.serial_number,
                        'equipment_name': sa.equipment_name,
                        'manufacturer': sa.manufacturer,
                        'model': sa.model,
                        'notes': sa.notes
                    }
                    for sa in serial_assignments
                ],
                'specifications': allocation.equipment.specifications if hasattr(allocation.equipment, 'specifications') else {}
            })

        return inventory_by_site

    def get_assignment_details(self, task):
        """Get current assignment information"""
        assignment = TaskAssignment.objects.filter(
            task=task,
            status__in=['Pending', 'Accepted', 'In_Progress']
        ).select_related('team', 'assigned_by').first()

        if not assignment:
            return None

        return {
            'assignment_id': assignment.id,
            'team_name': assignment.team.name,
            'assigned_by': assignment.assigned_by.get_full_name(),
            'assigned_at': assignment.assigned_at,
            'accepted_by': assignment.accepted_by.get_full_name() if assignment.accepted_by else None,
            'accepted_at': assignment.accepted_at,
            'status': assignment.status
        }

    def get_task_timeline(self, task):
        """Get task timeline/audit trail"""
        return TaskTimeline.objects.filter(task=task).order_by('-timestamp')

    def log_task_event(self, task, status, remarks, user, **kwargs):
        """Log task event to timeline (VLT compatible structure)"""
        # Get team name for display
        team_name = kwargs.get('team_name')
        if not team_name and kwargs.get('assignment_id'):
            assignment = TaskAssignment.objects.get(id=kwargs.get('assignment_id'))
            team_name = assignment.team.name

        TaskTimeline.objects.create(
            task=task,
            # VLT compatible fields
            allocation_id=kwargs.get('assignment_id'),  # Map assignment to allocation for compatibility
            assignment_id=kwargs.get('assignment_id'),
            allocation_type=kwargs.get('allocation_type', 'task_assignment'),
            assignment_type=kwargs.get('assignment_type', 'team_assignment'),
            team_name=team_name,
            status=status,
            remarks=remarks,
            updated_by=user.get_full_name() or user.username,  # Store as string

            # Multi-site task specific fields
            site_id=kwargs.get('site_id'),
            task_site_id=kwargs.get('task_site_id'),
            metadata=kwargs.get('metadata', {})
        )

    def user_is_team_member(self, user, team):
        """Check if user is member of team"""
        return (team.team_leader == user.id or
                user.id in team.members)
```

---

## Frontend Integration

### TypeScript Interfaces

```typescript
// Task Management Types
interface Task {
  id: number;
  tenant_id: string;
  task_name: string;
  task_type: "Single_Site" | "Multi_Site_MW";
  project_id: number;
  project_name?: string;
  client_name?: string;
  customer_name?: string;
  activity: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: TaskStatus;

  // Progress Tracking (Single Source of Truth)
  progress_percentage: number;

  // Duration
  estimated_duration_hours?: number;
  actual_duration_hours?: number;

  // Multi-Site Coordination
  requires_coordination: boolean;
  coordination_notes?: string;
  site_completion_order?: any;

  // Timestamps
  assignment_date?: string;
  start_date?: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;

  // Related Data
  sites?: TaskSite[];
  current_assignment?: TaskAssignment;
  timeline?: TaskTimelineEvent[];
}

interface TaskSite {
  id: number;
  task_id: number;
  site_id: number;
  site: Site;
  site_role: "Primary" | "Far_End" | "Near_End";
  sequence_order: number;
  estimated_duration_hours?: number;
  work_instructions?: string;
}

interface TaskAssignment {
  id: number;
  task_id: number;
  team_id: number;
  team: Team;
  assignment_type: "Initial" | "Transfer" | "Reassignment";
  assigned_by: number;
  assigned_at: string;
  accepted_by?: number;
  accepted_at?: string;
  status: "Pending" | "Accepted" | "In_Progress" | "Completed" | "Cancelled" | "Transferred";
  transfer_reason?: string;
  previous_assignment_id?: number;
  estimated_start_date?: string;
  actual_start_date?: string;
}

interface TaskTimelineEvent {
  // VLT Compatible Structure (matches existing TaskDetail.tsx)
  allocation_id?: number;
  assignment_id?: number;
  allocation_type?: string;
  assignment_type?: string;
  team_name?: string;
  status: string;
  timestamp: string;
  remarks: string;
  updated_by: string;

  // Additional fields for multi-site task support
  site_id?: number;
  task_site_id?: number;
  metadata?: any;
}

type TaskStatus = "ALLOCATED" | "ASSIGNING" | "ASSIGNED" | "WIP" | "DONE" | "PARTIALLY_DONE" | "IN_ISSUE" | "DEALLOCATED";

interface CreateTaskRequest {
  project_id: number;
  task_name?: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  estimated_duration_hours?: number;
}

interface AssignTaskRequest {
  team_id: number;
  estimated_start_date?: string;
}

interface TransferTaskRequest {
  new_team_id: number;
  transfer_reason: string;
}

interface UpdateTaskProgressRequest {
  progress_percentage?: number;
  actual_duration_hours?: number;
  current_site_id?: number; // Context for where work is happening
}

// Task Management Hooks
export const useTaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});

  const createTaskFromProject = useCallback(async (projectId: number, taskData: CreateTaskRequest) => {
    setLoading(true);
    try {
      const newTask = await taskAPI.createFromProject(projectId, taskData);
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignTask = useCallback(async (taskId: number, assignmentData: AssignTaskRequest) => {
    try {
      const assignment = await taskAPI.assign(taskId, assignmentData);
      await loadTasks(); // Refresh to get updated status
      return assignment;
    } catch (error) {
      throw error;
    }
  }, []);

  const acceptAssignment = useCallback(async (taskId: number) => {
    try {
      const result = await taskAPI.acceptAssignment(taskId);
      await loadTasks(); // Refresh to get updated status
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const startTask = useCallback(async (taskId: number) => {
    try {
      const result = await taskAPI.startWork(taskId);
      await loadTasks(); // Refresh to get updated status
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const updateSiteProgress = useCallback(async (taskId: number, siteId: number, progressData: UpdateSiteProgressRequest) => {
    try {
      const result = await taskAPI.updateSiteProgress(taskId, siteId, progressData);
      await loadTasks(); // Refresh to get updated progress
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const transferTask = useCallback(async (taskId: number, transferData: TransferTaskRequest) => {
    try {
      const result = await taskAPI.transferTask(taskId, transferData);
      await loadTasks(); // Refresh to get updated assignment
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const getTaskDetails = useCallback(async (taskId: number) => {
    try {
      return await taskAPI.getDetails(taskId);
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    tasks,
    loading,
    filters,
    setFilters,
    createTaskFromProject,
    assignTask,
    acceptAssignment,
    startTask,
    updateSiteProgress,
    transferTask,
    getTaskDetails,
    loadTasks,
  };
};

// Multi-Site Task Hook
export const useMultiSiteTask = (taskId: number) => {
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTaskDetails = useCallback(async () => {
    setLoading(true);
    try {
      const details = await taskAPI.getDetails(taskId);
      setTaskDetails(details);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const updateSiteProgress = useCallback(
    async (siteId: number, progressData: UpdateSiteProgressRequest) => {
      try {
        const result = await taskAPI.updateSiteProgress(taskId, siteId, progressData);
        await loadTaskDetails(); // Refresh task details
        return result;
      } catch (error) {
        throw error;
      }
    },
    [taskId, loadTaskDetails]
  );

  const completeSite = useCallback(
    async (siteId: number) => {
      try {
        const result = await taskAPI.completeSite(taskId, siteId);
        await loadTaskDetails(); // Refresh task details
        return result;
      } catch (error) {
        throw error;
      }
    },
    [taskId, loadTaskDetails]
  );

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!taskDetails?.sites) return 0;
    const totalProgress = taskDetails.sites.reduce((sum, site) => sum + site.completion_percentage, 0);
    return totalProgress / taskDetails.sites.length;
  }, [taskDetails?.sites]);

  // Check if all sites are completed
  const allSitesCompleted = useMemo(() => {
    if (!taskDetails?.sites) return false;
    return taskDetails.sites.every((site) => site.completion_percentage >= 100);
  }, [taskDetails?.sites]);

  return {
    taskDetails,
    loading,
    overallProgress,
    allSitesCompleted,
    loadTaskDetails,
    updateSiteProgress,
    completeSite,
  };
};
```

---

## Equipment Verification Workflow (VLT-Style)

### Equipment Verification Data Structure

```yaml
Task Equipment Verification:
  - Equipment inherited from project design (categories and models)
  - Site-specific equipment allocations from project inventory
  - Category-organized verification workflow
  - VLT-compatible verification states and workflow

Equipment Verification Record:
  - task_id: bigint (reference to task)
  - site_id: bigint (reference to site within task)
  - equipment_category: string (CABINET, CARDS, DXU, PSU, etc.)
  - equipment_model: string (specific model within category)
  - planned_serial_number: string (optional - from project inventory)
  - verification_status: enum (Not_Started, In_Progress, Completed)
  - is_found: boolean (null = not verified, true = found, false = not found)
  - actual_serial_number: string (found equipment serial number)
  - serial_number_match: boolean (planned vs actual serial comparison)
  - not_found_reason: string (reason if equipment not found)
  - condition_assessment: string (physical condition of found equipment)
  - verification_notes: text (additional notes)
  - verified_by: integer (team member who verified)
  - verified_at: timestamp (verification timestamp)
  - gps_coordinates: point (GPS location of verification)
  - verification_photos: array (photos with GPS metadata)
```

### Equipment Categories and Models (VLT-Based)

```yaml
Equipment Category Structure:
  CABINET:
    - Models: [RBS-2964, RBS-2954, RBS-2204, RBS-2202, RBS-2106, RBS-2101]
    - Serial Required: Yes
    - Verification Priority: High

  CARDS:
    - Models: [EDRU 9P-03, EDRU 9P-01, DTRU, DRU-900]
    - Serial Required: Yes
    - Verification Priority: High

  DXU:
    - Models: [DXU-31, DXU-23, DXU-21]
    - Serial Required: Yes
    - Verification Priority: High

  PSU:
    - Models: [PSU-DC-32, PSU-AC-31]
    - Serial Required: Yes
    - Verification Priority: Medium

  IDM:
    - Models: [IDM13, IDM15, IDM14, IDM12]
    - Serial Required: Optional
    - Verification Priority: Medium

  FCU:
    - Models: [FCU]
    - Serial Required: No
    - Verification Priority: Low

  DCCU:
    - Models: [DCCU]
    - Serial Required: No
    - Verification Priority: Low

  PAU:
    - Models: [PAU]
    - Serial Required: Optional
    - Verification Priority: Medium

  CXU:
    - Models: [CXU]
    - Serial Required: Optional
    - Verification Priority: Medium

  OTHER:
    - Models: [Custom models from project design]
    - Serial Required: Configurable
    - Verification Priority: Low
```

### Equipment Verification Workflow

```yaml
Verification Process:
  Step 1: Equipment Discovery
    - Mobile app displays category-organized equipment checklist
    - Equipment items inherited from project design and inventory
    - Site-specific equipment allocations
    - Equipment grouped by tenant-created category for systematic verification

  Step 2: Equipment Verification
    - Found/Not Found selection (mandatory)
    - Serial number entry (if found and required)
    - Serial number matching validation
    - Condition assessment (if found)
    - GPS location capture
    - Photo documentation with GPS metadata

  Step 3: Not Found Handling
    - Select reason from predefined list:
      * "Not Found" - Equipment completely missing
      * "Used by BSS" - Equipment in use by base station
      * "Engaged with other Technology" - Equipment repurposed
      * "Post RFI" - Equipment status pending RFI response
      * "Others" - Custom reason with text input
    - Additional notes and documentation

  Step 4: Verification Completion
    - Equipment verification status updated
    - Task progress calculation
    - Offline sync capability
    - Real-time progress updates
```

### Equipment Verification States

```yaml
Equipment Verification States:
  Not_Started:
    - Equipment not yet verified
    - Initial state for all equipment
    - Verification can begin

  In_Progress:
    - Equipment verification started
    - Partial information entered
    - Verification can be completed later

  Completed:
    - Equipment verification finished
    - All required information provided
    - Contributes to task completion

Equipment Found/Not Found Logic:
  Found Equipment:
    - is_found = true
    - Serial number verification (if required)
    - Condition assessment
    - GPS location and photos
    - Verification notes

  Not Found Equipment:
    - is_found = false
    - Select not found reason
    - Additional notes
    - GPS location of search area
    - Photos of search area (optional)
    - Does not block task completion

  Not Verified:
    - is_found = null
    - Equipment not yet checked
    - Verification pending
    - Blocks task completion if required
```

### Serial Number Verification

```yaml
Serial Number Workflow:
  Serial Number Required:
    - Tenant-configured categories with mandatory serial verification
    - Tenant determines which categories require serial numbers
    - Verification blocked until serial entered

  Serial Number Optional:
    - Tenant-configured categories with optional serial verification
    - Tenant determines which categories allow optional serials
    - Verification allowed without serial

  Serial Number Not Required:
    - Tenant-configured categories without serial verification
    - Tenant determines which categories need no serial numbers
    - Verification based on Found/Not Found only

  Serial Number Matching:
    - Compare planned vs actual serial numbers
    - Exact match validation
    - Mismatch flagging and reporting
    - Corrected serial number capture
```

### GPS Photo Tagging

```yaml
GPS Photo Requirements:
  Mandatory GPS Tagging:
    - All equipment verification photos must include GPS coordinates
    - GPS location captured at time of photo
    - Location accuracy validation
    - GPS metadata embedded in photo

  Photo Types:
    - Equipment found photos (with GPS)
    - Equipment condition photos (with GPS)
    - Site overview photos (with GPS)
    - Not found area photos (with GPS)

  GPS Data Structure:
    - latitude: decimal degrees
    - longitude: decimal degrees
    - accuracy: meters
    - timestamp: UTC timestamp
    - altitude: meters (optional)

  GPS Validation:
    - Minimum accuracy threshold
    - Location within expected site boundary
    - GPS signal strength validation
    - Offline GPS caching capability
```

### Mobile App Equipment Verification

```yaml
Mobile Equipment Verification Interface:
  Category-Based Organization:
    - Equipment organized by tenant-created category (e.g., CABINET, ANTENNA, RADIO, etc.)
    - Tenant-configured category-specific verification requirements
    - Model selection within tenant categories
    - Progress tracking per tenant category

  Verification Workflow: 1. Select equipment category
    2. Select specific model within category
    3. Mark as Found/Not Found
    4. Enter serial number (if required and found)
    5. Assess condition (if found)
    6. Take GPS-tagged photos
    7. Add verification notes
    8. Submit verification

  Offline Capability:
    - Equipment verification data cached locally
    - Photo storage with GPS metadata
    - Progress tracking offline
    - Auto-sync when connectivity restored
    - Conflict resolution for concurrent edits

  Real-Time Sync:
    - Verification status updates
    - Progress synchronization
    - Team collaboration features
    - Conflict detection and resolution
```

### Equipment Verification Conflict Resolution

```yaml
Conflict Resolution Logic:
  Team Member Conflicts:
    - Same task, different team members verify same equipment
    - Latest timestamp wins (as per VLT logic)
    - Previous verification overwritten
    - Activity log maintained for audit

  Offline Sync Conflicts:
    - Equipment verified offline by multiple team members
    - Server-side conflict detection
    - Latest verification timestamp priority
    - Conflict notification to team
    - Audit trail preservation

  Equipment State Conflicts:
    - Equipment marked as both found and not found
    - Serial number conflicts (different actuals)
    - Photo conflicts (different GPS locations)
    - Resolution based on most recent verification
```

### Task Completion Logic (VLT-Compatible)

```yaml
Task Completion Calculation:
  Equipment Verification Impact:
    - Found equipment: Counts toward completion
    - Not found equipment: Does not block completion
    - Not verified equipment: Blocks completion

  Progress Calculation:
    - Total equipment items in task
    - Verified equipment count (found + not found)
    - Progress percentage = (verified / total) * 100
    - Task can be marked DONE by any team member

  Completion Requirements:
    - No minimum percentage required
    - All equipment verified (found or not found)
    - No blocking on not found equipment
    - Team member can mark task as DONE at any time

  VLT-Compatible Logic:
    - "Not Found" equipment does not impact task completion
    - Task completion independent of equipment found percentage
    - Focus on verification completeness, not equipment recovery
    - Team-based completion authority
```

    return taskDetails.sites.every((site) => site.individual_status === "Completed");

}, [taskDetails?.sites]);

useEffect(() => {
loadTaskDetails();
}, [loadTaskDetails]);

return {
taskDetails,
loading,
overallProgress,
allSitesCompleted,
updateSiteProgress,
completeSite,
loadTaskDetails,
};
};

````

---

## Integration with Existing VLT System

### Backward Compatibility

```yaml
Current VLT Site-Based Tasks → New Task-Based System
  VLT Current Flow:
    - Each site treated as individual task
    - Site assignment to teams
    - Status: ALLOCATED → ASSIGNING → ASSIGNED → WIP → DONE

  New Task System Flow:
    - Tasks contain one or more sites
    - Task assignment to teams
    - Same status workflow maintained
    - Multi-site coordination added

  Migration Strategy:
    - Existing sites become single-site tasks
    - Current assignments migrate to task assignments
    - Timeline data preserved and extended
    - Mobile app APIs enhanced to support multi-site

  Data Migration:
    - Create Task records for each existing site
    - Migrate current_assignment to task_assignments table
    - Preserve existing timeline as task_timeline
    - Maintain all existing site data integrity
````

### Mobile App Integration

```yaml
Mobile App Enhancements Required:

# Task Selection Screen (Enhanced Tasks.tsx)
Multi-Site Task Display:
  - Show task name with site count indicator
  - "MW Dismantling (2 sites)" vs "3G Dismantling (1 site)"
  - Overall task progress percentage
  - Individual site progress indicators
  - Expanded view shows all sites in task

# Task Detail Screen (Enhanced TaskDetail.tsx)
Task Overview Section:
  - Task information (name, type, priority)
  - Project details (inherited from project)
  - Assignment details (team, timeline)
  - Overall progress indicator

Site Progress Section:
  - List of all sites in task
  - Individual site status and progress
  - Quick navigation to site-specific work
  - Site role indicators (Far-End, Near-End for MW)

# Multi-Site Work Screen (New Component)
Site Selection:
  - Choose which site to work on
  - Show site status and progress
  - Quick switch between sites
  - Consolidated equipment list for task

Site-Specific Work:
  - Enhanced TaskWork component
  - Site-specific equipment verification
  - Individual site photo documentation
  - Site completion workflow

# API Integration Updates
Task-Centric APIs:
  - GET /api/tasks/{id}/ → Full task with all sites
  - POST /api/tasks/{id}/sites/{site_id}/progress → Site progress update
  - POST /api/tasks/{id}/sites/{site_id}/complete → Complete individual site
  - GET /api/tasks/{id}/dismantling → Mobile work interface data

Backward Compatibility:
  - Existing site-based APIs continue to work
  - New task-based APIs provide enhanced functionality
  - Gradual migration path for mobile app updates
```

### Web App Integration

```yaml
Web App Enhancements Required:

# Task Management Page (Enhanced TasksPage.tsx)
Task List View:
  - Group by task instead of individual sites
  - Show task type and site count
  - Multi-site progress indicators
  - Task-level actions (assign, transfer, monitor)

# Task Detail View (Enhanced TaskDetailPage.tsx)
Task Dashboard:
  - Task overview and metadata
  - Multi-site progress visualization
  - Assignment history and timeline
  - Real-time progress updates from mobile teams

Site Progress Section:
  - Individual site progress cards
  - Site-specific status indicators
  - Equipment verification status per site
  - Photo submission status per site

# Project Integration
Task Creation:
  - "Create Task" button on approved projects
  - Automatic task type detection (MW vs single-site)
  - Site grouping configuration for MW projects
  - Equipment requirement inheritance

# Reporting & Analytics
Multi-Site Reporting:
  - Task completion rates vs site completion rates
  - MW coordination efficiency metrics
  - Team workload across task types
  - Resource utilization per task type
```

---

## Workflow Examples

### Single-Site Task Workflow (2G/3G)

```yaml
Step 1: Task Creation
  Input: Approved 3G project with 1 site, equipment inventory allocated
  Action: Project Manager creates task from project
  Result:
    - Task created with type "Single_Site"
    - One TaskSite relationship (role: Primary)
    - Status: ALLOCATED

Step 2: Team Assignment
  Input: Available team selected for task
  Action: Supervisor assigns task to team
  Result:
    - TaskAssignment created
    - Status: ALLOCATED → ASSIGNING
    - Team notification sent

Step 3: Assignment Acceptance
  Input: Team member receives notification
  Action: Team leader accepts assignment
  Result:
    - Assignment marked as Accepted
    - Status: ASSIGNING → ASSIGNED
    - Work planning can begin

Step 4: Work Execution
  Input: Team arrives at site location
  Action: Team starts work through mobile app
  Result:
    - Status: ASSIGNED → WIP
    - Site-specific equipment verification
    - Progress tracking and photo documentation

Step 5: Completion
  Input: All equipment verified and documented
  Action: Team marks site as completed
  Result:
    - Site status: In_Progress → Completed
    - Task status: WIP → DONE
    - Quality review triggered
```

### Multi-Site MW Task Workflow

```yaml
Step 1: Task Creation
  Input: Approved MW project with 2 sites, equipment inventory allocated
  Action: Project Manager creates MW task from project
  Result:
    - Task created with type "Multi_Site_MW"
    - Two TaskSite relationships (Far_End, Near_End)
    - Status: ALLOCATED
    - Coordination requirements noted

Step 2: Team Assignment
  Input: Team with MW experience selected
  Action: Supervisor assigns MW task to team
  Result:
    - TaskAssignment created for entire task
    - Status: ALLOCATED → ASSIGNING
    - Team responsible for both sites

Step 3: Assignment Acceptance & Planning
  Input: Team receives MW task assignment
  Action: Team leader accepts and plans coordination
  Result:
    - Assignment accepted for both sites
    - Status: ASSIGNING → ASSIGNED
    - Work sequence planned (Far-End, Near-End)

Step 4: Far-End Site Work
  Input: Team begins work at Far-End site
  Action: Site-specific work through mobile app
  Result:
    - Task status: ASSIGNED → WIP
    - Far_End site: Pending → In_Progress
    - Equipment verification for Far-End
    - Progress: 0% → 50% (1 of 2 sites)

Step 5: Near-End Site Work
  Input: Far-End completed, team moves to Near-End
  Action: Continue task work at second site
  Result:
    - Far_End site: In_Progress → Completed
    - Near_End site: Pending → In_Progress
    - Equipment verification for Near-End
    - Progress: 50% → 100% (2 of 2 sites)

Step 6: Task Completion
  Input: Both sites completed successfully
  Action: System auto-completes task
  Result:
    - Both sites: Completed
    - Task status: WIP → DONE
    - Consolidated reporting and quality review
```

### Task Transfer Workflow

```yaml
Scenario: Team Transfer Due to Resource Conflict

Step 1: Transfer Initiation
  Input: Task assigned to Team A, Team A has conflict
  Action: Supervisor initiates task transfer
  Request: Transfer to Team B with reason "Resource conflict"

Step 2: Transfer Processing
  System Actions:
    - Current assignment (Team A) marked as 'Transferred'
    - New assignment created for Team B
    - Task status: ASSIGNED → ASSIGNING
    - Notifications sent to both teams

Step 3: New Team Acceptance
  Input: Team B receives transfer notification
  Action: Team B leader accepts transferred task
  Result:
    - New assignment accepted
    - Status: ASSIGNING → ASSIGNED
    - Work can proceed with Team B

Step 4: Timeline Documentation
  Audit Trail:
    - Original assignment to Team A logged
    - Transfer reason and timestamp recorded
    - New assignment to Team B logged
    - Complete transfer history maintained
```

---

## Migration and Implementation Plan

### Phase 1: Database Schema Implementation

```yaml
Week 1-2: Core Task Tables
  - Implement tasks, task_sites, task_assignments tables
  - Add indexes and constraints
  - Create migration scripts for existing data
  - Validate data integrity

Week 3: Task Timeline and Audit
  - Implement task_timeline table
  - Migrate existing site timeline data
  - Add event logging infrastructure
  - Test timeline functionality

Week 4: Integration Testing
  - Validate foreign key relationships
  - Test multi-tenant data isolation
  - Performance testing with large datasets
  - Backup and recovery procedures
```

### Phase 2: Backend API Development

```yaml
Week 5-6: Core Task APIs
  - Implement task CRUD operations
  - Task creation from projects
  - Assignment management APIs
  - Status transition endpoints

Week 7: Multi-Site APIs
  - Task-site relationship management
  - Individual site progress tracking
  - Multi-site coordination endpoints
  - Progress aggregation logic

Week 8: Integration and Testing
  - Equipment inventory integration
  - Project management integration
  - API testing and validation
  - Performance optimization
```

### Phase 3: Frontend Implementation

```yaml
Week 9-10: Web App Updates
  - Enhanced TasksPage with task grouping
  - New TaskDetailPage with multi-site support
  - Task creation from projects
  - Assignment and transfer interfaces

Week 11-12: Mobile App Updates
  - Enhanced Tasks.tsx with task display
  - Updated TaskDetail.tsx for multi-site
  - New MultiSiteWork component
  - Site selection and progress tracking

Week 13: Testing and Integration
  - End-to-end workflow testing
  - Multi-site coordination testing
  - User acceptance testing
  - Performance validation
```

### Phase 4: Migration and Rollout

```yaml
Week 14: Data Migration
  - Migrate existing sites to single-site tasks
  - Preserve all assignment and timeline data
  - Validate migrated data integrity
  - Rollback procedures in place

Week 15: Pilot Rollout
  - Limited release to select teams
  - Monitor system performance
  - Gather user feedback
  - Address immediate issues

Week 16: Full Rollout
  - Release to all users
  - Monitor system performance
  - User training and documentation
  - Support and maintenance procedures
```

---

## Future Enhancements

### Advanced Multi-Site Features

```yaml
Enhanced Coordination:
  - Site dependency management (Site B waits for Site A)
  - Resource sharing between sites
  - Coordinated scheduling optimization
  - Real-time team communication

Progress Visualization:
  - Interactive progress maps
  - Site-to-site relationship visualization
  - Timeline coordination charts
  - Resource allocation dashboards

Analytics & Reporting:
  - Multi-site efficiency analysis
  - Team performance across task types
  - Coordination bottleneck identification
  - Predictive completion estimates
```

### Integration Opportunities

```yaml
External Systems:
  - GIS integration for site mapping
  - Weather API for work condition tracking
  - Fleet management for team routing
  - Customer notification systems

Mobile Enhancements:
  - Offline multi-site support
  - GPS tracking for site verification
  - Voice commands for hands-free updates
  - Augmented reality for equipment identification

Business Intelligence:
  - Machine learning for task duration prediction
  - Automated team assignment optimization
  - Risk assessment for multi-site coordination
  - Cost analysis per task type
```

---

## Conclusion

This Task Management specification provides a comprehensive framework for handling both single-site and multi-site dismantling tasks while maintaining backward compatibility with the existing VLT system. The multi-site MW functionality addresses the critical business need for coordinated Far-End/Near-End dismantling while preserving the proven workflow for 2G/3G single-site tasks.

Key benefits of this implementation:

1. **Unified Task Management**: Single interface for all task types
2. **Multi-Site Coordination**: Proper MW task handling with individual site progress
3. **Backward Compatibility**: Seamless migration from existing site-based workflow
4. **Scalable Architecture**: Supports future task types and coordination scenarios
5. **Enhanced Visibility**: Better progress tracking and reporting across all task types

The phased implementation approach ensures minimal disruption to current operations while progressively introducing advanced multi-site capabilities.

## Task Creation Workflow

### Manual Task Creation from Project

```yaml
Prerequisites for Task Creation:
  1. Project exists with appropriate type (Dismantle/Other)
  2. [If Dismantle] Project design is completed and approved
  3. Sites are associated with project (in project_sites table)
  4. [If Dismantle] Project inventory is allocated to sites
  5. User has permission to create tasks for the project

Task Creation Process:
  Step 1: Project Validation
    - Verify project exists and user has access
    - Check design approval (for dismantling projects)
    - Validate inventory completion (for dismantling projects)
    - Ensure sites are available for task creation

  Step 2: Site Selection
    - User selects which sites from project to include in task
    - System validates selected sites exist in project
    - If site missing from master data: automatically add to master data
    - If site missing from project: automatically add to project
    - Creates task-site relationships

  Step 3: Task Configuration
    - User provides task name (optional, auto-generated if not provided)
    - User sets priority and estimated duration
    - System determines task type based on site count and project characteristics
    - System inherits project context (client, customer, activity)

  Step 4: Inventory Inheritance
    - Task automatically inherits planned inventory from selected project sites
    - Equipment allocations become task equipment requirements
    - Serial number assignments preserved from project inventory
    - Site-specific equipment context maintained

  Step 5: Task Creation
    - Create task record with ALLOCATED status
    - Create task-site relationships with appropriate roles
    - Log task creation event
    - Task ready for team assignment
```

### Site Selection Logic

```yaml
Site Selection Rules:
  Available Sites:
    - Must exist in project's associated sites (project_sites table)
    - Must be accessible within user's tenant
    - Can be selected individually or in groups

  Site Validation Process:
    - Check if site exists in site master data
    - If missing from master data: create site record
    - Check if site is associated with project
    - If missing from project: add to project_sites
    - Validate site has inventory (for dismantling projects)

  Multi-Site Task Rules:
    - MW tasks require exactly 2 sites for Far_End/Near_End roles
    - Single-site tasks can have 1 site with Primary role
    - 3+ sites create single-site tasks with Primary roles

Site Role Assignment:
  Single-Site Tasks:
    - All sites get "Primary" role
    - Sequential ordering if multiple sites

  MW Multi-Site Tasks:
    - First site: "Far_End" role
    - Second site: "Near_End" role
    - If not exactly 2 sites: all get "Primary" role
```

### Inventory Inheritance Process

```yaml
Equipment Inheritance Rules:
  Source: Project Site Equipment Allocations
    - From project_site_equipment_allocations table
    - Only for sites selected in task creation
    - Includes quantities, serial numbers, specifications

  Task Equipment Requirements:
    - Equipment allocated to selected sites becomes task requirements
    - Serial number assignments preserved
    - Equipment specifications maintained
    - Site-specific equipment context retained

  Inventory Data Flow: Project Design → Equipment Types Selected
    Project Inventory → Quantities/Serials Allocated to Sites
    Task Creation → Inherit Inventory from Selected Sites
    Task Execution → Work with Inherited Equipment List

Equipment Context in Tasks:
  Site-Specific Equipment:
    - Task shows which equipment is at which site
    - Mobile app can filter equipment by current location
    - Team can verify equipment at specific sites
    - Progress tracking per site equipment

  Equipment Verification:
    - Serial number verification against task requirements
    - Equipment condition documentation
    - Site-specific equipment photos and notes
    - Completion tracking per equipment item
```
