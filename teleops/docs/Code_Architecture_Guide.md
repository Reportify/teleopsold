# Teleops Code Architecture Guide

## Document Information

- **Version**: 2.0 - **MAJOR UPDATE: Domain-Driven Architecture**
- **Target Audience**: Developers, Technical Architects
- **Last Updated**: December 2024
- **Purpose**: Understand the enhanced domain-driven architecture and VLT-style verification engine

---

## Overview

This document explains the **enhanced Teleops platform architecture** featuring a sophisticated **domain-driven design (DDD)** with **VLT-style verification engine**. The platform now includes **7 complete business domains with 63 models** providing comprehensive field operations capabilities.

---

## 🚀 **NEW: Domain-Driven Architecture (DDD)**

### **Architecture Philosophy**

The Teleops platform now implements a **sophisticated domain-driven design** that organizes code by **business domains** rather than technical layers. This provides:

- **🎯 Business-focused organization** - Each domain represents a core business capability
- **🏗️ Enhanced maintainability** - From 1 massive 132KB file to 30 organized domain files
- **⚡ Parallel development** - New domains built alongside existing structure (zero risk)
- **📱 Mobile-ready foundation** - VLT-style verification engine with GPS workflows

### **Complete Domain Structure**

```
teleops_backend/domains/           # 🆕 Domain-Driven Architecture
├── tenant_management/             # Multi-tenant hierarchy management
│   ├── models/
│   │   ├── tenant.py             # Core tenant hierarchy
│   │   ├── telecom_circle.py     # Circle master data
│   │   ├── corporate_circle.py   # Corporate-Circle relationships
│   │   ├── circle_vendor.py      # Circle-Vendor relationships
│   │   ├── invitations.py        # Tenant invitation workflows
│   │   └── compliance.py         # Compliance tracking
│   └── services/                 # Business logic layer
├── identity_access/               # Advanced RBAC system
│   ├── models/
│   │   ├── user_profiles.py      # Tenant user management
│   │   ├── designations.py       # Hierarchical designation system
│   │   ├── permissions.py        # Permission categories & custom permissions
│   │   ├── assignments.py        # User-designation assignments
│   │   ├── overrides.py          # Individual permission overrides
│   │   ├── groups.py             # Permission groups
│   │   ├── audit.py              # Permission audit trails & caching
│   │   ├── registry.py           # Centralized permission registry
│   │   └── templates.py          # Designation templates & system roles
├── vendor_operations/             # Dual-mode vendor operations
│   ├── models/
│   │   ├── vendor_clients.py     # Independent client management
│   │   ├── vendor_relationships.py # Multi-level vendor hierarchies
│   │   ├── billing.py            # Comprehensive billing & profitability
│   │   └── performance.py        # Multi-dimensional performance tracking
├── project_management/            # Complete project lifecycle
│   ├── models/
│   │   ├── projects.py           # Core project management
│   │   ├── design.py             # Project design phase
│   │   ├── inventory.py          # Site-specific equipment allocation
│   │   ├── tasks.py              # Task creation & execution
│   │   └── teams.py              # Project team management
├── site_operations/               # 🎯 VLT-style site verification
│   ├── models/
│   │   ├── sites.py              # Enhanced site master data with GPS
│   │   ├── boundaries.py         # GPS boundaries & geofencing
│   │   ├── access_management.py  # Site access control & safety
│   │   ├── verification.py       # VLT-style site verification workflows
│   │   └── mobile_services.py    # Mobile app integration & offline sync
├── equipment_management/          # 🎯 Category→Model hierarchy
│   ├── models/
│   │   ├── categories.py         # Tenant-created equipment categories
│   │   ├── models.py             # Equipment models & specifications
│   │   ├── inventory.py          # Equipment inventory & serial tracking
│   │   ├── verification.py       # VLT-style equipment verification
│   │   └── lifecycle.py          # Equipment lifecycle management
└── task_field_operations/         # 🎯 VLT verification engine
    ├── models/
    │   ├── field_tasks.py         # VLT-style field task management
    │   ├── verification_workflows.py # Equipment verification engines
    │   ├── gps_verification.py    # GPS-based verification requirements
    │   ├── mobile_operations.py   # Mobile field operations
    │   └── documentation.py       # Photo & document verification
```

### **🎯 VLT-Style Verification Engine**

Our **core differentiator** - sophisticated field operations system:

```python
# Example: VLT-Style Field Task with GPS Verification
from domains.task_field_operations.models import FieldTask, TaskExecution
from domains.site_operations.models import SiteVerification
from domains.equipment_management.models import EquipmentVerification

# Create VLT-style field task
field_task = FieldTask.objects.create(
    task_name="VLT-Style Equipment Verification",
    task_type="Equipment_Verification",
    site=site,
    project=project,

    # VLT Requirements
    requires_gps_verification=True,
    gps_accuracy_required=10,  # 10-meter accuracy
    requires_equipment_scan=True,
    requires_photo_verification=True,
    minimum_photos_required=5,
    requires_serial_verification=True,

    # Team assignment
    assigned_team=field_team,
    team_lead=engineer
)

# Execute with GPS verification
execution = TaskExecution.objects.create(
    field_task=field_task,
    executed_by=engineer,
    execution_status='GPS_Verified',
    gps_latitude=site.latitude,
    gps_longitude=site.longitude,
    gps_accuracy=8.5,  # Meets requirement
    device_id='MOBILE_001',
    verification_score=95.0
)

# Equipment verification workflow
equipment_verification = EquipmentVerification.objects.create(
    equipment_item=equipment,
    verification_type='VLT_Style',
    requires_serial_scan=True,
    requires_photo_documentation=True,
    gps_verification_required=True
)
```

### **🏗️ Domain Integration Patterns**

**Cross-Domain Communication:**

```python
# Example: Project → Site → Equipment → Task Integration
from domains.project_management.models import Project
from domains.site_operations.models import Site
from domains.equipment_management.models import EquipmentCategory
from domains.task_field_operations.models import FieldTask

class ProjectFieldOperationsService:
    def create_vlt_verification_tasks(self, project_id):
        """Create VLT-style verification tasks for project"""
        project = Project.objects.get(id=project_id)

        for site in project.sites.all():
            # Get equipment categories for site
            categories = site.equipment_categories.filter(
                verification_type='VLT_Style'
            )

            for category in categories:
                # Create field task with VLT requirements
                field_task = FieldTask.objects.create(
                    project=project,
                    site=site,
                    task_type='Equipment_Verification',
                    equipment_categories=[category],
                    requires_gps_verification=True,
                    gps_accuracy_required=category.gps_accuracy_required,
                    verification_complexity=category.complexity_rating
                )

                # Create verification workflow
                self.create_verification_workflow(field_task, category)
```

### **📱 Mobile-Ready Architecture**

**Offline Sync & GPS Verification:**

```python
# Mobile operations with offline support
from domains.site_operations.models import MobileSync, OfflineOperation
from domains.task_field_operations.models import MobileOperation

class MobileFieldOperationsService:
    def sync_field_data(self, device_id, user):
        """Sync field operations data to mobile device"""

        # Create sync session
        sync = MobileSync.objects.create(
            user=user,
            device_id=device_id,
            sync_type='Field_Operations',
            sync_direction='Bidirectional'
        )

        # Queue offline operations
        pending_tasks = FieldTask.objects.filter(
            assigned_team__members=user,
            status='Assigned',
            supports_offline=True
        )

        for task in pending_tasks:
            OfflineOperation.objects.create(
                operation_type='Task_Execution',
                user=user,
                device_id=device_id,
                site=task.site,
                operation_data={
                    'task_id': str(task.id),
                    'verification_requirements': task.get_verification_requirements(),
                    'gps_requirements': {
                        'accuracy_required': task.gps_accuracy_required,
                        'site_boundaries': task.site.boundary.get_boundary_info()
                    }
                }
            )
```

### **⚡ Performance & Scalability**

**Domain-Specific Optimizations:**

```python
# Efficient cross-domain queries
from django.db.models import Prefetch

class OptimizedDomainQueries:
    def get_project_with_field_operations(self, project_id):
        """Efficiently load project with all field operations data"""
        return Project.objects.select_related(
            'tenant', 'client'
        ).prefetch_related(
            # Site operations data
            Prefetch('sites', queryset=Site.objects.select_related('boundary')),

            # Equipment management data
            Prefetch('equipment_categories',
                queryset=EquipmentCategory.objects.prefetch_related('equipment_models')),

            # Field operations data
            Prefetch('field_tasks',
                queryset=FieldTask.objects.select_related('assigned_team', 'team_lead')
                .prefetch_related('task_executions', 'progress_updates')),

            # Team management
            Prefetch('project_teams',
                queryset=ProjectTeam.objects.prefetch_related('team_members'))
        ).get(id=project_id)
```

