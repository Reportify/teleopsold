# Equipment Inventory Specification: Dynamic Category-Model Hierarchy Implementation

## Overview

Updated the Equipment Inventory system to implement a **Dynamic Category → Model hierarchy** where equipment categories are created during inventory creation rather than being predefined. This approach provides maximum flexibility for tenants to define their own equipment organization while maintaining VLT-style verification workflows, systematic organization, and cross-project equipment reusability.

---

## Key Architecture Decisions

### 1. **Dynamic Category-Model Hierarchy Structure**

**Implemented Structure:**

```yaml
Equipment Organization:
  Dynamic Categories (Created During Inventory):
    - Categories created by tenants based on their specific needs
    - No predefined categories - fully tenant-driven
    - Category verification requirements set during creation
    - Examples from common usage:
      * CABINET: Equipment housing
      * CARDS: Electronic modules
      * DXU: Digital units
      * PSU: Power supplies
      * ANTENNA: Antenna equipment
      * RADIO: Radio equipment
      * CABLE: Cables and connectors
      * CUSTOM_CATEGORY: Tenant-specific equipment types

  Models (Specific Equipment Within Categories):
    - Models added to categories during inventory creation
    - Tenant-defined models based on actual equipment
    - Examples:
      * CABINET Models: [RBS-2964, RBS-2954, Custom-Cabinet-1]
      * CARDS Models: [EDRU 9P-03, Custom-Card-Type]
      * ANTENNA Models: [Sector-Antenna-900, Omni-Antenna-1800]
      * CUSTOM_CATEGORY Models: [Custom-Model-1, Custom-Model-2]

Benefits of Dynamic Hierarchy:
  - Complete tenant flexibility in equipment organization
  - No system-imposed equipment constraints
  - Categories reflect actual tenant equipment types
  - VLT-compatible verification workflows maintained
  - Tenant-specific verification requirements
  - Cross-technology equipment usage within tenant-defined categories
```

### 2. **Dynamic Category Configuration During Creation**

**Tenant-Defined Verification Requirements:**

```yaml
Category Creation Configuration (Examples):
  CABINET Category (Created by Tenant):
    unit_of_measurement: Unit (selected by tenant)
    requires_serial_number: true (configured by tenant)
    serial_number_optional: false (configured by tenant)
    verification_priority: High (set by tenant)
    allow_custom_model: true (tenant preference)
    category_description: "Equipment housing and cabinets"

  ANTENNA Category (Created by Tenant):
    unit_of_measurement: Unit
    requires_serial_number: false
    serial_number_optional: true
    verification_priority: Medium
    allow_custom_model: true
    category_description: "Antenna equipment and related hardware"

  CUSTOM_TELECOM Category (Created by Tenant):
    unit_of_measurement: Meter
    requires_serial_number: true
    serial_number_optional: false
    verification_priority: High
    allow_custom_model: true
    category_description: "Custom telecom equipment specific to our operations"

Dynamic Category Benefits:
  - Tenants define verification workflows per their categories
  - Serial number requirements based on tenant's equipment needs
  - Mobile app generates checklists from tenant-created categories
  - Verification priority reflects tenant's operational priorities
  - Categories match tenant's actual equipment organization
```

### 3. **Tenant-Driven Cross-Technology Equipment Organization**

**Tenant-Created Categories for Cross-Technology Usage:**

