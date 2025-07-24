# Teleops Project Inventory Management Specification

## Overview

The Project Inventory Management module handles the detailed equipment allocation and site-specific inventory planning for dismantling projects. This module operates **after** the project design phase is complete and focuses on **quantities** and **site-specific allocations** of equipment types that were previously defined during project design.

---

## Business Context

### Inventory Management Workflow Position

```yaml
Project Workflow Sequence: 1. Project Creation (with type = "Dismantle")
  2. Project Design Phase (Equipment Types Selection) ← COMPLETED FIRST
  3. Project Inventory Management Phase (THIS MODULE) ← QUANTITIES & SITE ALLOCATION
  4. Task Management Phase (Work Execution)

Inventory Management Scope:
  - Equipment quantities per site
  - Site-specific equipment allocation
  - Serial number assignment
  - Equipment condition and specifications
  - Inventory validation and reporting
```

### Integration with Design Phase

```yaml
Design Phase Output (Input to Inventory):
  - Approved equipment categories and models list
  - Equipment specifications and requirements
  - Technical handling requirements
  - Equipment priority levels (required vs optional)

Inventory Phase Responsibilities:
  - Add sites to project (site association)
  - Determine HOW MUCH equipment per site (quantity allocation)
  - Assign specific serial numbers
  - Validate against planned dismantling scope
  - Create site-specific equipment lists
  - Support bulk equipment allocation via Excel upload

Project Workflow Context:
  - Sites added during inventory phase (not design phase)
  - Equipment categories/models inherited from design phase
  - Site-specific equipment allocation based on design selections
  - Inventory management enables task creation with site-specific equipment
```

---

## Equipment Inventory Data Structure

### Site-Specific Equipment Allocation

```yaml
Project Site Inventory Model:
  - project_id: bigint (reference to project)
  - site_id: bigint (reference to site)
  - equipment_id: bigint (reference to equipment inventory)
  - planned_quantity: integer (how many units)
  - allocated_serial_numbers: array (specific equipment serials)

Equipment Serial Assignment:
  - serial_number: string (unique equipment identifier)
  - equipment_type: string (equipment type name)
  - equipment_name: string (specific equipment name/model)

Inventory Validation Rules:
  - Equipment must exist in Equipment Inventory
  - Serial numbers must be unique within project
  - Quantities must be positive integers
  - Sites must exist in project
```

### Cross-Technology Equipment Support

```yaml
Equipment Usage Patterns:
  Any Equipment Type in Any Project:
    - Jumper cables for 2G, MW, 3G, or mixed sites
    - Power cables across all technology types
    - PSU units common to multiple technologies
    - Cabinets housing different equipment types

  Site-Specific Variations:
    - Mixed technology sites (2G + MW, 3G + MW, etc.)
    - Custom equipment combinations per site
    - Variable quantities based on site assessment
    - Technology-specific serial number patterns

Equipment Allocation Flexibility:
  - No category constraints during allocation
  - Equipment types from approved design list
  - Quantities determined by site requirements
  - Serial numbers assigned per actual equipment
```

---

## Excel Upload and Bulk Processing

### Excel Template Structure

```yaml
Required Columns:
  Site Information:
    - Site_ID: string (must match existing project sites)
    - Site_Name: string (verification field)

  Equipment Details:
    - Equipment_Type: string (equipment type name)
    - Equipment_Name: string (specific equipment name/model)
    - Serial_Number: string (unique identifier)
    - Planned_Quantity: integer (quantity for this site)

Validation Rules:
  - Site_ID must exist in project sites
  - Equipment_Type must exist in Equipment Inventory
  - Serial_Number must be unique within project
  - Planned_Quantity must be positive integer
```

### Bulk Upload Processing Logic