---

## Current VLT Application Architecture

### Backend Structure (Django)

#### Project Organization

```
VervelandProject/
├── verveland_backend/          # Django project settings
│   ├── settings.py            # Configuration
│   ├── urls.py               # URL routing
│   └── wsgi.py               # WSGI configuration
├── api/                      # Main application
│   ├── models.py            # Database models
│   ├── serializers.py       # DRF serializers
│   ├── views.py            # API endpoints
│   ├── urls.py             # API URL patterns
│   └── admin.py            # Django admin
└── manage.py               # Django management
```

#### Core Models Explanation

**1. User Management**

```python
# How user authentication works
class UserProfile(models.Model):
    user = models.OneToOneField(User)  # Links to Django's User
    phone_number = models.CharField()
    designation = models.ForeignKey(Designation)
    # Additional fields for business logic

# Business Logic:
# - Each user has ONE profile
# - Profile contains business-specific information
# - Designation determines permissions and capabilities
```

**2. Project-Site Hierarchy**

```python
# How projects organize work
class Project(models.Model):
    name = models.CharField()
    client = models.ForeignKey(ClientCustomer)
    # Projects group multiple sites for a client

class Site(models.Model):
    project = models.ForeignKey(Project)
    site_id = models.CharField()  # Business identifier
    latitude/longitude = models.DecimalField()  # Location
    status = models.CharField()  # Workflow state

# Business Logic:
# Project → Contains many Sites → Each site has equipment to dismantle
# Site status flow: allocated → assigned → wip → done
```

**3. Team Assignment System**

```python
# How work gets assigned
class Team(models.Model):
    name = models.CharField()
    team_leader = models.ForeignKey(User)

class Assignment(models.Model):
    site = models.ForeignKey(Site)
    team = models.ForeignKey(Team)
    status = models.CharField()  # assigning → assigned → wip → done

# Business Logic:
# 1. Sites get assigned to teams
# 2. Teams accept assignments
# 3. Teams work on sites
# 4. Completion updates site status
```

### Data Flow - Current VLT System

#### 1. Site Assignment Flow

```python
# How site assignment actually works in code:

def assign_site_to_team(site_id, team_id):
    """
    Creates assignment linking site to team
    """
    # Step 1: Validate site is available
    site = Site.objects.get(id=site_id, status='allocated')

    # Step 2: Create assignment record
    assignment = Assignment.objects.create(
        site=site,
        team_id=team_id,
        status='assigned'
    )

    # Step 3: Update site status
    site.status = 'assigned'
    site.current_assignment = assignment
    site.save()

    # Step 4: Notify team (email/notification)
    notify_team_assignment(team_id, site_id)
```

#### 2. Dismantling Workflow

```python
# How dismantling records are created:

class DismantleRecord(models.Model):
    site = models.ForeignKey(Site)
    engineer = models.ForeignKey(User)
    status = models.CharField()  # pending → in_progress → completed

    # Equipment data stored as JSON
    equipment_data = models.JSONField()  # Flexible equipment storage

def create_dismantling_record(site_id, engineer_id, equipment_data):
    """
    Documents completed dismantling work
    """
    # Step 1: Validate engineer is assigned to site
    site = Site.objects.get(id=site_id)
    validate_engineer_assignment(engineer_id, site)

    # Step 2: Create dismantling record
    record = DismantleRecord.objects.create(
        site=site,
        engineer_id=engineer_id,
        equipment_data=equipment_data,
        status='completed'
    )

    # Step 3: Update site status to done
    site.status = 'done'
    site.save()

    # Step 4: Calculate recovered value
    total_value = calculate_equipment_value(equipment_data)

    return record
```

### Frontend Structure (React)

#### Component Architecture

```typescript
// How the React app is organized:

src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main app layout
│   ├── AuthGuard.tsx   # Protected routes
│   └── SiteDetailsDrawer.tsx  # Site information panel
├── pages/              # Main application pages
│   ├── DashboardPage.tsx     # Overview dashboard
│   ├── SitesPage.tsx         # Site management
│   ├── ProjectsPage.tsx      # Project management
│   └── TeamManagementPage.tsx # Team operations
├── services/           # API communication
│   └── api.ts         # Centralized API calls
├── store/             # State management
│   ├── index.ts       # Redux store setup
│   └── userSlice.ts   # User state management
└── types/             # TypeScript definitions
    └── index.ts       # Shared type definitions
```