```yaml
Tenant-Driven Category Organization:
  Tenant Example: Vodafone MPCG
    Created Categories:
      - CABINET: Used across 2G, 3G, MW projects (tenant-defined)
      - ELECTRONIC_MODULES: Covers cards and digital units (tenant preference)
      - POWER_EQUIPMENT: Includes PSU and power-related equipment
      - ANTENNA_SYSTEMS: Tenant-specific antenna organization
      - TRANSMISSION: MW-specific equipment category

Technology-Agnostic Design:
  - No system constraints on category usage across technologies
  - Tenants organize equipment categories based on their operational needs
  - Models within tenant categories can span multiple technologies
  - Equipment verification workflows based on tenant-defined categories

Real-World Tenant Examples:
  Vodafone MPCG Categories:
    2G Project Equipment:
      - CABINET: [RBS-2106, RBS-2101] (tenant-defined models)
      - ELECTRONIC_MODULES: [DTRU, DRU-900] (tenant's preferred organization)
      - POWER_EQUIPMENT: [PSU-DC-32] (tenant-created category)

  Airtel UPE Categories:
    MW Project Equipment:
      - RADIO_EQUIPMENT: [Radio-Unit-1, Radio-Unit-2] (different tenant categorization)
      - TRANSMISSION: [MW-Link-Equipment] (tenant-specific category)
      - POWER_SYSTEMS: [DC-Power-Supply] (tenant's power organization)

  ABC Vendor Categories:
    Cross-Technology Equipment:
      - DISMANTLING_EQUIPMENT: [Tools, Cables] (vendor-specific categories)
      - TELECOM_HARDWARE: [Various equipment types] (vendor's organization)
```

---

## Database Schema Implementation

### **Dynamic Category-Model Tables**

```sql
-- Equipment Categories Table (No Predefined Categories)
CREATE TABLE equipment_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Category Information (Tenant-Defined)
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measurement VARCHAR(50) NOT NULL DEFAULT 'Unit',

    -- Verification Configuration (Tenant-Configured)
    requires_serial_number BOOLEAN DEFAULT false,
    serial_number_optional BOOLEAN DEFAULT true,
    allow_custom_model BOOLEAN DEFAULT true,
    verification_priority VARCHAR(20) DEFAULT 'Medium',

    -- Category Configuration
    is_active BOOLEAN DEFAULT true,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, category_name),
    CHECK (unit_of_measurement IN ('Unit', 'Meter', 'Kilogram', 'Liter', 'Square Meter')),
    CHECK (verification_priority IN ('High', 'Medium', 'Low'))
);

-- Equipment Models Table (All Tenant-Created)
CREATE TABLE equipment_models (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,

    -- Model Information (Tenant-Defined)
    model_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    description TEXT,
    specifications JSONB DEFAULT '{}',

    -- Model Configuration
    is_active BOOLEAN DEFAULT true,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(category_id, model_name)
);

-- Equipment Not Found Reasons (System-Wide)
CREATE TABLE equipment_not_found_reasons (
    id BIGSERIAL PRIMARY KEY,
    reason_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    UNIQUE(reason_name)
);

-- Insert predefined not found reasons (only system-level configuration)
INSERT INTO equipment_not_found_reasons (reason_name, description, display_order) VALUES
('Not Found', 'Equipment completely missing from site', 1),
('Used by BSS', 'Equipment in use by base station', 2),
('Engaged with other Technology', 'Equipment repurposed for other technology', 3),
('Post RFI', 'Equipment status pending RFI response', 4),
('Others', 'Custom reason - requires additional details', 5);

-- Note: No predefined equipment categories - all categories created by tenants during inventory creation
```

---

## Workflow Integration

### **Dynamic Equipment Creation Through Project Workflow**

```yaml
Phase 1: Project Design (Equipment Definition & Organization)
  Equipment Creation Process:
    - Client creates equipment categories based on project needs (e.g., CABINET, ANTENNA, RADIO)
    - Define category verification requirements during creation
    - Add specific models within each created category
    - Configure category-specific verification settings
    - NO quantities defined in design phase

  Design Output:
    - Client-created equipment categories with verification rules
    - Tenant-defined models within each category
    - Equipment specifications per model
    - Category-specific verification requirements

Phase 2: Project Inventory Management (Equipment Finalization & Site Allocation)
  Inventory Process:
    - Finalize equipment categories and models from design
    - Add additional categories/models as needed during inventory (secondary creation option)
    - Client allocates quantities per category-model per site
    - Site-specific equipment inventory created
    - Equipment categories and models locked for project

Equipment Category Creation Flexibility:
  - Primary Creation: Design phase (recommended for better planning and organization)
  - Secondary Creation: Inventory phase (for additional categories discovered during inventory)
  - Both phases support complete category creation with verification requirements
  - Categories created in either phase integrate seamlessly into the project workflow

  Inventory Output:
    - Finalized equipment categories and models
    - Site-specific equipment allocations by category-model
    - Quantities per equipment model per site
    - Equipment ready for task creation and verification

Phase 3: Task Creation (Equipment Inheritance)
  Task Equipment Process:
    - Tasks inherit equipment from project site inventory
    - Client-created category-model-quantity combinations per task
    - Equipment verification checklists generated from client categories
    - Mobile app verification workflow based on client's category configuration

  Task Output:
    - Client-organized equipment verification checklists
    - Model-specific verification requirements from client's setup
    - Serial number verification rules per client-created category
    - GPS photo requirements per equipment item
```

