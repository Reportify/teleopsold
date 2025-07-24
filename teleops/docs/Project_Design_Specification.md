# Teleops Project Design Specification

## Overview

The Project Design module handles the detailed design phase for dismantling projects, where clients specify the equipment categories and models needed for dismantling operations. This module provides a structured workflow for equipment selection using a hierarchical **Category → Model** approach based on proven VLT architecture. The design phase creates the foundation for inventory management and task planning.

---

## Business Context

### Project Design Workflow

```yaml
Design Process Flow:
  Step 1: Project Creation (with type = "Dismantle")
  Step 2: Automatic Design Phase Activation
  Step 3: Equipment Category Definition (WHAT categories needed)
    - Browse tenant's existing equipment categories (if any)
    - Create new categories based on project equipment needs
    - Configure category verification requirements during creation
  Step 4: Equipment Model Definition (WHICH models within categories)
    - Browse existing models within selected/created categories
    - Add new equipment models to categories as needed
    - Select specific equipment models for project
  Step 5: Equipment Specifications and Requirements Definition
  Step 6: Design Ready for Inventory Management Phase

Note: Quantities and Site Allocation handled separately:
  - Equipment quantities determined during inventory management
  - Site-specific allocation done when adding sites to project
  - Design phase focuses on categories and models, not amounts

Integration Points:
  - Equipment Inventory → Dynamic category and model creation
  - Equipment specifications and technical requirements
  - Task Management → Equipment-based task creation with verification
  - Inventory Management → Quantities and site allocations
```

### Category-Model Equipment Approach

```yaml
Dynamic Hierarchical Equipment Definition:
  Category Level:
    - Equipment categories created by tenants during design
    - No predefined categories - fully tenant-driven
    - Examples: CABINET, ANTENNA, RADIO, POWER_EQUIPMENT, TRANSMISSION
    - Category-specific verification requirements set during creation
    - Serial number configuration per tenant-created category

  Model Level:
    - Specific models within tenant-created categories
    - Tenant-defined designations (RBS-2964, Custom-Cabinet-1, etc.)
    - Model-specific specifications and requirements
    - Model addition during design phase

  Flexible Tenant-Driven Design:
    - Tenants create equipment categories based on actual project needs
    - No system-imposed category constraints
    - Equipment organization reflects tenant's operational needs
    - Category-model combinations provide precise tenant specifications

  Project Variations:
    - Tenant-specific equipment categorization
    - Custom equipment organization per tenant
    - Equipment combinations based on tenant's actual inventory
    - Site-specific requirements using tenant's categories
```

---

## Project Design Data Structure

### Core Design Fields

```yaml
Project Design Table:
  - project_id: bigint (foreign key to projects)
  - design_status: enum (Draft, Under Review, Approved, Locked)
  - total_equipment_categories_count: integer (calculated)
  - total_equipment_models_count: integer (calculated)
  - estimated_duration: integer (in days)
  - complexity_rating: enum (Low, Medium, High, Critical)
  - design_notes: text (additional specifications)

Equipment Category Selection Table:
  - project_id: bigint (foreign key to projects)
  - category_id: bigint (foreign key to equipment_categories)
  - category_name: string (for reference)
  - specifications: text (category-specific specifications)
  - notes: text (category-specific notes)
  - is_required: boolean (required vs optional category)

Equipment Model Selection Table:
  - project_id: bigint (foreign key to projects)
  - category_id: bigint (foreign key to equipment_categories)
  - model_id: bigint (foreign key to equipment_models)
  - model_name: string (for reference)
  - specifications: text (model-specific specifications)
  - notes: text (model-specific notes)
  - is_required: boolean (required vs optional model)

Note: Quantities and Site Allocations handled separately:
  - Equipment quantities managed in inventory management phase
  - Site-specific allocations done when adding project inventory
  - Design focuses on WHAT categories and WHICH models, not HOW MUCH
```

### Equipment Category-Model Selection