#### State Management Pattern

```typescript
// How data flows in the React app:

// 1. API Service Layer
export const api = {
  // Centralized API calls
  async getSites(projectId: number): Promise<Site[]> {
    const response = await fetch(`/api/v1/sites/?project=${projectId}`);
    return response.json();
  },

  async assignSite(siteId: number, teamId: number) {
    return fetch(`/api/v1/assignments/`, {
      method: "POST",
      body: JSON.stringify({ site: siteId, team: teamId }),
    });
  },
};

// 2. Component Data Flow
const SitesPage = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    try {
      const sitesData = await api.getSites(projectId);
      setSites(sitesData);
    } finally {
      setLoading(false);
    }
  };

  // Handle user actions
  const handleAssignSite = async (siteId: number, teamId: number) => {
    await api.assignSite(siteId, teamId);
    loadSites(); // Refresh data
  };
};
```

---

## Teleops Extension Architecture

### How New Modules Integrate

#### 1. Warehouse Management Integration

```python
# Extending existing models:

class DismantleRecord(models.Model):  # Existing model
    # ... existing fields ...

    # NEW: Warehouse integration fields
    warehouse_destination = models.ForeignKey('Warehouse', null=True)
    transport_ready = models.BooleanField(default=False)
    packaging_instructions = models.TextField(blank=True)

class Warehouse(models.Model):  # NEW model
    tenant_id = models.UUIDField()  # Multi-tenant support
    name = models.CharField(max_length=255)
    location = models.TextField()
    capacity = models.IntegerField()
    manager = models.ForeignKey(User)

class WarehouseReceipt(models.Model):  # NEW model
    dismantle_record = models.ForeignKey(DismantleRecord)
    warehouse = models.ForeignKey(Warehouse)
    received_at = models.DateTimeField()
    received_by = models.ForeignKey(User)

# Business Logic Integration:
# 1. Dismantling completion triggers warehouse receipt creation
# 2. Equipment moves from site → transport → warehouse
# 3. Warehouse tracks inventory by dismantling record
```

#### 2. Transportation Module Integration

```python
# How transportation connects to existing workflow:

def complete_dismantling_with_transport(dismantle_record_id):
    """
    Extended workflow including transportation
    """
    # Step 1: Complete existing dismantling workflow
    record = DismantleRecord.objects.get(id=dismantle_record_id)
    record.status = 'completed'
    record.save()

    # Step 2: NEW - Create warehouse receipt
    warehouse = assign_optimal_warehouse(record.site.location)
    receipt = WarehouseReceipt.objects.create(
        dismantle_record=record,
        warehouse=warehouse,
        status='pending_transport'
    )

    # Step 3: NEW - Schedule transportation
    trip = TransportTrip.objects.create(
        pickup_site=record.site,
        delivery_warehouse=warehouse,
        equipment_manifest=record.equipment_data,
        status='scheduled'
    )

    return {'record': record, 'receipt': receipt, 'trip': trip}
```

### Multi-Tenant Architecture Implementation

#### Row-Level Security Pattern

```python
# How tenant isolation works:

class TenantAwareModel(models.Model):
    tenant_id = models.UUIDField()  # Every record has tenant

    class Meta:
        abstract = True

    @classmethod
    def for_tenant(cls, tenant_id):
        """Filter all queries by tenant"""
        return cls.objects.filter(tenant_id=tenant_id)

# Usage in views:
class SiteViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Automatically filter by current user's tenant
        tenant_id = self.request.user.profile.tenant_id
        return Site.for_tenant(tenant_id)
```

#### Middleware for Tenant Context

```python
# Automatic tenant injection:

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract tenant from subdomain or header
        tenant_id = self.get_tenant_from_request(request)

        # Set in thread-local storage for database queries
        set_current_tenant(tenant_id)

        response = self.get_response(request)
        return response
```

---

## Data Flow Patterns

### Complete Workflow Integration

#### 1. Enhanced Dismantling → Warehouse Flow