```yaml
Upload Process Steps:
  1. Excel File Validation:
    - Check file format (.xlsx)
    - Validate required columns exist
    - Check data types and formats
    - Validate enum values

  2. Business Rule Validation:
    - Verify sites belong to project
    - Check equipment types in approved design
    - Validate serial number uniqueness
    - Confirm reasonable quantities

  3. Data Processing:
    - Create site equipment allocations
    - Assign serial numbers to equipment
    - Set equipment conditions and notes
    - Calculate inventory totals

  4. Conflict Resolution:
    - Handle duplicate serial numbers
    - Resolve quantity discrepancies
    - Manage missing equipment types
    - Address site capacity concerns

  5. Result Reporting:
    - Success summary (sites, equipment processed)
    - Warning list (unusual quantities, conditions)
    - Error details (validation failures)
    - Recommended actions for issues
```

---

## API Endpoints

### Project Inventory Management APIs

```yaml
# Project Inventory Overview
GET    /api/projects/{id}/inventory/              # Get complete project inventory
POST   /api/projects/{id}/inventory/upload/       # Bulk upload inventory via Excel
DELETE /api/projects/{id}/inventory/clear/        # Clear all project inventory

# Site-Specific Inventory
GET    /api/projects/{id}/sites/{site_id}/inventory/     # Get site inventory
POST   /api/projects/{id}/sites/{site_id}/inventory/     # Add equipment to site
PUT    /api/projects/{id}/sites/{site_id}/inventory/{allocation_id}/ # Update allocation
DELETE /api/projects/{id}/sites/{site_id}/inventory/{allocation_id}/ # Remove allocation

# Equipment Serial Management
GET    /api/projects/{id}/inventory/serials/      # List all serial numbers
POST   /api/projects/{id}/inventory/serials/validate/ # Validate serial uniqueness
GET    /api/projects/{id}/inventory/summary/      # Inventory summary report

# Equipment Integration
GET    /api/equipment/                                # Get all equipment inventory
GET    /api/equipment/types/                          # Get equipment types list

# Validation and Reporting
POST   /api/projects/{id}/inventory/validate/     # Validate inventory completeness
GET    /api/projects/{id}/inventory/export/       # Export inventory to Excel
GET    /api/projects/{id}/inventory/template/     # Download inventory template
```

---

## Database Schema

### Project Inventory Tables

```sql
-- Project Site Equipment Allocations
CREATE TABLE project_site_equipment_allocations (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    equipment_id BIGINT NOT NULL REFERENCES equipment_inventory(id) ON DELETE CASCADE,

    -- Quantity Details
    planned_quantity INTEGER NOT NULL DEFAULT 1,

    -- Optional Information
    equipment_notes TEXT,

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (planned_quantity > 0),
    UNIQUE(project_id, site_id, equipment_id) -- One allocation per equipment per site
);

-- Equipment Serial Number Assignments
CREATE TABLE project_equipment_serial_assignments (
    id BIGSERIAL PRIMARY KEY,
    allocation_id BIGINT NOT NULL REFERENCES project_site_equipment_allocations(id) ON DELETE CASCADE,

    -- Serial Information
    serial_number VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(255) NOT NULL,
    equipment_name VARCHAR(255),

    -- Equipment Details
    manufacturer VARCHAR(255),
    model VARCHAR(255),

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(allocation_id, serial_number) -- Unique serial per allocation
);

-- Inventory Upload History
CREATE TABLE inventory_upload_history (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Upload Details
    filename VARCHAR(255) NOT NULL,
    upload_method VARCHAR(50) DEFAULT 'Excel',

    -- Processing Results
    total_rows_processed INTEGER DEFAULT 0,
    successful_allocations INTEGER DEFAULT 0,
    failed_allocations INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,

    -- Upload Data
    processing_log JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',

    -- Status
    upload_status VARCHAR(50) DEFAULT 'Completed',

    -- Audit Fields
    uploaded_by INTEGER NOT NULL REFERENCES auth_user(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (upload_status IN ('Processing', 'Completed', 'Failed', 'Cancelled'))
);
```

