# Teleops Equipment Inventory Specification

## Overview

The Equipment Inventory module provides a comprehensive master database of all equipment used in telecom infrastructure dismantling projects. This system supports detailed project design by allowing clients to specify equipment categories and models for dismantling operations. The system uses a hierarchical **Category → Model** structure based on proven VLT architecture for equipment organization and verification.

---

## Business Context

### Equipment Management Architecture

```yaml
Equipment Inventory Structure:
  - Hierarchical Category → Model organization
  - Master database of equipment categories and models
  - Multi-tenant isolation for custom equipment
  - Integration with project design and task verification
  - Equipment verification workflow support

Project Integration Flow: 1. Equipment Inventory (master data) →
  2. Project Design (category/model selection) →
  3. Project Inventory (quantities per site) →
  4. Task Creation (equipment inheritance) →
  5. Mobile Verification (VLT-style checklist)

Equipment Philosophy:
  - Cross-technology equipment usage (no technology constraints)
  - Category-based organization for systematic verification
  - Model-specific details for accurate identification
  - Extensible structure for new equipment types
```

### Category-Model Hierarchy

```yaml
Equipment Structure:
  Category Level:
    - Tenant-created equipment classification (tenant-defined categories)
    - Used for verification checklist organization
    - Determines verification workflow requirements

  Model Level:
    - Specific equipment models within category
    - Manufacturer-specific designations
    - Used for precise equipment identification
    - Links to technical specifications

  Example Tenant-Created Hierarchy:
    Tenant-Created Category: CABINET (by Vodafone MPCG)
      Tenant-Added Models: [RBS-2964, RBS-2954, Custom-Cabinet-1]
    Tenant-Created Category: ELECTRONIC_MODULES (by Vodafone MPCG)
      Tenant-Added Models: [EDRU 9P-03, DTRU, Custom-Module-1]
    Tenant-Created Category: RADIO_EQUIPMENT (by ABC Vendor)
      Tenant-Added Models: [Radio-Unit-1, Radio-Unit-2]
```

---

## Equipment Data Structure

### Core Equipment Fields

```yaml
Required Fields:
  - equipment_category_id: integer (foreign key to equipment_categories table)
- equipment_model_id: integer (foreign key to equipment_models table)

Note: Equipment category and model names are retrieved through JOIN operations with the equipment_categories and equipment_models tables for proper normalization.
  - unit_of_measurement: enum (Unit, Meter, Kilogram, etc.)

Optional Fields:
  - manufacturer: string (equipment manufacturer)
  - description: text (detailed description)
  - specifications: json (technical specifications)
  - requires_serial_number: boolean (serial number verification required)
  - serial_number_optional: boolean (serial number verification optional)
  - allow_custom_model: boolean (allow custom model entry)

System Fields:
  - id: bigint (auto-generated primary key)
  - tenant_id: uuid (multi-tenant isolation)
  - is_predefined: boolean (system vs tenant-specific)
  - is_active: boolean (active/inactive equipment)
  - created_by: integer (user who created)
  - created_at: timestamp
  - updated_at: timestamp
  - deleted_at: timestamp (soft delete)
```

### Dynamic Equipment Categories (Tenant-Created)

#### Category Creation During Inventory Process

```yaml
Dynamic Category Creation Approach:
  Category Examples (Created by Tenants):
    CABINET:
      description: Equipment cabinet housing (tenant-defined)
      unit: Unit (tenant-configured)
      requires_serial_number: true (tenant-configured)
      serial_number_optional: false (tenant-configured)
      tenant_models: [RBS-2964, RBS-2954, Custom-Cabinet-1] (tenant-added)

    ANTENNA:
      description: Antenna equipment and related hardware (tenant-defined)
      unit: Unit (tenant-configured)
      requires_serial_number: false (tenant-configured)
      serial_number_optional: true (tenant-configured)
      tenant_models: [Sector-Antenna-900, Omni-Antenna-1800] (tenant-added)

    RADIO_EQUIPMENT:
      description: Radio units and transmission equipment (tenant-defined)
      unit: Unit (tenant-configured)
      requires_serial_number: true (tenant-configured)
      serial_number_optional: false (tenant-configured)
      tenant_models: [Radio-Unit-1, Radio-Unit-2] (tenant-added)

    CUSTOM_TELECOM:
      description: Custom telecom equipment specific to operations (tenant-defined)
      unit: Meter (tenant-configured)
      requires_serial_number: true (tenant-configured)
      serial_number_optional: false (tenant-configured)
      tenant_models: [Custom-Model-1, Custom-Model-2] (tenant-added)

Tenant Category Creation Benefits:
  - Complete flexibility in equipment organization
  - Categories reflect actual tenant equipment types
  - No system-imposed equipment constraints
  - Tenant-specific verification requirements
  - VLT-compatible verification workflows maintained
  - Cross-technology equipment usage within tenant-defined categories

Common Category Examples (Tenant Usage Patterns):
  - CABINET: Equipment housing across all project types
  - CARDS/ELECTRONIC_MODULES: Electronic components and modules
  - POWER_EQUIPMENT: Power supplies and related equipment
  - ANTENNA_SYSTEMS: Antenna equipment and mounting
  - TRANSMISSION: Microwave and transmission equipment
  - CABLE_EQUIPMENT: Cables, connectors, and wiring
  - TOOLS_EQUIPMENT: Dismantling tools and equipment (vendor-specific)
  - CUSTOM_CATEGORY: Any tenant-specific equipment classification
```