### **Mobile App Equipment Verification**

```yaml
Dynamic Category-Based Mobile App Interface:
  Verification Organization:
    - Equipment organized by client-created categories
    - Models displayed within each client-defined category
    - Category-specific verification workflows based on client configuration
    - Serial number requirements per client-configured category

  Verification Workflow:
    Step 1: Category Selection (from client's created categories, e.g., CABINET, ANTENNA, RADIO)
    Step 2: Model Verification within client-defined category
    Step 3: Found/Not Found determination
    Step 4: Serial number verification (if required by client's category configuration)
    Step 5: GPS-tagged photo capture
    Step 6: Equipment condition assessment
    Step 7: Progress update and next client-defined category

  Client-Configured Features:
    - Verification priority based on client's category configuration
    - Serial number requirements based on client's settings per category
    - GPS photo requirements consistent with client's verification rules
    - Mobile app adapts to client's equipment organization

Example Mobile App Adaptation:
  Vodafone MPCG Project:
    Categories: [CABINET, ELECTRONIC_MODULES, POWER_EQUIPMENT, ANTENNA_SYSTEMS]
    Verification Priority: Client-defined (High for CABINET, Medium for others)
    Serial Requirements: Per client's category configuration

  ABC Vendor Project:
    Categories: [TELECOM_HARDWARE, DISMANTLING_TOOLS, CABLE_EQUIPMENT]
    Verification Priority: Vendor-defined based on their operations
    Serial Requirements: Vendor's specific verification needs
```

---

## API Endpoints Updated

### **Dynamic Category Creation APIs**

```yaml
# Dynamic Equipment Categories (All Tenant-Created)
GET    /api/equipment/categories/                 # List tenant's equipment categories
POST   /api/equipment/categories/                 # Create new category during inventory
GET    /api/equipment/categories/{id}/            # Get category details
PUT    /api/equipment/categories/{id}/            # Update tenant's category
DELETE /api/equipment/categories/{id}/            # Delete tenant's category

# Equipment Models within Tenant Categories
GET    /api/equipment/categories/{id}/models/     # List models in tenant's category
POST   /api/equipment/categories/{id}/models/     # Add model to tenant's category
GET    /api/equipment/models/{id}/                # Get model details
PUT    /api/equipment/models/{id}/                # Update model
DELETE /api/equipment/models/{id}/                # Delete model

# Project Design with Dynamic Categories
POST   /api/equipment/create-category-with-models/ # Create category with models during design
GET    /api/equipment/for-project-design/         # Get tenant's categories and models for design
POST   /api/equipment/save-project-equipment/     # Save project equipment with new categories
GET    /api/equipment/verification-config/        # Get mobile app verification config from tenant categories

# Equipment Search and Management
GET    /api/equipment/search/                     # Search tenant's categories and models
POST   /api/equipment/bulk-create/                # Bulk create categories and models
GET    /api/equipment/models/by-category/{category_name}/ # Get models by tenant's category name
GET    /api/equipment/category-suggestions/       # Get category name suggestions for tenant

# Inventory Creation Integration
POST   /api/equipment/inventory/create-with-equipment/ # Create inventory with new categories/models
PUT    /api/equipment/inventory/{id}/add-equipment/    # Add new equipment to existing inventory
GET    /api/equipment/inventory/{id}/equipment/        # Get equipment for specific inventory
```

---

## Business Logic Updates

### **Dynamic Equipment Management Service**