```yaml
Equipment Category Organization:
  Required Categories:
    - Essential equipment categories that must be dismantled
    - Core infrastructure components (CABINET, CARDS, etc.)
    - Standard dismantling requirements
    - Mandatory category specifications

  Optional Categories:
    - Additional equipment categories that may be present
    - Site-dependent equipment variations (PAU, CXU, etc.)
    - Custom equipment configurations
    - Future-proofing equipment categories

  Model Selection within Categories:
    - Specific models required within each category
    - Model-based technical specifications
    - Manufacturer-specific requirements
    - Custom model additions as needed

Note: Actual Allocation handled later:
  - Equipment quantities determined during inventory phase
  - Site-specific allocation in inventory management
  - Focus on category and model identification in design phase
```

---

## Design Workflow Features

### 1. Design Initiation

#### Automatic Design Activation

```yaml
Design Trigger Conditions:
  - Project type = "Dismantle"
  - Project creation completed
  - User has design permissions

Design Initialization:
  - Create project design record
  - Set status to "Draft"
  - Present equipment category selection interface
  - Load available equipment categories and models
  - Initialize equipment selection workspace

Note: Sites not required for design phase:
  - Design focuses on equipment categories and models needed
  - Sites are added in next phase (Inventory Management)
  - Equipment categories/models defined independently of site count

Project Workflow Sequence:
  1. Project Design Phase: Define WHAT equipment categories and models are needed
  2. Site Association & Inventory Phase: Add sites to project AND allocate equipment quantities per site
  3. Task Creation Phase: Create tasks from projects with site-specific equipment inheritance
```

#### Equipment Category Discovery

```yaml
Equipment Category Interface:
  Tenant's Equipment Categories:
    - Browse tenant's created equipment category catalog
    - No technology category restrictions
    - Cross-technology equipment usage within tenant categories
    - Access to tenant-specific equipment organization

  Discovery Options:
    - Browse tenant-created categories (e.g., CABINET, ANTENNA, RADIO, etc.)
    - Create new categories during design phase (recommended for better planning)
    - View models within each tenant category
    - Filter by manufacturer or model characteristics
    - Search by category or model name

  Interface Benefits:
    - Tenant-specific equipment catalog
    - Complete tenant autonomy in equipment organization
    - Flexible equipment selection based on tenant's needs
    - Real-world usage patterns supported per tenant
    - Preferred phase for creating new categories

Equipment Category Creation Flexibility:
  - Primary Location: Design phase (recommended for better project planning)
  - Secondary Location: Inventory phase (if additional categories needed)
  - Categories created in either phase integrate seamlessly
  - Design phase creation enables better equipment organization
```

### 2. Equipment Category & Model Selection

#### Equipment Category Selection Interface

```yaml
Equipment Category Selection Interface:
  Complete Category Catalog:
    - Show all available equipment categories
    - Display category descriptions and verification requirements
    - Show available models within each category
    - Display equipment details and specifications

  Selection Methods:
    - Individual category selection with specific models
    - Entire category selection (all available models)
    - Mixed selection across multiple categories
    - Custom model addition within categories

  Equipment Information Display:
    - Category name and description
    - Model names and specifications
    - Verification requirements (serial number, etc.)
    - Manufacturer details and technical data

Note: Focus on Categories and Models Only:
  - No quantities specified during design
  - No site-specific allocations
  - Category and model identification with requirements definition
```

#### Equipment Model Selection & Specifications

```yaml
Equipment Model Selection Interface:
  Model Selection within Categories:
    Technical Requirements:
      - Model-specific specifications needed
      - Technical constraints and requirements
      - Special handling requirements for specific models
      - Equipment condition expectations

    Model Context:
      - Required vs optional model designation
      - Model priority levels within categories
      - Dependencies between different models
      - Special notes and considerations per model

  Model Addition Capability:
    - Add custom models to existing categories
    - Custom models automatically added to Equipment Inventory
    - Model specifications and manufacturer information
    - Technical requirement documentation

  Requirement Documentation:
    - Detailed model specifications
    - Technical requirement notes per model
    - Equipment handling instructions
    - Quality and condition requirements

Note: Quantities handled separately:
  - Equipment quantities determined in inventory management
  - Site-specific allocations done during inventory phase
  - Design focuses on WHICH categories and models and HOW to handle them
```