### Performance Indexes

```sql
-- Project Site Equipment Allocation Indexes
CREATE INDEX idx_allocations_project ON project_site_equipment_allocations(project_id);
CREATE INDEX idx_allocations_site ON project_site_equipment_allocations(site_id);
CREATE INDEX idx_allocations_equipment ON project_site_equipment_allocations(equipment_id);

-- Serial Assignment Indexes
CREATE INDEX idx_serials_allocation ON project_equipment_serial_assignments(allocation_id);
CREATE INDEX idx_serials_number ON project_equipment_serial_assignments(serial_number);
CREATE INDEX idx_serials_equipment_type ON project_equipment_serial_assignments(equipment_type);

-- Upload History Indexes
CREATE INDEX idx_upload_project ON inventory_upload_history(project_id);
CREATE INDEX idx_upload_status ON inventory_upload_history(upload_status);
CREATE INDEX idx_upload_date ON inventory_upload_history(uploaded_at);
```

---

## Business Logic Layer

### Project Inventory Service

```python
class ProjectInventoryService:
    """Core business logic for project inventory management"""

        def initialize_inventory_template(self, project_id, user):
        """Initialize empty inventory template for project sites"""
        try:
            project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

            # Validate project type
            if project.project_type != 'Dismantle':
                raise ValidationError("Inventory only available for dismantling projects")

            # Get project sites
            sites = Site.objects.filter(project=project)

            # Return basic template structure
            inventory_template = {
                'project_id': project_id,
                'project_name': project.project_name,
                'sites': [
                    {
                        'site_id': site.id,
                        'site_name': site.site_name,
                        'global_id': site.global_id,
                        'equipment_allocations': []  # To be filled during Excel upload
                    }
                    for site in sites
                ],
                'total_sites': sites.count()
            }

            return inventory_template

        except Exception as e:
            raise ValidationError(f"Error initializing inventory template: {str(e)}")

    def bulk_upload_inventory(self, project_id, excel_file, user):
        """Process bulk inventory upload from Excel file"""
        try:
            project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

                        # Validate project type
            if project.project_type != 'Dismantle':
                raise ValidationError("Inventory management only available for dismantling projects")

            # Parse and validate Excel file
            df = self.parse_inventory_excel(excel_file)
            validation_results = self.validate_inventory_data(df, project_id, user.tenant_id)

            if validation_results['has_critical_errors']:
                return validation_results

            # Equipment validation will be done during processing based on Equipment Inventory

            # Process inventory data
            allocations_created = []
            serials_created = []

            with transaction.atomic():
                # Clear existing inventory for this project
                ProjectSiteEquipmentAllocation.objects.filter(project_id=project_id).delete()

                                                # Group data by site and equipment
                grouped_data = self.group_inventory_data(df)

                for site_equipment_key, equipment_data in grouped_data.items():
                    site_id, equipment_type = site_equipment_key

                    # Get equipment from inventory (must exist due to validation)
                    equipment = EquipmentInventory.objects.get(
                        equipment_name=equipment_type,
                        tenant_id=user.tenant_id
                    )

                    # Create allocation record
                    allocation = ProjectSiteEquipmentAllocation.objects.create(
                        project_id=project_id,
                        site_id=site_id,
                        equipment_id=equipment.id,
                        planned_quantity=len(equipment_data['serial_numbers']),
                        equipment_notes=equipment_data.get('equipment_notes', ''),
                        created_by=user
                    )
                    allocations_created.append(allocation)

                    # Create serial assignments
                    for serial_data in equipment_data['serial_numbers']:
                        serial_assignment = ProjectEquipmentSerialAssignment.objects.create(
                            allocation=allocation,
                            serial_number=serial_data['serial_number'],
                            equipment_type=equipment_type,
                            equipment_name=serial_data.get('equipment_name', ''),
                            manufacturer=serial_data.get('manufacturer', ''),
                            model=serial_data.get('model', ''),
                            notes=serial_data.get('notes', ''),
                            created_by=user
                        )
                        serials_created.append(serial_assignment)

                # Log upload history
                InventoryUploadHistory.objects.create(
                    project_id=project_id,
                    filename=excel_file.name,
                    upload_method='Excel',
                    total_rows_processed=len(df),
                    successful_allocations=len(allocations_created),
                    failed_allocations=validation_results['errors_count'],
                    warnings_count=len(validation_results['warnings']),
                    processing_log=validation_results,
                    upload_status='Completed',
                    uploaded_by=user
                )

            return {
                'success': True,
                'allocations_created': len(allocations_created),
                'serials_assigned': len(serials_created),
                'warnings': validation_results['warnings'],
                'total_processed': len(df)
            }

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Error processing inventory upload: {str(e)}")

            def validate_inventory_data(self, df, project_id, tenant_id):
        """Validate inventory data against business rules"""
        validation_results = {
            'has_critical_errors': False,
            'errors': [],
            'warnings': [],
            'errors_count': 0
        }

        # Get project sites for validation
        from api.models import ProjectSite

        project_sites = set(
            ProjectSite.objects.filter(
                project_id=project_id,
                project__tenant_id=tenant_id
            ).values_list('site__site_id', flat=True)
        )

        # Get equipment inventory for validation (both predefined and tenant-specific)
        from django.db.models import Q

        equipment_inventory = {
            eq.equipment_name: eq.id
            for eq in EquipmentInventory.objects.filter(
                Q(tenant_id=tenant_id) | Q(is_predefined=True),
                is_active=True,
                deleted_at__isnull=True
            )
        }

        # Track serial numbers for uniqueness
        serial_numbers_seen = set()

        for index, row in df.iterrows():
            row_errors = []

            # Validate site exists
            site_id = str(row.get('Site_ID', '')).strip()
            if site_id not in project_sites:
                row_errors.append(f"Site ID '{site_id}' not found in project")

            # Validate equipment type exists in Equipment Inventory
            equipment_type = str(row.get('Equipment_Type', '')).strip()
            if equipment_type not in equipment_inventory:
                row_errors.append(f"Equipment type '{equipment_type}' not found in Equipment Inventory")

            # Validate serial number uniqueness
            serial_number = str(row.get('Serial_Number', '')).strip()
            if serial_number:
                if serial_number in serial_numbers_seen:
                    row_errors.append(f"Duplicate serial number: {serial_number}")
                else:
                    serial_numbers_seen.add(serial_number)
            else:
                row_errors.append("Serial number is required")

            # Validate quantity
            planned_quantity = row.get('Planned_Quantity', 0)
            try:
                planned_quantity = int(planned_quantity)
                if planned_quantity <= 0:
                    row_errors.append("Planned quantity must be positive")
            except (ValueError, TypeError):
                row_errors.append("Planned quantity must be a valid number")

            if row_errors:
                validation_results['errors'].append({
                    'row': index + 2,  # Excel row number (header is row 1)
                    'errors': row_errors
                })
                validation_results['errors_count'] += len(row_errors)

        # Set critical error flag
        if validation_results['errors_count'] > 0:
            validation_results['has_critical_errors'] = True

        return validation_results

    def get_project_inventory_summary(self, project_id, user):
        """Get comprehensive inventory summary for project"""
        try:
            project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

            # Get all allocations with related data
            allocations = ProjectSiteEquipmentAllocation.objects.filter(
                project_id=project_id
            ).select_related(
                'site', 'equipment'
            ).prefetch_related(
                'serial_assignments'
            )

            # Build summary data
            summary = {
                'project_name': project.project_name,
                'total_sites': Site.objects.filter(project=project).count(),
                'total_equipment_types': allocations.values('equipment_id').distinct().count(),
                'total_planned_quantity': allocations.aggregate(
                    total=models.Sum('planned_quantity')
                )['total'] or 0,
                'total_serial_assignments': ProjectEquipmentSerialAssignment.objects.filter(
                    allocation__project_id=project_id
                ).count(),
                'sites_summary': [],
                'equipment_summary': []
            }

            # Group by site
            sites_data = {}
            for allocation in allocations:
                site_id = allocation.site.site_id
                if site_id not in sites_data:
                    sites_data[site_id] = {
                        'site_id': site_id,
                        'site_name': allocation.site.site_name,
                        'equipment_types': 0,
                        'total_quantity': 0,
                        'serial_count': 0,
                        'equipment_list': []
                    }

                sites_data[site_id]['equipment_types'] += 1
                sites_data[site_id]['total_quantity'] += allocation.planned_quantity
                sites_data[site_id]['serial_count'] += allocation.serial_assignments.count()

                sites_data[site_id]['equipment_list'].append({
                    'equipment_name': allocation.equipment.equipment_name,
                    'equipment_type': allocation.equipment.equipment_type,
                    'planned_quantity': allocation.planned_quantity,
                    'serial_count': allocation.serial_assignments.count(),
                    'allocation_status': allocation.allocation_status
                })

            summary['sites_summary'] = list(sites_data.values())

            # Group by equipment type
            equipment_data = {}
            for allocation in allocations:
                eq_key = allocation.equipment.equipment_name
                if eq_key not in equipment_data:
                    equipment_data[eq_key] = {
                        'equipment_name': allocation.equipment.equipment_name,
                        'equipment_type': allocation.equipment.equipment_type,
                        'total_sites': 0,
                        'total_quantity': 0,
                        'total_serials': 0,
                        'unit_of_measurement': allocation.equipment.unit_of_measurement
                    }

                equipment_data[eq_key]['total_sites'] += 1
                equipment_data[eq_key]['total_quantity'] += allocation.planned_quantity
                equipment_data[eq_key]['total_serials'] += allocation.serial_assignments.count()

            summary['equipment_summary'] = list(equipment_data.values())

            return summary

        except Exception as e:
            raise ValidationError(f"Error generating inventory summary: {str(e)}")
```