```python
# How data flows through the extended system:

def process_site_completion(site_id, engineer_id, equipment_data):
    """
    Complete workflow from dismantling to warehouse
    """
    with transaction.atomic():  # Ensure data consistency

        # 1. EXISTING: Create dismantling record
        record = DismantleRecord.objects.create(
            site_id=site_id,
            engineer_id=engineer_id,
            equipment_data=equipment_data,
            status='completed'
        )

        # 2. NEW: Calculate equipment values
        total_value = 0
        for equipment in equipment_data:
            value = calculate_equipment_value(
                equipment['type'],
                equipment['condition'],
                equipment['quantity']
            )
            total_value += value

        record.total_estimated_value = total_value
        record.save()

        # 3. NEW: Determine optimal warehouse
        warehouse = find_optimal_warehouse(
            site_location=record.site.latitude_longitude,
            equipment_types=equipment_data,
            total_value=total_value
        )

        # 4. NEW: Create warehouse receipt
        receipt = WarehouseReceipt.objects.create(
            dismantle_record=record,
            warehouse=warehouse,
            expected_items=len(equipment_data),
            expected_value=total_value,
            status='pending_transport'
        )

        # 5. NEW: Schedule transportation
        vehicle = assign_optimal_vehicle(
            pickup_location=record.site.location,
            delivery_location=warehouse.location,
            load_requirements=calculate_load_requirements(equipment_data)
        )

        trip = TransportTrip.objects.create(
            dismantle_record=record,
            warehouse_receipt=receipt,
            vehicle=vehicle,
            pickup_scheduled=timezone.now() + timedelta(days=1),
            status='scheduled'
        )

        # 6. EXISTING: Update site status
        record.site.status = 'done'
        record.site.save()

        # 7. NEW: Send notifications
        notify_warehouse_incoming_equipment(warehouse, receipt)
        notify_transport_team_pickup_scheduled(trip)
        notify_client_site_completed(record.site.project.client, record)

        return {
            'dismantling_record': record,
            'warehouse_receipt': receipt,
            'transport_trip': trip
        }
```

### Frontend State Management Extensions

#### Redux Store Structure for Teleops

```typescript
// How the Redux store will be organized:

interface TeleopsState {
  // EXISTING VLT state
  user: UserState;
  projects: ProjectState;
  sites: SiteState;
  teams: TeamState;

  // NEW Teleops state
  warehouses: WarehouseState;
  inventory: InventoryState;
  transportation: TransportationState;

  // Cross-cutting concerns
  ui: UIState;
  api: APIState;
}

// Example warehouse state management:
const warehouseSlice = createSlice({
  name: "warehouses",
  initialState: {
    list: [],
    selected: null,
    inventory: {},
    loading: false,
  },
  reducers: {
    // Load warehouses
    loadWarehousesStart: (state) => {
      state.loading = true;
    },
    loadWarehousesSuccess: (state, action) => {
      state.list = action.payload;
      state.loading = false;
    },

    // Update inventory
    updateInventory: (state, action) => {
      const { warehouseId, inventory } = action.payload;
      state.inventory[warehouseId] = inventory;
    },

    // Real-time updates via WebSocket
    inventoryUpdateReceived: (state, action) => {
      const { warehouseId, item, change } = action.payload;
      if (state.inventory[warehouseId]) {
        state.inventory[warehouseId].push(change);
      }
    },
  },
});
```

---

## API Layer Architecture

### How Endpoints Connect to Business Logic

#### Serializer Pattern

```python
# How data validation and transformation works:

class DismantlingRecordSerializer(serializers.ModelSerializer):
    # Nested serialization for complex data
    equipment_data = EquipmentDataSerializer(many=True)
    estimated_value = serializers.DecimalField(read_only=True)

    class Meta:
        model = DismantleRecord
        fields = '__all__'

    def create(self, validated_data):
        """Custom creation logic with business rules"""
        equipment_data = validated_data.pop('equipment_data')

        # Create main record
        record = DismantleRecord.objects.create(**validated_data)

        # Process equipment data
        total_value = 0
        for equipment in equipment_data:
            # Business logic: calculate value based on condition
            value = self.calculate_equipment_value(equipment)
            total_value += value

            # Create equipment record
            DismantledEquipment.objects.create(
                dismantle_record=record,
                **equipment,
                estimated_value=value
            )

        record.total_estimated_value = total_value
        record.save()

        # Trigger downstream processes
        self.trigger_warehouse_notification(record)
        self.schedule_transportation(record)

        return record
```