### 3. Equipment Category Organization

#### Category-Based Project Structure

```yaml
Project Equipment Organization:
  Primary Categories:
    - CABINET: Equipment housing and enclosures
    - CARDS: Electronic circuit cards and modules
    - DXU: Digital Cross-connect/Gateway Units
    - PSU: Power Supply Units

  Secondary Categories:
    - IDM: Indoor/Integrated Device Modules
    - FCU: Fan Cooling Units
    - DCCU: DC-DC Converter Units
    - PAU: Power Amplifier Units
    - CXU: Control Exchange Units
    - OTHER: Miscellaneous equipment

  Category Configuration:
    - Each category has specific verification requirements
    - Serial number requirements per category
    - Model specifications within categories
    - Custom model addition capabilities

Note: Categories provide structure for:
  - Systematic equipment verification in mobile app
  - Organized inventory management
  - Structured task creation and execution
  - Equipment requirements definition
```

---

## Design Validation & Approval

### 1. Design Validation

#### Validation Rules

```yaml
Equipment Category/Model Validation:
  - All selected categories exist in equipment inventory
  - All selected models exist within their categories
  - Required categories specified for project type
  - Equipment specifications documented adequately

Design Completeness Validation:
  - Minimum equipment categories selected
  - Required equipment categories included
  - Model specifications provided where needed
  - Design notes and requirements documented

Technical Validation:
  - Equipment specifications are complete
  - Technical requirements are feasible
  - Equipment dependencies identified
  - Special requirements documented

Business Validation:
  - Design scope aligns with project requirements
  - Technical feasibility confirmed
  - Equipment availability considerations
  - Resource planning considerations

Note: No quantity or site validation in design phase:
  - Quantities validated during inventory management
  - Site allocations validated when adding project inventory
  - Design validation focuses on categories, models, and requirements
```

#### Validation Reporting

```yaml
Validation Results:
  Critical Issues:
    - Missing required equipment categories
    - Incomplete model specifications
    - Equipment category/model availability issues
    - Missing technical requirements

  Warnings:
    - Unusual category/model combinations
    - High project complexity indicators
    - Incomplete equipment specifications
    - Equipment dependency concerns

  Recommendations:
    - Additional equipment category suggestions
    - Model specification improvements
    - Technical requirement clarifications
    - Equipment selection optimization

Note: Validation focuses on design completeness:
  - Equipment category and model selection adequacy
  - Specification and requirement completeness
  - Technical feasibility assessment
  - Design readiness for inventory management
```

### 2. Design Approval Workflow

#### Approval Stages

```yaml
Approval Process:
  Draft Stage:
    - Design creation and editing
    - Equipment category and model selection
    - Specification definition
    - Initial validation

  Under Review Stage:
    - Submit for client review (optional for v1)
    - Technical review process
    - Stakeholder feedback
    - Design refinements

  Approved Stage:
    - Client approval received (optional for v1)
    - Design locked for changes
    - Ready for inventory management
    - Resource planning initiated

  Locked Stage:
    - Inventory management initiated
    - Equipment categories/models fixed
    - Version control maintained
    - Change request process (future)

Note: Approval workflow simplified for v1:
  - No mandatory approval process
  - Direct progression to inventory management
  - Approval workflow can be added in future versions
```

---

## Database Schema

### Project Design Tables