```python
class EquipmentInventoryService:
    """Dynamic category-model hierarchy equipment management"""

    def create_category_during_inventory(self, category_data, user):
        """Create equipment category during inventory creation"""
        # Validate category name uniqueness within tenant
        existing = EquipmentCategory.objects.filter(
            tenant_id=user.tenant_id,
            category_name=category_data['category_name'],
            deleted_at__isnull=True
        ).exists()

        if existing:
            raise ValidationError("Equipment category already exists for this tenant")

        # Create tenant-specific category
        category = EquipmentCategory.objects.create(
            tenant_id=user.tenant_id,
            category_name=category_data['category_name'],
            description=category_data.get('description', ''),
            unit_of_measurement=category_data.get('unit_of_measurement', 'Unit'),
            requires_serial_number=category_data.get('requires_serial_number', False),
            serial_number_optional=category_data.get('serial_number_optional', True),
            verification_priority=category_data.get('verification_priority', 'Medium'),
            allow_custom_model=category_data.get('allow_custom_model', True),
            created_by=user
        )

        # Create initial models if provided
        if 'models' in category_data:
            for model_data in category_data['models']:
                self.add_model_to_category(category.id, model_data, user)

        return category

    def create_inventory_with_equipment(self, inventory_data, user):
        """Create inventory with new equipment categories and models"""
        # Create inventory record first
        inventory = ProjectInventory.objects.create(
            project_id=inventory_data['project_id'],
            tenant_id=user.tenant_id,
            created_by=user
        )

        # Create equipment categories and models as needed
        for equipment_item in inventory_data['equipment_items']:
            # Create category if it doesn't exist
            category = None
            if 'category_id' in equipment_item:
                category = EquipmentCategory.objects.get(
                    id=equipment_item['category_id'],
                    tenant_id=user.tenant_id
                )
            else:
                # Create new category
                category = self.create_category_during_inventory(
                    equipment_item['category_data'], user
                )

            # Create models if needed
            for model_data in equipment_item.get('models', []):
                model = None
                if 'model_id' in model_data:
                    model = EquipmentModel.objects.get(
                        id=model_data['model_id'],
                        category_id=category.id
                    )
                else:
                    # Create new model
                    model = self.add_model_to_category(
                        category.id, model_data, user
                    )

                # Create inventory line item
                InventoryLineItem.objects.create(
                    inventory=inventory,
                    category=category,
                    model=model,
                    quantity=model_data.get('quantity', 1),
                    site_id=equipment_item.get('site_id')
                )

        return inventory

    def get_tenant_equipment_for_project_design(self, tenant_id):
        """Get tenant's existing categories and models for project design"""
        categories = EquipmentCategory.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
            deleted_at__isnull=True
        ).prefetch_related('models').order_by('verification_priority', 'category_name')

        equipment_structure = {}
        for category in categories:
            equipment_structure[category.category_name] = {
                'id': category.id,
                'description': category.description,
                'unit_of_measurement': category.unit_of_measurement,
                'requires_serial_number': category.requires_serial_number,
                'serial_number_optional': category.serial_number_optional,
                'verification_priority': category.verification_priority,
                'allow_custom_model': category.allow_custom_model,
                'models': [
                    {
                        'id': model.id,
                        'name': model.model_name,
                        'manufacturer': model.manufacturer,
                        'description': model.description,
                        'specifications': model.specifications
                    }
                    for model in category.models.filter(
                        is_active=True,
                        deleted_at__isnull=True
                    ).order_by('model_name')
                ]
            }

        return equipment_structure

    def get_mobile_verification_config(self, tenant_id, project_id=None):
        """Get tenant's category-based verification configuration for mobile app"""
        # Get categories from specific project if provided, otherwise all tenant categories
        if project_id:
            project = Project.objects.get(id=project_id, tenant_id=tenant_id)
            category_ids = project.get_equipment_category_ids()
            categories = EquipmentCategory.objects.filter(
                id__in=category_ids,
                tenant_id=tenant_id,
                is_active=True
            ).prefetch_related('models').order_by('verification_priority')
        else:
            categories = EquipmentCategory.objects.filter(
                tenant_id=tenant_id,
                is_active=True,
                deleted_at__isnull=True
            ).prefetch_related('models').order_by('verification_priority')

        verification_config = {}
        for category in categories:
            verification_config[category.category_name] = {
                'requires_serial_number': category.requires_serial_number,
                'serial_number_optional': category.serial_number_optional,
                'verification_priority': category.verification_priority,
                'unit_of_measurement': category.unit_of_measurement,
                'models': [
                    {
                        'id': model.id,
                        'name': model.model_name,
                        'manufacturer': model.manufacturer,
                        'specifications': model.specifications
                    }
                    for model in category.models.filter(is_active=True)
                ]
            }

        return {
            'categories': verification_config,
            'not_found_reasons': [
                'Not Found',
                'Used by BSS',
                'Engaged with other Technology',
                'Post RFI',
                'Others'
            ]
        }

    def save_project_equipment_with_new_categories(self, project_id, equipment_data, user):
        """Save project equipment design with newly created categories"""
        project = Project.objects.get(id=project_id, tenant_id=user.tenant_id)

        created_equipment = []
        for equipment_item in equipment_data:
            # Create or get category
            if 'category_id' in equipment_item:
                category = EquipmentCategory.objects.get(
                    id=equipment_item['category_id'],
                    tenant_id=user.tenant_id
                )
            else:
                category = self.create_category_during_inventory(
                    equipment_item['category_data'], user
                )

            # Create or get models
            models = []
            for model_data in equipment_item.get('models', []):
                if 'model_id' in model_data:
                    model = EquipmentModel.objects.get(
                        id=model_data['model_id'],
                        category_id=category.id
                    )
                else:
                    model = self.add_model_to_category(category.id, model_data, user)
                models.append(model)

            created_equipment.append({
                'category': category,
                'models': models
            })

        # Save design with created equipment
        project.equipment_design = {
            'equipment_categories': [
                {
                    'category_id': item['category'].id,
                    'category_name': item['category'].category_name,
                    'model_ids': [model.id for model in item['models']]
                }
                for item in created_equipment
            ],
            'design_completed_at': timezone.now().isoformat(),
            'designed_by': user.id
        }
        project.design_status = 'COMPLETED'
        project.save()

        return project

    def suggest_category_names(self, tenant_id, query=''):
        """Suggest category names based on tenant's existing categories and common patterns"""
        # Get tenant's existing categories
        existing_categories = list(
            EquipmentCategory.objects.filter(
                tenant_id=tenant_id,
                is_active=True
            ).values_list('category_name', flat=True)
        )

        # Common telecom equipment category suggestions
        common_suggestions = [
            'CABINET', 'ANTENNA', 'RADIO', 'POWER_SUPPLY', 'CABLES',
            'ELECTRONIC_MODULES', 'TRANSMISSION', 'COOLING_EQUIPMENT',
            'BATTERY_BACKUP', 'CONNECTORS', 'TOOLS', 'HARDWARE'
        ]

        # Filter suggestions based on query and exclude existing
        if query:
            suggestions = [
                cat for cat in common_suggestions
                if query.upper() in cat and cat not in existing_categories
            ]
        else:
            suggestions = [
                cat for cat in common_suggestions
                if cat not in existing_categories
            ]

        return {
            'existing_categories': existing_categories,
            'suggested_categories': suggestions[:10]  # Limit to 10 suggestions
        }
```