---

## Frontend Integration

### TypeScript Interfaces

```typescript
// Project Inventory Types
interface ProjectSiteEquipmentAllocation {
  id: number;
  project_id: number;
  site_id: number;
  equipment_id: number;
  site_name?: string;
  equipment_name?: string;
  equipment_type?: string;
  planned_quantity: number;
  equipment_notes?: string;
  serial_assignments?: EquipmentSerialAssignment[];
  created_at: string;
}

interface EquipmentSerialAssignment {
  id: number;
  allocation_id: number;
  serial_number: string;
  equipment_type: string;
  equipment_name?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  created_at: string;
}

interface InventoryUploadResult {
  success: boolean;
  allocations_created: number;
  serials_assigned: number;
  warnings: string[];
  total_processed: number;
  errors?: string[];
}

interface ProjectInventorySummary {
  project_name: string;
  total_sites: number;
  total_equipment_types: number;
  total_planned_quantity: number;
  total_serial_assignments: number;
  sites_summary: SiteInventorySummary[];
  equipment_summary: EquipmentInventorySummary[];
}

// Project Inventory Hook
export const useProjectInventory = (projectId: number) => {
  const [inventory, setInventory] = useState<ProjectSiteEquipmentAllocation[]>([]);
  const [summary, setSummary] = useState<ProjectInventorySummary | null>(null);
  const [loading, setLoading] = useState(false);

  const initializeTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const template = await projectInventoryAPI.initializeTemplate(projectId);
      return template;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const uploadInventoryExcel = useCallback(
    async (file: File): Promise<InventoryUploadResult> => {
      setLoading(true);
      try {
        const result = await projectInventoryAPI.uploadExcel(projectId, file);
        await loadInventory(); // Refresh inventory data
        await loadSummary(); // Refresh summary
        return result;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const validateInventory = useCallback(async () => {
    try {
      return await projectInventoryAPI.validate(projectId);
    } catch (error) {
      throw error;
    }
  }, [projectId]);

  return {
    inventory,
    summary,
    loading,
    initializeTemplate,
    uploadInventoryExcel,
    validateInventory,
    loadInventory,
    loadSummary,
  };
};
```