```sql
-- Project Design Main Table
CREATE TABLE project_designs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Design Status
    design_status VARCHAR(50) NOT NULL DEFAULT 'Draft',

    -- Design Metrics
    total_equipment_categories_count INTEGER DEFAULT 0,
    total_equipment_models_count INTEGER DEFAULT 0,
    estimated_duration_days INTEGER,
    complexity_rating VARCHAR(20),

    -- Design Information
    design_notes TEXT,

    -- Approval Information (Optional for v1)
    submitted_for_review_at TIMESTAMP WITH TIME ZONE,
    reviewed_by INTEGER REFERENCES auth_user(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES auth_user(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(project_id),
    CHECK (design_status IN ('Draft', 'Under Review', 'Approved', 'Locked')),
    CHECK (complexity_rating IN ('Low', 'Medium', 'High', 'Critical'))
);

-- Equipment Category Selections
CREATE TABLE project_equipment_category_selections (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,

    -- Category Selection Details
    category_name VARCHAR(255) NOT NULL, -- For reference
    specifications TEXT, -- Category-specific specifications
    notes TEXT, -- Category-specific notes
    is_required BOOLEAN DEFAULT true, -- Required vs optional category
    priority_level VARCHAR(20) DEFAULT 'normal', -- Priority level

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (priority_level IN ('low', 'normal', 'high', 'critical')),
    UNIQUE(project_id, category_id) -- Prevent duplicate category selections
);

-- Equipment Model Selections
CREATE TABLE project_equipment_model_selections (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
    model_id BIGINT NOT NULL REFERENCES equipment_models(id) ON DELETE CASCADE,

    -- Model Selection Details
    model_name VARCHAR(255) NOT NULL, -- For reference
    specifications TEXT, -- Model-specific specifications
    notes TEXT, -- Model-specific notes
    is_required BOOLEAN DEFAULT true, -- Required vs optional model
    priority_level VARCHAR(20) DEFAULT 'normal', -- Priority level

    -- Audit Fields
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (priority_level IN ('low', 'normal', 'high', 'critical')),
    UNIQUE(project_id, model_id) -- Prevent duplicate model selections
);

-- Design History Table (for change tracking)
CREATE TABLE project_design_history (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Change Information
    change_type VARCHAR(50) NOT NULL, -- 'status_change', 'category_added', 'model_added', etc.
    change_description TEXT,
    old_value JSONB,
    new_value JSONB,

    -- Change Context
    changed_by INTEGER NOT NULL REFERENCES auth_user(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (change_type IN ('created', 'category_added', 'category_removed', 'model_added', 'model_removed',
                          'specifications_changed', 'status_changed', 'approved', 'locked'))
);
```

### Performance Indexes

```sql
-- Project Design Indexes
CREATE INDEX idx_project_designs_project ON project_designs(project_id);
CREATE INDEX idx_project_designs_status ON project_designs(design_status);
CREATE INDEX idx_project_designs_approved ON project_designs(approved_at);

-- Equipment Category Selection Indexes
CREATE INDEX idx_category_selections_project ON project_equipment_category_selections(project_id);
CREATE INDEX idx_category_selections_category ON project_equipment_category_selections(category_id);
CREATE INDEX idx_category_selections_required ON project_equipment_category_selections(is_required);

-- Equipment Model Selection Indexes
CREATE INDEX idx_model_selections_project ON project_equipment_model_selections(project_id);
CREATE INDEX idx_model_selections_category ON project_equipment_model_selections(category_id);
CREATE INDEX idx_model_selections_model ON project_equipment_model_selections(model_id);
CREATE INDEX idx_model_selections_required ON project_equipment_model_selections(is_required);

-- Design History Indexes
CREATE INDEX idx_design_history_project ON project_design_history(project_id);
CREATE INDEX idx_design_history_changed_at ON project_design_history(changed_at);
CREATE INDEX idx_design_history_changed_by ON project_design_history(changed_by);
```

---

## API Endpoints

### Project Design APIs