---

## Implementation Benefits

### **✅ Complete Tenant Flexibility**

- No hardcoded equipment categories - fully tenant-driven
- Categories created during inventory creation based on actual needs
- Tenant-specific verification requirements per category
- Complete freedom in equipment organization and naming

### **✅ VLT Compatibility with Tenant Control**

- Category-based equipment organization maintains VLT workflows
- Tenant-configured serial number verification by category
- Dynamic equipment verification checklists based on tenant categories
- GPS-tagged photo requirements per tenant-defined equipment
- Found/Not Found workflow with tenant's equipment organization

### **✅ Cross-Technology Equipment Usage (Tenant-Defined)**

- Tenants define categories used across their project types
- No system-imposed technology barriers
- Equipment models within tenant categories can span multiple technologies
- Flexible equipment assignment within tenant-created categories

### **✅ Dynamic Equipment Management**

- Category → Model hierarchy created by tenants during operations
- Tenant-specific verification requirements
- Mobile app adapts to tenant's equipment organization
- Equipment specifications and models fully customizable

### **✅ Integrated Workflow with Dynamic Creation**

- Project Design: Create and organize tenant equipment categories
- Project Inventory: Add equipment during inventory creation
- Task Management: Equipment inheritance from tenant-defined structure
- Mobile App: Category-organized verification based on tenant's setup