#### ViewSet Pattern for CRUD Operations

```python
# How API endpoints handle business logic:

class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer

    def get_queryset(self):
        # Tenant filtering + business logic
        tenant_id = self.request.user.profile.tenant_id
        queryset = Site.objects.filter(tenant_id=tenant_id)

        # Apply filters based on user role
        if self.request.user.profile.designation.name == 'field_engineer':
            # Engineers only see assigned sites
            queryset = queryset.filter(
                assignments__team__members__user=self.request.user,
                assignments__status='assigned'
            )

        return queryset

    @action(detail=True, methods=['post'])
    def assign_team(self, request, pk=None):
        """Custom endpoint for site assignment"""
        site = self.get_object()
        team_id = request.data.get('team_id')

        # Business logic validation
        if site.status != 'allocated':
            return Response(
                {'error': 'Site must be allocated to assign team'},
                status=400
            )

        # Create assignment
        assignment = Assignment.objects.create(
            site=site,
            team_id=team_id,
            status='assigned',
            assigned_by=request.user
        )

        # Update site status
        site.status = 'assigned'
        site.current_assignment = assignment
        site.save()

        # Send notifications
        notify_team_assignment(team_id, site.id)

        return Response({'assignment_id': assignment.id})
```

---

## Database Relationships & Queries

### How Models Connect in Practice

#### Relationship Patterns

```python
# Understanding the data relationships:

# 1. User → Profile → Team Membership
user = User.objects.get(id=1)
profile = user.userprofile  # One-to-one
teams = Team.objects.filter(members__user=user)  # Many-to-many through TeamMember

# 2. Project → Sites → Assignments → Teams
project = Project.objects.get(id=1)
sites = project.sites.all()  # Foreign key relationship
assignments = Assignment.objects.filter(site__project=project)  # Through relationship

# 3. Site → Dismantling → Equipment
site = Site.objects.get(id=1)
dismantling_records = site.dismantle_records.all()  # Related name
equipment_list = DismantledEquipment.objects.filter(
    dismantle_record__site=site
)  # Through dismantling record
```

#### Optimized Query Patterns

```python
# How to avoid N+1 queries and optimize performance:

# BAD: N+1 query pattern
sites = Site.objects.all()
for site in sites:
    print(site.project.name)  # Additional query for each site
    print(site.current_assignment.team.name)  # More queries

# GOOD: Optimized query with select_related
sites = Site.objects.select_related(
    'project',
    'current_assignment__team'
).all()
for site in sites:
    print(site.project.name)  # No additional query
    print(site.current_assignment.team.name)  # No additional query

# GOOD: Prefetch for many-to-many relationships
teams = Team.objects.prefetch_related(
    'members__user__userprofile',
    'assignments__site__project'
).all()
```

---

## Business Logic Patterns

### Workflow State Management

#### State Machine Pattern

```python
# How site status transitions work:

class SiteStatusManager:
    VALID_TRANSITIONS = {
        'allocated': ['assigned'],
        'assigned': ['wip', 'allocated'],  # Can unassign
        'wip': ['done', 'assigned'],  # Can reassign if issues
        'done': []  # Terminal state
    }

    @classmethod
    def can_transition(cls, current_status, new_status):
        return new_status in cls.VALID_TRANSITIONS.get(current_status, [])

    @classmethod
    def transition_site_status(cls, site, new_status, user):
        if not cls.can_transition(site.status, new_status):
            raise ValueError(f"Cannot transition from {site.status} to {new_status}")

        # Log the transition
        SiteStatusHistory.objects.create(
            site=site,
            from_status=site.status,
            to_status=new_status,
            changed_by=user,
            timestamp=timezone.now()
        )

        # Update status
        site.status = new_status
        site.save()

        # Trigger side effects
        if new_status == 'done':
            cls.handle_site_completion(site)

    @classmethod
    def handle_site_completion(cls, site):
        """Business logic for site completion"""
        # Update project progress
        project = site.project
        project.completed_sites = project.sites.filter(status='done').count()
        project.save()

        # Release team for new assignments
        if site.current_assignment:
            site.current_assignment.status = 'completed'
            site.current_assignment.save()
```

### Permission System Integration

#### Role-Based Business Logic