```yaml
# Project Design Management
GET    /api/projects/{id}/design/          # Get project design details
POST   /api/projects/{id}/design/          # Create/initialize project design
PUT    /api/projects/{id}/design/          # Update design information
DELETE /api/projects/{id}/design/          # Delete design (if not approved)

# Equipment Category Selection Management
GET    /api/projects/{id}/design/categories/     # List project equipment category selections
POST   /api/projects/{id}/design/categories/     # Add equipment category to design
PUT    /api/projects/{id}/design/categories/{selection_id}/ # Update category selection
DELETE /api/projects/{id}/design/categories/{selection_id}/ # Remove category

# Equipment Model Selection Management
GET    /api/projects/{id}/design/models/         # List project equipment model selections
POST   /api/projects/{id}/design/models/         # Add equipment model to design
PUT    /api/projects/{id}/design/models/{selection_id}/ # Update model selection
DELETE /api/projects/{id}/design/models/{selection_id}/ # Remove model

# Equipment Category/Model Information (Tenant-Created)
GET    /api/projects/{id}/design/equipment/categories/ # Get tenant's equipment categories
GET    /api/projects/{id}/design/equipment/models/{category_id}/ # Get models in tenant category

# Design Workflow (Optional for v1)
POST   /api/projects/{id}/design/submit-review/  # Submit design for review (optional)
POST   /api/projects/{id}/design/approve/        # Approve design (optional)
POST   /api/projects/{id}/design/lock/           # Lock design for inventory management

# Validation & Reporting
POST   /api/projects/{id}/design/validate/       # Validate design
GET    /api/projects/{id}/design/summary/        # Design summary report
GET    /api/projects/{id}/design/export/         # Export design to Excel
```

---

## Business Logic Layer

### Project Design Service