---

## Migration Strategy

### **Transition to Dynamic Categories**

```yaml
Migration Approach:
  1. Remove all predefined categories from system
  2. Existing equipment data preserved but restructured
  3. Convert flat equipment types to tenant-created categories
  4. Equipment models extracted and associated with tenant categories
  5. Tenant-specific verification requirements applied during migration

Data Transformation Examples:
  Tenant: Vodafone MPCG
    "Jumper" → Create Category: "CABLE_EQUIPMENT", Model: "RF Jumper Cable"
    "Power Cable" → Add to Category: "CABLE_EQUIPMENT", Model: "Power Cable"
    "PSU" → Create Category: "POWER_SUPPLY", Model: "PSU-DC-32"
    "Cabinet" → Create Category: "CABINET", Model: "RBS-2964"

  Tenant: ABC Vendor
    "Jumper" → Create Category: "TOOLS_EQUIPMENT", Model: "RF Jumper Cable"
    "PSU" → Create Category: "TELECOM_HARDWARE", Model: "PSU-DC-32"
    "Tools" → Add to Category: "TOOLS_EQUIPMENT", Model: "Dismantling Tools"

Migration Benefits:
  - Each tenant gets their own equipment categorization
  - No shared categories between tenants
  - Tenant-specific verification requirements
  - Complete equipment organization flexibility per tenant

Project Updates:
  - Existing projects converted to tenant-specific category-model mappings
  - Equipment selections converted to tenant's category-model format
  - Task equipment inheritance updated to use tenant's hierarchy
  - Mobile app verification adapted to tenant's categories
```

---

## Future Extensibility

### **Unlimited Tenant-Driven Equipment Growth**

```yaml
New Equipment Support:
  - Tenants create any categories needed (e.g., ANTENNA, RADIO, 5G_EQUIPMENT)
  - Add unlimited models within tenant categories
  - Configure verification requirements per tenant category
  - Mobile app automatically adapts to tenant's new categories

Technology Evolution:
  - 4G/5G equipment in tenant-created categories
  - IoT, Edge Computing equipment in tenant categories
  - Any new technology equipment supported through tenant categories
  - Category-specific verification workflows fully scalable

Tenant Equipment Freedom:
  - Complete freedom to add any equipment categories
  - Unlimited models within tenant categories
  - Full control over verification requirements
  - Private equipment organization per tenant
  - No system limitations on equipment types

Business Model Benefits:
  - Different tenants can organize same equipment differently
  - Tenant-specific equipment management approaches
  - Custom verification workflows per tenant business needs
  - Equipment organization reflects tenant's operational preferences

Examples of Tenant Flexibility:
  Vodafone Approach:
    - Categories: [CABINET, ELECTRONIC_CARDS, POWER_SYSTEMS, ANTENNA_SYSTEMS]
    - Verification: High priority for CABINET, ELECTRONIC_CARDS

  Airtel Approach:
    - Categories: [RADIO_EQUIPMENT, TRANSMISSION, POWER, INFRASTRUCTURE]
    - Verification: Different priority system based on their operations

  ABC Vendor Approach:
    - Categories: [CLIENT_TELECOM_EQUIPMENT, DISMANTLING_TOOLS, VEHICLE_EQUIPMENT]
    - Verification: Tools-focused organization reflecting vendor operations
```

---

This specification establishes **Dynamic Category-Model hierarchy** as the foundation for all equipment management, ensuring complete tenant flexibility while maintaining VLT compatibility, cross-technology usage, and systematic verification workflows. Equipment categories are created by tenants during inventory creation, providing unlimited customization that integrates seamlessly with project design, inventory management, and mobile app verification.

**Key Achievement**: Complete removal of hardcoded equipment categories, enabling tenants to define their own equipment organization based on their specific operational needs and equipment types.

_Last Updated: 2024-12-28_