```python
# How permissions affect business operations:

class BusinessPermissions:
    @staticmethod
    def can_assign_site(user, site):
        """Check if user can assign sites"""
        if not user.userprofile.designation.name in ['project_manager', 'admin']:
            return False

        # Additional business rules
        if site.status != 'allocated':
            return False

        # Check if user manages this project
        if user.userprofile.designation.name == 'project_manager':
            return site.project.project_manager == user

        return True

    @staticmethod
    def can_create_dismantling_record(user, site):
        """Check if user can create dismantling records"""
        if user.userprofile.designation.name != 'field_engineer':
            return False

        # Must be assigned to the site
        return Assignment.objects.filter(
            site=site,
            team__members__user=user,
            status='assigned'
        ).exists()
```

---

## Integration Points

### How Components Communicate

#### Event-Driven Architecture

```python
# How different modules communicate:

from django.dispatch import Signal, receiver

# Define business events
site_assigned = Signal()
dismantling_completed = Signal()
equipment_received = Signal()

# Event handlers
@receiver(dismantling_completed)
def handle_dismantling_completion(sender, dismantle_record, **kwargs):
    """Automatically trigger warehouse and transport processes"""

    # Warehouse notification
    create_warehouse_receipt.delay(dismantle_record.id)

    # Transportation scheduling
    schedule_equipment_pickup.delay(dismantle_record.id)

    # Client notification
    notify_client_completion.delay(dismantle_record.site.project.client.id)

# Trigger events in business logic
def complete_site_dismantling(dismantle_record):
    # Update status
    dismantle_record.status = 'completed'
    dismantle_record.save()

    # Trigger event
    dismantling_completed.send(
        sender=DismantleRecord,
        dismantle_record=dismantle_record
    )
```

#### Background Task Integration

```python
# How long-running processes work:

from celery import shared_task

@shared_task
def process_equipment_photos(dismantle_record_id):
    """Process and optimize photos in background"""
    record = DismantleRecord.objects.get(id=dismantle_record_id)

    for photo in record.photos.all():
        # Resize and optimize
        optimized_image = optimize_image(photo.image)

        # Upload to cloud storage
        cloud_url = upload_to_azure_blob(optimized_image)

        # Update photo record
        photo.cloud_url = cloud_url
        photo.processing_status = 'completed'
        photo.save()

@shared_task
def calculate_project_analytics(project_id):
    """Calculate project metrics in background"""
    project = Project.objects.get(id=project_id)

    analytics = {
        'total_value_recovered': calculate_total_recovery_value(project),
        'completion_rate': calculate_completion_rate(project),
        'average_time_per_site': calculate_average_time(project),
        'equipment_condition_breakdown': get_condition_breakdown(project)
    }

    # Cache results
    cache.set(f'project_analytics_{project_id}', analytics, timeout=3600)
```

---

## Performance Patterns

### Caching Strategy

```python
# How caching improves performance:

from django.core.cache import cache
from django.views.decorators.cache import cache_page

class OptimizedSiteViewSet(viewsets.ModelViewSet):

    def list(self, request):
        # Cache key based on user and filters
        cache_key = f'sites_{request.user.id}_{request.GET.urlencode()}'

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # Generate data
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Cache for 5 minutes
        cache.set(cache_key, serializer.data, timeout=300)

        return Response(serializer.data)

    def perform_update(self, serializer):
        # Update object
        instance = serializer.save()

        # Invalidate related caches
        cache.delete_many([
            f'sites_{instance.project.project_manager.id}_*',
            f'project_sites_{instance.project.id}',
            f'team_assignments_{instance.current_assignment.team.id}'
        ])
```

### Database Optimization

```python
# Query optimization patterns:

class OptimizedQueries:
    @staticmethod
    def get_sites_with_full_context(project_id):
        """Single query to get all site data"""
        return Site.objects.filter(project_id=project_id).select_related(
            'project',
            'project__client',
            'current_assignment',
            'current_assignment__team',
            'current_assignment__team__team_leader'
        ).prefetch_related(
            'dismantle_records',
            'dismantle_records__dismantled_equipment',
            'assignments__team__members'
        )

    @staticmethod
    def get_dashboard_data(user):
        """Optimized dashboard query"""
        # Use database views for complex aggregations
        return {
            'user_stats': get_user_statistics(user.id),
            'recent_activities': get_recent_activities(user.id, limit=10),
            'pending_assignments': get_pending_assignments(user.id),
            'completion_metrics': get_completion_metrics(user.id)
        }
```

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Update**: After initial development phase