```python
class ProjectDesignService:
    """Core business logic for project design management"""

    def initialize_project_design(self, project_id, user):
        """Initialize design for a dismantle project"""
        project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

        # Validate project is dismantling type
        if project.project_type != 'Dismantle':
            raise ValidationError("Design only available for dismantling projects")

        # Check if design already exists
        existing_design = ProjectDesign.objects.filter(project_id=project_id).first()
        if existing_design:
            return existing_design

        # Create new design
        design = ProjectDesign.objects.create(
            project_id=project_id,
            design_status='Draft',
            created_by=user
        )

        # Log design initialization
        self.log_design_activity(design, 'created', user)

        return design

    def add_equipment_category_to_design(self, project_id, category_data, user):
        """Add equipment category to project design"""
        design = ProjectDesign.objects.get(
            project_id=project_id,
            project__tenant_id=user.tenant_id
        )

        # Validate design is editable
        if design.design_status in ['Approved', 'Locked']:
            raise ValidationError("Cannot modify approved or locked designs")

        # Validate category exists and belongs to tenant (tenant-created categories only)
        category = EquipmentCategory.objects.filter(
            id=category_data['category_id'],
            tenant_id=user.tenant_id,
            is_active=True,
            deleted_at__isnull=True
        ).first()

        if not category:
            raise ValidationError("Equipment category not found or not accessible to tenant")

        # Create or update category selection
        selection, created = ProjectEquipmentCategorySelection.objects.update_or_create(
            project_id=project_id,
            category_id=category_data['category_id'],
            defaults={
                'category_name': category.category_name,
                'specifications': category_data.get('specifications', ''),
                'notes': category_data.get('notes', ''),
                'is_required': category_data.get('is_required', True),
                'priority_level': category_data.get('priority_level', 'normal'),
                'created_by': user
            }
        )

        # Update design metrics
        self.update_design_metrics(design)

        # Log category selection activity
        action = 'category_added' if created else 'category_updated'
        self.log_design_activity(design, action, user, {
            'category_name': category.category_name,
            'is_required': selection.is_required
        })

        return selection

    def add_equipment_model_to_design(self, project_id, model_data, user):
        """Add equipment model to project design"""
        design = ProjectDesign.objects.get(
            project_id=project_id,
            project__tenant_id=user.tenant_id
        )

        # Validate design is editable
        if design.design_status in ['Approved', 'Locked']:
            raise ValidationError("Cannot modify approved or locked designs")

        # Validate model exists and belongs to tenant (tenant-created models only)
        model = EquipmentModel.objects.filter(
            id=model_data['model_id'],
            category__tenant_id=user.tenant_id,
            is_active=True,
            deleted_at__isnull=True
        ).select_related('category').first()

        if not model:
            raise ValidationError("Equipment model not found or not accessible to tenant")

        # Create or update model selection
        selection, created = ProjectEquipmentModelSelection.objects.update_or_create(
            project_id=project_id,
            model_id=model_data['model_id'],
            defaults={
                'category_id': model.category_id,
                'model_name': model.model_name,
                'specifications': model_data.get('specifications', ''),
                'notes': model_data.get('notes', ''),
                'is_required': model_data.get('is_required', True),
                'priority_level': model_data.get('priority_level', 'normal'),
                'created_by': user
            }
        )

        # Update design metrics
        self.update_design_metrics(design)

        # Log model selection activity
        action = 'model_added' if created else 'model_updated'
        self.log_design_activity(design, action, user, {
            'category_name': model.category.category_name,
            'model_name': model.model_name,
            'is_required': selection.is_required
        })

        return selection

    def validate_project_design(self, project_id, user):
        """Validate project design completeness and consistency"""
        design = ProjectDesign.objects.get(
            project_id=project_id,
            project__tenant_id=user.tenant_id
        )

        validation_results = {
            'is_valid': True,
            'critical_issues': [],
            'warnings': [],
            'recommendations': []
        }

        # Check if design has category selections
        category_selections = ProjectEquipmentCategorySelection.objects.filter(project_id=project_id)
        if not category_selections.exists():
            validation_results['critical_issues'].append("No equipment categories selected for project")
            validation_results['is_valid'] = False

        # Check if design has model selections
        model_selections = ProjectEquipmentModelSelection.objects.filter(project_id=project_id)
        if not model_selections.exists():
            validation_results['critical_issues'].append("No equipment models selected for project")
            validation_results['is_valid'] = False

        # Check for missing specifications on required equipment
        missing_specs_categories = category_selections.filter(
            is_required=True,
            specifications__isnull=True
        )
        if missing_specs_categories.exists():
            validation_results['critical_issues'].append("Required equipment categories missing specifications")
            validation_results['is_valid'] = False

        # Check for required equipment categories
        required_count = category_selections.filter(is_required=True).count()
        if required_count == 0:
            validation_results['warnings'].append("No required equipment categories specified")

        # Check for category-model consistency
        for category_selection in category_selections:
            models_in_category = model_selections.filter(category_id=category_selection.category_id)
            if not models_in_category.exists():
                validation_results['warnings'].append(
                    f"Category '{category_selection.category_name}' has no models selected"
                )

        # Equipment selection completeness
        incomplete_models = model_selections.filter(specifications='').count()
        if incomplete_models > 0:
            validation_results['recommendations'].append("Consider adding specifications for all equipment models")

        return validation_results

    def get_design_equipment_structure(self, project_id, user):
        """Get organized equipment structure for project design"""
        design = ProjectDesign.objects.get(
            project_id=project_id,
            project__tenant_id=user.tenant_id
        )

        # Get category selections
        category_selections = ProjectEquipmentCategorySelection.objects.filter(
            project_id=project_id
        ).select_related('category')

        # Get model selections
        model_selections = ProjectEquipmentModelSelection.objects.filter(
            project_id=project_id
        ).select_related('category', 'model')

        # Organize by category
        equipment_structure = {}
        for category_selection in category_selections:
            category_models = model_selections.filter(
                category_id=category_selection.category_id
            )

            equipment_structure[category_selection.category_name] = {
                'category_selection': {
                    'id': category_selection.id,
                    'specifications': category_selection.specifications,
                    'notes': category_selection.notes,
                    'is_required': category_selection.is_required,
                    'priority_level': category_selection.priority_level
                },
                'models': [
                    {
                        'id': model_sel.id,
                        'model_name': model_sel.model_name,
                        'specifications': model_sel.specifications,
                        'notes': model_sel.notes,
                        'is_required': model_sel.is_required,
                        'priority_level': model_sel.priority_level
                    }
                    for model_sel in category_models
                ]
            }

        return equipment_structure
```