### Equipment Verification Configuration

```yaml
Verification Settings:
  Serial Number Requirements (Tenant-Configured):
    - Required: Tenant configures per category (e.g., CABINET, ELECTRONIC_MODULES)
    - Optional: Tenant configures per category (e.g., TOOLS, ACCESSORIES)
    - None: Tenant choice for any category (fully configurable)

  Not Found Reasons:
    - "Not Found": Equipment completely missing
    - "Used by BSS": Equipment in use by base station
    - "Engaged with other Technology": Equipment repurposed
    - "Post RFI": Equipment status pending RFI response
    - "Others": Custom reason with text input

  Verification States:
    - Found/Not Found: Mandatory selection
    - Serial Match/No Match: For found equipment with serials
    - Corrected Serial: When actual differs from planned
    - Condition Assessment: Equipment physical condition
```

---

## Equipment Management Features

### 1. Equipment Category Management

#### Category Configuration

```yaml
Category Operations:
  - Create new equipment categories
  - Define category verification requirements
  - Set serial number requirements
  - Configure custom model allowance
  - Manage category activation/deactivation

Category Properties:
  - Category name and description
  - Unit of measurement
  - Serial number verification settings
  - Custom model allowance
  - Verification workflow configuration
```

#### Model Management

```yaml
Model Operations:
  - Add models to existing categories
  - Update model specifications
  - Mark models as active/inactive
  - Set manufacturer information
  - Configure model-specific settings

Model Properties:
  - Model name and description
  - Manufacturer information
  - Technical specifications
  - Verification requirements
  - Custom model flag
```

### 2. Equipment Search and Selection

#### Category-Based Browsing

```yaml
Equipment Selection Interface:
  Category Navigation:
    - Browse by equipment category
    - View models within category
    - Filter by manufacturer
    - Search by model name

  Selection Methods:
    - Select entire category (all models)
    - Select specific models within category
    - Add custom models to categories
    - Bulk model selection

  Integration with Project Design:
    - Equipment selection for project design
    - Category-model combinations
    - Project-specific model additions
    - Design phase equipment inheritance
```

### 3. Multi-Tenant Equipment Management

#### Predefined vs Custom Equipment

```yaml
Predefined Equipment:
  - System-wide equipment categories and models
  - Read-only for most users
  - Standard telecom equipment
  - Cross-tenant availability

Custom Equipment:
  - Tenant-specific additions
  - Client-created categories/models
  - Private to creating tenant
  - Full modification rights

Equipment Inheritance:
  - Projects inherit from selected equipment
  - Site-specific model allocations
  - Task-level verification checklists
  - Mobile app verification workflow
```

---

## Database Schema

### Equipment Inventory Tables

```sql
-- Equipment Categories Table (All Tenant-Created)
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

-- Equipment Not Found Reasons (Predefined)
CREATE TABLE equipment_not_found_reasons (
    id BIGSERIAL PRIMARY KEY,
    reason_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    UNIQUE(reason_name)
);

-- Insert predefined not found reasons
INSERT INTO equipment_not_found_reasons (reason_name, description, display_order) VALUES
('Not Found', 'Equipment completely missing from site', 1),
('Used by BSS', 'Equipment in use by base station', 2),
('Engaged with other Technology', 'Equipment repurposed for other technology', 3),
('Post RFI', 'Equipment status pending RFI response', 4),
('Others', 'Custom reason - requires additional details', 5);
```

### Performance Indexes