---

## Integration Points

### 1. Equipment Inventory Integration

```yaml
Equipment Validation:
  - Verify equipment exists in Equipment Inventory
  - Load equipment specifications and details
  - Apply equipment information to inventory allocation
  - Support any equipment type in inventory

Equipment Information Inheritance:
  - Equipment types from Equipment Inventory
  - Technical specifications and details
  - Unit of measurement and descriptions
  - Equipment categorization and tags
```

### 2. Site Management Integration

```yaml
Site Validation:
  - Inventory sites must exist in project
  - Site capacity validation for equipment volume
  - Geographic clustering for logistics
  - Site accessibility for equipment removal

Site-Specific Allocation:
  - Equipment quantities per site
  - Site conditions affecting equipment
  - Access requirements per site
  - Equipment removal sequence planning
```

### 3. Task Management Integration (Future)

```yaml
Task Creation Foundation:
  - Equipment-specific work tasks
  - Site-based task assignment
  - Equipment handling instructions
  - Progress tracking by equipment serial

Resource Allocation:
  - Team assignments per equipment type
  - Tool requirements per equipment
  - Time estimates for equipment removal
  - Progress tracking by serial number
```

---

## User Experience Flows

### 1. Inventory Initialization Flow

```yaml
Step 1: Project Validation
  - Check project type is "Dismantle"
  - Load project sites list
  - Display project summary for reference

Step 2: Template Generation
  - Create empty inventory template
  - Show sites ready for equipment allocation
  - Present allocation method options

Step 3: Allocation Method Selection
  - Select allocation method (Manual vs Excel)
  - Download Excel template if bulk upload
  - Begin manual allocation if preferred
```

