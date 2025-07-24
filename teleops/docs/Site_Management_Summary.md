# Site Management: VLT to Teleops Enhancement Summary

## Critical Architecture Correction: Sites vs Tasks

### **Architectural Distinction Clarified**

#### Previous Understanding (Incorrect)

```
Sites contained project, activity, assignment, status details
```

#### Correct Understanding (Teleops Architecture)

```
Sites: Master location data only (Site ID, Global ID, Name, Location, Cluster, Coordinates)
Tasks: Work orders with project, activity, assignments (reference sites for location)
```

### **Correct Data Separation**

```yaml
Sites (Master Data):
  - Physical location information
  - Tenant-specific but project-independent
  - Reusable across multiple tasks/projects
  - No status or assignment tracking

Tasks (Work Orders):
  - Project-specific work assignments
  - Reference sites for location context
  - Contains status, vendor allocation, team assignment
  - Multiple tasks can reference same site
```

---

## Key Enhancements from VLT to Teleops

### 1. **Master Data Management Focus**

#### Pure Site Master Data

- **Location Only**: Sites contain purely geographic information
- **Multi-Tenant**: Each client/vendor maintains their own site database
- **Reusable**: Same site can be referenced by multiple tasks across projects
- **Immutable Core**: Site IDs and coordinates cannot be changed once created

#### Clean Architecture

```
VLT (Mixed):     Site = Location + Project + Status + Assignment
Teleops (Clean): Site = Location only
                 Task = Project + Status + Assignment + Site Reference
```

### 2. **Enhanced Site Data Structure**

#### New Required Field

- **`cluster`**: Mandatory field for operational grouping/region

#### Refined Schema Focus

```sql
-- VLT Site Fields (mixed concerns)
site_id, global_id, site_name, town, latitude, longitude, planned_activity, status, assignment

-- Teleops Site Fields (master data only)
site_id, global_id, site_name, town, cluster, latitude, longitude

-- Teleops Task Fields (work order data)
project_id, site_id, planned_activity, status, vendor_allocation, team_assignment
```

### 3. **Bulk Upload Improvements**

#### Excel Template Refinement

```yaml
VLT Template (mixed data):
  - SiteID, GlobalID, SiteName, Town, Latitude, Longitude, PlannedActivity

Teleops Site Template (master data only):
  - SiteID, GlobalID, SiteName, Town, Cluster, Latitude, Longitude
  - (No project, status, or assignment fields)
```

#### Enhanced Validation

- **Geographic Validation**: Coordinate range and location verification
- **Duplicate Prevention**: Site ID unique within tenant, Global ID unique within tenant
- **Tenant Isolation**: Automatic tenant assignment during upload

### 4. **Site Creation Workflows**

#### Client Site Creation

```yaml
Process:
  - Create site in client's master data
  - Site available for task reference
  - No allocation/assignment at site level
  - Tasks handle project-specific work
```

#### Independent Vendor Sites

```yaml
Process:
  - Vendor creates sites in own tenant database
  - Sites isolated from client sites
  - Available for vendor's own task creation
  - No cross-tenant site sharing
```

### 5. **Geographic Enhancements**

#### Cluster-Based Organization

- **Operational Grouping**: Sites organized by geographic clusters
- **Regional Management**: Admin boundaries for site management
- **Location Intelligence**: Enhanced filtering and search by region

#### Enhanced Search Capabilities

```yaml
VLT Search:
  - Basic text search on site names/IDs

Teleops Search:
  - Text search on names, IDs, clusters
  - Geographic radius search
  - Cluster and town filtering
```

### 6. **Multi-Tenant Site Management**

#### Tenant Isolation

- **Separate Databases**: Each tenant maintains own site master data
- **No Cross-Sharing**: Sites cannot be shared between tenants
- **Independent Numbering**: Site IDs unique within tenant only
- **Global Uniqueness**: Global IDs unique within tenant

#### Permission Model

```yaml
Client Permissions:
  - Manage client's site master data
  - Create and edit site information
  - Bulk upload and data quality management
  - No access to vendor sites

Vendor Permissions:
  - Manage vendor's own site master data
  - Create sites for vendor's operations
  - No access to client sites
  - Independent site database
```

### 7. **API Architecture Changes**

#### Site Master Data APIs

```yaml
Site Management Only:
  GET    /api/sites/                    # List tenant's sites
  POST   /api/sites/                    # Create site master data
  PUT    /api/sites/{id}/               # Update site information
  DELETE /api/sites/{id}/               # Archive site
  POST   /api/sites/bulk-upload/        # Bulk create sites
  GET    /api/sites/export/             # Export site data
```

#### Task Management APIs (Separate Module)

```yaml
Task Management (Future):
  POST   /api/tasks/                    # Create task (references site)
  PUT    /api/tasks/{id}/allocate/      # Allocate task to vendor
  POST   /api/tasks/{id}/assign/        # Assign task to team
```

### 8. **Integration Points**

#### Task Management Integration

- **Site Reference**: Tasks reference sites for location data
- **Location Context**: Site coordinates used for routing
- **No Direct Assignment**: No vendor/team assignment at site level

#### Geographic Services

- **Coordinate Validation**: Real-time validation against mapping APIs
- **Distance Calculations**: Between sites for task planning
- **Clustering Algorithms**: Automatic cluster assignment suggestions

### 9. **Data Quality Management**

#### Master Data Focus

- **Coordinate Accuracy**: Validation against known landmarks
- **Duplicate Detection**: Advanced algorithms for similar sites

#### Audit Trail

```yaml
Site Audit Log:
  - Creation and modification history
  - Field-level change tracking
  - User activity monitoring
```

### 10. **User Experience Improvements**

#### Simplified Site Management

- **Pure Location Focus**: No confusion with task/project data
- **Geographic Visualization**: Cluster-based map views
- **Bulk Management**: Efficient mass data operations

#### Clear Separation

- **Site Module**: Master data management only
- **Task Module**: Work order and assignment management
- **Project Module**: Project planning and oversight

---

## Implementation Benefits

### 1. **Data Integrity**

- Clear separation of concerns
- Referential integrity between tasks and sites
- No data duplication across modules

### 2. **Scalability**

- Sites can be reused across multiple projects
- Efficient geographic queries and clustering
- Independent scaling of site vs task data

### 3. **Multi-Tenancy**

- Clean tenant isolation
- Independent vendor operations
- Secure data boundaries

### 4. **Future-Proofing**

- Task management module can be built separately
- Site master data remains stable foundation
- Easy integration with external systems

---

This corrected architecture ensures Teleops has a solid master data foundation where sites serve purely as location references for the task management system to be built next.