```sql
-- Equipment Categories Indexes
CREATE INDEX idx_equipment_categories_tenant ON equipment_categories(tenant_id);
CREATE INDEX idx_equipment_categories_active ON equipment_categories(is_active);
CREATE INDEX idx_equipment_categories_priority ON equipment_categories(verification_priority);

-- Equipment Models Indexes
CREATE INDEX idx_equipment_models_category ON equipment_models(category_id);
CREATE INDEX idx_equipment_models_active ON equipment_models(is_active);

-- Search Indexes
CREATE INDEX idx_models_search ON equipment_models USING GIN (
    to_tsvector('english',
        COALESCE(model_name, '') || ' ' ||
        COALESCE(manufacturer, '') || ' ' ||
        COALESCE(description, '')
    )
);
```

---

## API Endpoints

### Equipment Category Management

```yaml
# Equipment Categories
GET    /api/equipment/categories/                 # List equipment categories
POST   /api/equipment/categories/                 # Create new category
GET    /api/equipment/categories/{id}/            # Get category details
PUT    /api/equipment/categories/{id}/            # Update category
DELETE /api/equipment/categories/{id}/            # Delete category

# Equipment Models
GET    /api/equipment/categories/{id}/models/     # List models in category
POST   /api/equipment/categories/{id}/models/     # Add model to category
GET    /api/equipment/models/{id}/                # Get model details
PUT    /api/equipment/models/{id}/                # Update model
DELETE /api/equipment/models/{id}/                # Delete model

# Equipment Search
GET    /api/equipment/search/                     # Search tenant equipment
POST   /api/equipment/categories/validate-name/   # Validate category name

# Equipment Configuration
GET    /api/equipment/not-found-reasons/          # Get not found reasons
GET    /api/equipment/verification-config/        # Get verification settings
GET    /api/equipment/category-suggestions/       # Get category name suggestions for tenant
```

---

## Business Logic Layer

### Equipment Management Service

```python
class EquipmentInventoryService:
    """Core business logic for equipment inventory management"""

    def create_equipment_category(self, category_data, user):
        """Create new equipment category"""
        # Validate category name uniqueness
        existing = EquipmentCategory.objects.filter(
            tenant_id=user.tenant_id,
            category_name=category_data['category_name'],
            deleted_at__isnull=True
        ).exists()

        if existing:
            raise ValidationError("Equipment category already exists")

        # Create category
        category = EquipmentCategory.objects.create(
            tenant_id=user.tenant_id,
            **category_data,
            created_by=user
        )

        # Create default models if provided
        if 'default_models' in category_data:
            for model_name in category_data['default_models']:
                self.add_model_to_category(category.id, {
                    'model_name': model_name,
                    'is_custom_model': False
                }, user)

        return category

    def add_model_to_category(self, category_id, model_data, user):
        """Add equipment model to category"""
        category = EquipmentCategory.objects.get(
            id=category_id,
            tenant_id=user.tenant_id
        )

        # Validate model name uniqueness within category
        existing = EquipmentModel.objects.filter(
            category_id=category_id,
            model_name=model_data['model_name'],
            deleted_at__isnull=True
        ).exists()

        if existing:
            raise ValidationError("Model already exists in this category")

        # Create model
        model = EquipmentModel.objects.create(
            category_id=category_id,
            **model_data,
            created_by=user
        )

        return model

    def get_equipment_for_project_design(self, tenant_id):
        """Get tenant's existing equipment categories and models for project design"""
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

    def get_verification_configuration(self, tenant_id):
        """Get tenant's equipment verification configuration for mobile app"""
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

        # Add not found reasons
        not_found_reasons = list(
            EquipmentNotFoundReason.objects.filter(
                is_active=True
            ).order_by('display_order').values_list('reason_name', flat=True)
        )

        return {
            'categories': verification_config,
            'not_found_reasons': not_found_reasons
        }

    def search_equipment(self, query, tenant_id, filters=None):
        """Search tenant's equipment categories and models"""
        # Base query for categories (tenant-specific only)
        categories_query = EquipmentCategory.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
            deleted_at__isnull=True
        )

        # Base query for models
        models_query = EquipmentModel.objects.filter(
            category__in=categories_query,
            is_active=True,
            deleted_at__isnull=True
        )

        # Apply text search if provided
        if query:
            categories_query = categories_query.filter(
                Q(category_name__icontains=query) |
                Q(description__icontains=query)
            )

            models_query = models_query.filter(
                Q(model_name__icontains=query) |
                Q(manufacturer__icontains=query) |
                Q(description__icontains=query)
            )

        # Apply filters
        if filters:
            if 'category' in filters:
                models_query = models_query.filter(
                    category__category_name=filters['category']
                )

            if 'manufacturer' in filters:
                models_query = models_query.filter(
                    manufacturer__icontains=filters['manufacturer']
                )

        return {
            'categories': list(categories_query.values()),
            'models': list(models_query.select_related('category').values(
                'id', 'model_name', 'manufacturer', 'description',
                'category__category_name', 'specifications'
            ))
        }
```