### 2. Excel Upload Flow

```yaml
Step 1: Template Download
  - Download Excel template with approved equipment
  - Review template instructions
  - Prepare inventory data

Step 2: File Upload and Validation
  - Upload completed Excel file
  - Validate file format and content
  - Display validation results

Step 3: Review and Confirm
  - Review allocation summary
  - Address warnings and issues
  - Confirm inventory upload

Step 4: Processing Results
  - Display upload success metrics
  - Show allocation summary
  - Access detailed inventory view
```

### 3. Inventory Management Flow

```yaml
Step 1: Inventory Overview
  - View project inventory summary
  - Browse by site or equipment type
  - Check allocation status

Step 2: Site-Specific Management
  - View site equipment details
  - Manage serial number assignments
  - Update equipment conditions

Step 3: Validation and Reporting
  - Validate inventory completeness
  - Generate inventory reports
  - Export for task planning
```

---

## Implementation Roadmap

### Phase 1: Core Inventory Management (Weeks 1-2)

- Database schema implementation
- Basic allocation CRUD operations
- Site-equipment relationship management
- Serial number assignment system

### Phase 2: Excel Upload Processing (Weeks 3-4)

- Excel template generation
- Bulk upload validation
- Data processing and error handling
- Upload history tracking

### Phase 3: Design Integration (Weeks 5-6)

- Design phase output integration
- Equipment type validation
- Specification inheritance
- Design-inventory workflow

### Phase 4: Advanced Features (Weeks 7-8)

- Inventory validation and reporting
- Summary dashboards
- Export functionality
- Performance optimization

---

This Project Inventory Management specification provides a comprehensive solution for equipment allocation and site-specific inventory planning, properly separated from the design phase and integrated with the broader Teleops project workflow.

_Last Updated: 2024-12-28_