---

## Frontend Components

### Project Design TypeScript Interfaces

```typescript
// Project Design Types
interface ProjectDesign {
  id: number;
  project_id: number;
  design_status: "Draft" | "Under Review" | "Approved" | "Locked";
  total_equipment_categories_count: number;
  total_equipment_models_count: number;
  estimated_duration_days?: number;
  complexity_rating?: "Low" | "Medium" | "High" | "Critical";
  design_notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ProjectEquipmentCategorySelection {
  id: number;
  project_id: number;
  category_id: number;
  category_name: string;
  specifications?: string;
  notes?: string;
  is_required: boolean;
  priority_level: "low" | "normal" | "high" | "critical";
  created_by: number;
  created_at: string;
}

interface ProjectEquipmentModelSelection {
  id: number;
  project_id: number;
  category_id: number;
  model_id: number;
  model_name: string;
  specifications?: string;
  notes?: string;
  is_required: boolean;
  priority_level: "low" | "normal" | "high" | "critical";
  created_by: number;
  created_at: string;
}

interface DesignValidationResult {
  is_valid: boolean;
  critical_issues: string[];
  warnings: string[];
  recommendations: string[];
}

// Project Design Hook
export const useProjectDesign = (projectId: number) => {
  const [design, setDesign] = useState<ProjectDesign | null>(null);
  const [categorySelections, setCategorySelections] = useState<ProjectEquipmentCategorySelection[]>([]);
  const [modelSelections, setModelSelections] = useState<ProjectEquipmentModelSelection[]>([]);
  const [loading, setLoading] = useState(false);

  const initializeDesign = useCallback(async () => {
    setLoading(true);
    try {
      const newDesign = await projectDesignAPI.initialize(projectId);
      setDesign(newDesign);
      return newDesign;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addEquipmentCategory = useCallback(
    async (categoryData: { category_id: number; specifications?: string; notes?: string; is_required?: boolean; priority_level?: string }) => {
      try {
        const selection = await projectDesignAPI.addEquipmentCategory(projectId, categoryData);
        setCategorySelections((prev) => [...prev, selection]);
        await loadDesign(); // Refresh design metrics
        return selection;
      } catch (error) {
        throw error;
      }
    },
    [projectId]
  );

  const addEquipmentModel = useCallback(
    async (modelData: { model_id: number; specifications?: string; notes?: string; is_required?: boolean; priority_level?: string }) => {
      try {
        const selection = await projectDesignAPI.addEquipmentModel(projectId, modelData);
        setModelSelections((prev) => [...prev, selection]);
        await loadDesign(); // Refresh design metrics
        return selection;
      } catch (error) {
        throw error;
      }
    },
    [projectId]
  );

  const validateDesign = useCallback(async (): Promise<DesignValidationResult> => {
    try {
      return await projectDesignAPI.validate(projectId);
    } catch (error) {
      throw error;
    }
  }, [projectId]);

  const submitForReview = useCallback(async () => {
    try {
      const updatedDesign = await projectDesignAPI.submitForReview(projectId);
      setDesign(updatedDesign);
      return updatedDesign;
    } catch (error) {
      throw error;
    }
  }, [projectId]);

  return {
    design,
    categorySelections,
    modelSelections,
    loading,
    initializeDesign,
    addEquipmentCategory,
    addEquipmentModel,
    validateDesign,
    submitForReview,
    loadDesign,
    loadCategorySelections,
    loadModelSelections,
  };
};
```

---

## User Experience Flows

### 1. Design Initialization Flow

```yaml
Step 1: Project Creation Completion
  - User creates dismantling project
  - System detects project_type = "Dismantle"
  - Automatic redirect to design phase
  - Design record initialized

Step 2: Equipment Category Discovery Setup
  - Present complete equipment category catalog
  - No category filtering - all categories available
  - Load available equipment categories and models
  - Display category-model selection workspace

Step 3: Design Workspace Setup
  - Display all available equipment categories
  - Show models available within each category
  - Initialize category-model selection workspace
  - Present design guidance and specifications interface
```