---

## Frontend Integration

### Equipment Selection Interface

```typescript
// Equipment Types
interface EquipmentCategory {
  id: number;
  category_name: string;
  description: string;
  unit_of_measurement: string;
  requires_serial_number: boolean;
  serial_number_optional: boolean;
  allow_custom_model: boolean;
  models: EquipmentModel[];
}

interface EquipmentModel {
  id: number;
  model_name: string;
  manufacturer?: string;
  description?: string;
  specifications?: Record<string, any>;
  category_id: number;
}

interface EquipmentVerificationConfig {
  categories: {
    [categoryName: string]: {
      requires_serial_number: boolean;
      serial_number_optional: boolean;
      allow_custom_model: boolean;
      models: string[];
    };
  };
  not_found_reasons: string[];
}

// Equipment Management Hook
export const useEquipmentInventory = () => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [verificationConfig, setVerificationConfig] = useState<EquipmentVerificationConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEquipmentForProjectDesign = useCallback(async () => {
    setLoading(true);
    try {
      const equipment = await equipmentAPI.getForProjectDesign();
      setCategories(equipment);
      return equipment;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVerificationConfig = useCallback(async () => {
    try {
      const config = await equipmentAPI.getVerificationConfig();
      setVerificationConfig(config);
      return config;
    } catch (error) {
      throw error;
    }
  }, []);

  const createCategory = useCallback(async (categoryData: CreateCategoryRequest) => {
    try {
      const newCategory = await equipmentAPI.createCategory(categoryData);
      setCategories((prev) => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      throw error;
    }
  }, []);

  const addModelToCategory = useCallback(async (categoryId: number, modelData: CreateModelRequest) => {
    try {
      const newModel = await equipmentAPI.addModel(categoryId, modelData);
      setCategories((prev) => prev.map((cat) => (cat.id === categoryId ? { ...cat, models: [...cat.models, newModel] } : cat)));
      return newModel;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    categories,
    verificationConfig,
    loading,
    loadEquipmentForProjectDesign,
    loadVerificationConfig,
    createCategory,
    addModelToCategory,
  };
};
```

---

## Integration Points

### 1. Project Design Integration

```yaml
Equipment Selection for Projects:
  - Browse equipment by category
  - Select specific models within categories
  - Add custom models during design
  - Equipment requirements inheritance
  - Category-based project planning

Project Design Workflow: 1. Select equipment categories needed for project
  2. Choose specific models within each category
  3. Add custom models if not available
  4. Define equipment specifications
  5. Equipment selection flows to inventory management
```

### 2. Task Verification Integration

```yaml
Mobile App Equipment Verification:
  - Category-based equipment checklists
  - Model-specific verification requirements
  - Serial number verification configuration
  - Not found reason selection
  - Equipment condition assessment

Verification Workflow: 1. Task inherits equipment from project design
  2. Mobile app displays category-organized checklist
  3. Each equipment item verified per category rules
  4. Serial number matching based on category config
  5. Not found reasons selected from predefined list
```

### 3. Multi-Tenant Equipment Management

```yaml
Equipment Sharing:
  - Predefined equipment available to all tenants
  - Custom equipment private to creating tenant
  - Model additions automatically available within tenant
  - Category modifications isolated by tenant

Equipment Access Control:
  - Read access to predefined equipment
  - Full access to tenant-specific equipment
  - Role-based category management
  - Model creation permissions
```

---

## Implementation Roadmap

### Phase 1: Core Equipment Structure (Weeks 1-2)

- Equipment categories and models database schema
- Basic CRUD operations for categories and models
- Category-model hierarchy implementation
- Predefined equipment data seeding

### Phase 2: Equipment Selection Interface (Weeks 3-4)

- Category browsing and model selection
- Custom model addition workflow
- Equipment search and filtering
- Project design integration

### Phase 3: Verification Configuration (Weeks 5-6)

- Verification requirements configuration
- Not found reasons management
- Mobile app configuration APIs
- Equipment verification workflow support

### Phase 4: Advanced Features (Weeks 7-8)

- Equipment specifications management
- Advanced search and filtering
- Bulk equipment operations
- Equipment analytics and reporting

---

This Equipment Inventory specification provides a solid foundation for hierarchical equipment management that integrates seamlessly with project design, inventory management, and mobile verification workflows. The Category → Model structure ensures systematic equipment verification while maintaining flexibility for custom equipment additions.

_Last Updated: 2024-12-28_