### 2. Equipment Category & Model Selection Flow

```yaml
Step 1: Equipment Category Discovery
  - Browse complete equipment category catalog
  - View category details, descriptions, and verification requirements
  - Search categories by name or characteristics
  - Review category technical information

Step 2: Category Selection
  - Select equipment categories for the project
  - Define category specifications and requirements
  - Set category priority levels (required vs optional)
  - Add category-specific notes and handling instructions

Step 3: Model Selection within Categories
  - Browse models available within selected categories
  - Select specific models needed for project
  - Define model specifications and requirements
  - Add model-specific notes and handling instructions

Step 4: Custom Model Addition
  - Add custom models to categories if needed
  - Custom models automatically added to Equipment Inventory
  - Define specifications for custom models
  - Set verification requirements for new models

Note: No quantities or site allocations in design phase:
  - Focus on WHICH categories and models are needed
  - Quantities determined during inventory management
  - Site allocations handled when adding project inventory
```

### 3. Design Validation & Completion Flow

```yaml
Step 1: Design Validation
  - Validate equipment category selection completeness
  - Check model selections within categories
  - Review required equipment coverage
  - Address validation issues and warnings

Step 2: Design Review (Optional for v1)
  - Submit category/model design for client review
  - Set status to "Under Review" (optional)
  - Notify stakeholders of design submission
  - Lock category/model selection for modifications

Step 3: Design Completion
  - Design ready for inventory management phase
  - Set status to ready for next phase
  - Equipment structure available for inventory allocation
  - Categories and models locked for consistency

Note: Design completion enables inventory management:
  - Equipment categories and models defined and approved
  - Quantities and site allocations handled in next phase
  - Design provides foundation for systematic verification
  - Approved design ready for project execution planning
```

---

## Integration Points

### 1. Equipment Inventory Integration

```yaml
Equipment Selection:
  - Use equipment categories and models from inventory
  - Browse hierarchical Category → Model structure
  - Access category verification requirements
  - Validate equipment availability and access

Equipment Information Inheritance:
  - Category verification requirements
  - Model specifications and details
  - Serial number requirements per category
  - Custom model addition capabilities
```

### 2. Project Inventory Management Integration

```yaml
Design Output to Inventory:
  - Equipment categories and models selected in design
  - Category and model specifications defined
  - Requirements and handling instructions
  - Foundation for quantity allocation and site distribution

Inventory Management Input:
  - Receives equipment structure from design
  - Allocates quantities per category/model per site
  - Maintains category-model organization
  - Preserves design specifications and requirements
```

### 3. Task Management Integration

```yaml
Task Creation from Design:
  - Generate tasks based on equipment categories and models
  - Category-specific work instructions and verification
  - Model-specific verification requirements
  - Site-specific task assignments with equipment context

Equipment Verification Workflow:
  - Task equipment organized by categories
  - Model-specific verification requirements
  - Serial number verification per category configuration
  - Mobile app verification checklist organization
```

---

## Implementation Roadmap

### Phase 1: Core Design Features (Weeks 1-3)

- Project design initialization for dismantling projects
- Equipment category and model selection interface
- Basic category-model relationship management
- Design validation and completeness checking

### Phase 2: Equipment Integration (Weeks 4-5)

- Equipment inventory category-model integration
- Custom model addition workflow
- Equipment specifications management
- Category verification configuration

### Phase 3: Design Workflow (Weeks 6-7)

- Design approval workflow (optional for v1)
- Validation and reporting enhancements
- Export functionality for design documentation
- Integration with inventory management phase

### Phase 4: Advanced Features (Weeks 8-9)

- Design history and change tracking
- Advanced validation rules
- User experience optimization
- Performance tuning and optimization

---

This Project Design specification provides a comprehensive workflow for designing dismantling projects using a hierarchical Category → Model approach, fully integrated with the equipment inventory system and supporting systematic equipment verification in mobile applications.

_Last Updated: 2024-12-28_
