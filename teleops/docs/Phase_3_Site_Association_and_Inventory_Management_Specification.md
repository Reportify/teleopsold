# Phase 3: Site Association & Inventory Management Specification

## Overview

Phase 3 operationalizes the approved design into quantities and site-specific allocations. It introduces inventory items (with quantities), site association, serial number tracking, logistics statuses, and bulk Excel processing. This phase executes after Design approval (Phase 2).

---

## Business Context

```yaml
Objectives:
  - Convert approved design into planned quantities
  - Associate equipment to project sites
  - Track inventory states (planned → allocated → in_transit → received → verified → dismantled/scrapped)
  - Manage serial number capture
  - Support Excel uploads and bulk processing
  - Provide dashboards and exports
  - Support dismantle projects with per-serial planning at each site
```

---

## Data Model (Logical)

```yaml
Tables:
  # Master site registry (global)
  Site:
    - id
    - tenant_id(FK)
    - site_id (required, unique within tenant)
    - global_id (required, unique within tenant)
    - site_name, town, cluster, address
    - latitude, longitude
    - site_type (enum: tower|data_center|exchange|substation|office|warehouse|other)
    - status (enum: active|inactive|maintenance|decommissioned)
    - contact_person (optional), contact_phone (optional)
    - legacy: name, city, site_code, state, country, postal_code, description, contact_email
    - deleted_at (soft delete), created_by(FK), created_at, updated_at

  # Project ↔ Site linking (per-project context)
  ProjectSite:
    - id, project_id(FK), site_id(FK -> Site)
    - alias_name (optional)
    - is_active, created_at, updated_at

  InventoryPlan:
    - id, project_id(FK), design_version_id(FK, approved)
    - plan_type: install|dismantle
    - status: draft|finalized
    - created_by, created_at, updated_at

  InventoryItem:
    - id, inventory_plan_id(FK)
    - design_item_id(FK)
    - planned_qty (int >= 0)
    - uom (string, default "unit")

  SiteAllocation:
    - id, project_site_id(FK), inventory_item_id(FK)
    - allocated_qty (int >= 0)
    - status: planned|allocated|partially_allocated|completed

  SerialRecord:
    - id, site_allocation_id(FK)
    - serial_number (string)
    - status: planned|in_transit|received|verified|dismantled|scrapped
    - received_at, verified_at
    - remarks (text)

  ExcelUploadJob:
    - id, project_id(FK)
    - job_type: site_link|inventory|inventory_dismantle
    - file_path, uploaded_by, uploaded_at
    - job_status: queued|processing|completed|failed
    - summary_json (jsonb) # counts, errors, warnings
```

---

## API Endpoints

### 1. Master Sites (Tenant-scoped)

```yaml
# CRUD + utilities
GET    /api/v1/sites/                                        # List/search sites in current tenant
POST   /api/v1/sites/                                        # Create a site in current tenant
GET    /api/v1/sites/{id}/                                   # Retrieve site details
PUT    /api/v1/sites/{id}/                                   # Update mutable fields
DELETE /api/v1/sites/{id}/                                   # Soft delete site
PATCH  /api/v1/sites/{id}/restore/                           # Restore soft-deleted site

# Bulk & templates
POST   /api/v1/sites/bulk-upload/                            # Upload Excel/CSV to create sites
GET    /api/v1/sites/template/                               # Download bulk template
GET    /api/v1/sites/export/?format=excel|csv                # Export sites with filters

# Data utilities
GET    /api/v1/sites/clusters/                                # List clusters with counts
GET    /api/v1/sites/towns/?cluster={cluster}                 # List towns (optional cluster filter)

# Project-linked sites (association to master)
GET    /api/v1/projects/{project_id}/sites/                  # List linked sites
POST   /api/v1/projects/{project_id}/sites/link/             # Link sites by IDs from master
DELETE /api/v1/projects/{project_id}/sites/{id}/             # Unlink site from project

# Bulk import/link (creates missing in master, then links)
POST   /api/v1/projects/{project_id}/sites/import/           # Upload Excel (multipart)
GET    /api/v1/projects/{project_id}/sites/import/jobs/      # List import jobs
GET    /api/v1/sites/import/jobs/{job_id}/                   # Import job status + summary
```

### 2. Inventory Planning

```yaml
POST   /api/v1/projects/{project_id}/inventory/plans/       # Create plan from approved design
GET    /api/v1/projects/{project_id}/inventory/plans/       # List plans
GET    /api/v1/inventory/plans/{plan_id}/                   # Plan detail
POST   /api/v1/inventory/plans/{plan_id}/finalize/          # Finalize plan (immutable)
```

### 3. Inventory Items & Allocation

```yaml
GET    /api/v1/inventory/plans/{plan_id}/items/             # List items with planned_qty
PUT    /api/v1/inventory/items/{item_id}/                   # Update planned_qty/uom

GET    /api/v1/inventory/items/{item_id}/allocations/       # List site allocations
POST   /api/v1/inventory/items/{item_id}/allocations/       # Create site allocation
PUT    /api/v1/allocations/{allocation_id}/                 # Update allocation qty/status
```

### 4. Serial Tracking

```yaml
GET    /api/v1/allocations/{allocation_id}/serials/         # List serials
POST   /api/v1/allocations/{allocation_id}/serials/         # Add serial(s) (single or bulk)
PUT    /api/v1/serials/{serial_id}/                         # Update serial status/metadata
DELETE /api/v1/serials/{serial_id}/                         # Remove serial

# Dismantle planning (bulk per-serial)
POST   /api/v1/projects/{project_id}/inventory/dismantle/import/   # Upload Excel of planned serials
GET    /api/v1/projects/{project_id}/inventory/dismantle/jobs/     # List dismantle import jobs
GET    /api/v1/inventory/dismantle/jobs/{job_id}/                  # Job status + summary
```

### 5. Excel Upload

```yaml
POST   /api/v1/projects/{project_id}/inventory/excel/       # Upload Excel (multipart)
GET    /api/v1/projects/{project_id}/inventory/excel/jobs/  # List jobs
GET    /api/v1/inventory/excel/jobs/{job_id}/               # Job status + summary
```

---

## Detailed API Specifications

### Link Sites to Project (manual selection)

```yaml
POST /api/v1/projects/{project_id}/sites/link/
Auth: JWT
Permissions: sites.link
Payload:
{
  "site_ids": [101, 102, 103]
}

201 Response:
{
  "linked": 3,
  "skipped": 0,
  "errors": []
}

Notes:
- Idempotent: existing links for (project_id, site_id) are skipped.
```

### Upload Sites Excel (bulk link + create missing master)

```yaml
POST /api/v1/projects/{project_id}/sites/import/
Auth: JWT
Permissions: sites.bulk_import
Multipart:
  - file: project_sites.xlsx

Template columns:
  - site_id
  - global_id
  - site_name (required if creating new master site)
  - town (optional; required if creating new master site and policy demands)
  - cluster (required if creating new master site)
  - address (optional)
  - latitude
  - longitude

Behavior:
  - If site_id provided, link that record directly (must belong to current tenant).
  - Else if global_id exists in master for this tenant, link it to the project.
  - Else create a new master Site using provided fields (site_name, cluster, latitude, longitude; town optional), then link.
  - Duplicate rows are deduplicated; operation is idempotent.

202 Response:
{
  "job_id": 88,
  "job_status": "queued"
}
```

### Create Inventory Plan from Design

```yaml
POST /api/v1/projects/{project_id}/inventory/plans/
Auth: JWT
Permissions: inventory.create
Payload:
{
  "design_version_id": 12,
  "plan_type": "install",  # or "dismantle"
  "notes": "Plan for Phase 3"
}

201 Response:
{
  "id": 20,
  "project_id": 5,
  "design_version_id": 12,
  "plan_type": "install",
  "status": "draft",
  "created_at": "2025-01-10T12:00:00Z"
}
```

### Create Site Allocation

```yaml
POST /api/v1/inventory/items/{item_id}/allocations/
Auth: JWT
Permissions: inventory.allocate
Payload:
{
  "project_site_id": 101,
  "allocated_qty": 5
}

201 Response:
{
  "id": 500,
  "inventory_item_id": 330,
  "project_site_id": 101,
  "allocated_qty": 5,
  "status": "allocated"
}
```

### Master Sites — List Sites (tenant)

```yaml
GET /api/v1/sites/
Auth: JWT
Permissions: site.read
Query Params (optional):
  - status: active|inactive|maintenance|decommissioned|all
  - site_type: tower|data_center|exchange|substation|office|warehouse|other|all
  - cluster: string

200 Response:
{
  "sites": [
    {
      "id": 123,
      "site_id": "IMDMP108114",
      "global_id": "IMBPL_31083",
      "site_name": "Kala Dev",
      "town": "Kaladev",
      "cluster": "Bhopal",
      "latitude": 24.25199,
      "longitude": 77.37022,
      "site_type": "tower",
      "status": "active",
      "full_address": "...",
      "created_at": "2025-01-10T12:00:00Z",
      "updated_at": "2025-01-10T12:00:00Z"
    }
  ],
  "statistics": { "total_sites": 100, "active_sites": 95, ... },
  "distributions": { "clusters": {"Bhopal": 50, "Indore": 50}, ... }
}
```

### Master Sites — Create Site

```yaml
POST /api/v1/sites/
Auth: JWT
Permissions: site.create
Payload (JSON):
{
  "site_id": "IMDMP108114",
  "global_id": "IMBPL_31083",
  "site_name": "Kala Dev",
  "town": "Kaladev",
  "cluster": "Bhopal",
  "latitude": 24.25199,
  "longitude": 77.37022,
  "address": "...",
  "site_type": "tower",
  "contact_person": "...",
  "contact_phone": "..."
}

201 Response:
{
  "message": "Site created successfully",
  "site": { "id": 123, "site_id": "IMDMP108114", "global_id": "IMBPL_31083", ... }
}

Validation:
- Required: site_id, global_id, site_name, town, cluster, latitude, longitude.
- Unique per tenant: site_id, global_id (excluding soft-deleted).
- Latitude in [-90, 90], longitude in [-180, 180].
```

### Master Sites — Detail/Update/Delete/Restore

```yaml
GET    /api/v1/sites/{id}/            # Details
PUT    /api/v1/sites/{id}/            # Update mutable fields only
DELETE /api/v1/sites/{id}/            # Soft delete
PATCH  /api/v1/sites/{id}/restore/    # Restore soft-deleted

Immutable on update: site_id, global_id, latitude, longitude.
```

### Master Sites — Bulk Upload and Template

```yaml
GET  /api/v1/sites/template/
POST /api/v1/sites/bulk-upload/
Auth: JWT
Permissions: site.create
Multipart (bulk-upload):
  - file: sites.xlsx | sites.csv

Template columns (required unless noted):
  - site_id, global_id, site_name, town, cluster, latitude, longitude
  - address (optional)
  - site_type (optional; default tower)
  - contact_person (optional)
  - contact_phone (optional)

200 Response (bulk-upload):
{
  "message": "Bulk upload completed. 120 sites created, 3 errors.",
  "summary": { "total_rows": 123, "success_count": 120, "error_count": 3 },
  "created_sites": [{ "row": 2, "site_id": "...", "id": 456 }],
  "errors": [{ "row": 5, "error": "Global ID already exists in this circle" }]
}
```

### Master Sites — Export/Utilities

```yaml
GET /api/v1/sites/export/?format=excel|csv&status=all&site_type=all&cluster=Bhopal
GET /api/v1/sites/clusters/
GET /api/v1/sites/towns/?cluster=Bhopal
```

### Add Serials (Bulk)

```yaml
POST /api/v1/allocations/{allocation_id}/serials/
Auth: JWT
Permissions: inventory.serial
Payload:
{
  "serials": [
    { "serial_number": "SN-10001", "status": "planned" },
    { "serial_number": "SN-10002", "status": "planned" }
  ]
}

201 Response:
{
  "created": 2,
  "duplicates": 0,
  "errors": []
}
```

Notes:

- For dismantle plans, default status is "planned" if omitted.
- For install plans, default status may be omitted and set during logistics.

### Upload Excel

```yaml
POST /api/v1/projects/{project_id}/inventory/excel/
Auth: JWT
Permissions: inventory.bulk_upload
Multipart:
  - file: inventory.xlsx

202 Response:
{
  "job_id": 77,
  "job_status": "queued"
}
```

### Upload Dismantle Planned Serials (Bulk)

```yaml
POST /api/v1/projects/{project_id}/inventory/dismantle/import/
Auth: JWT
Permissions: inventory.bulk_upload
Multipart:
  - file: dismantle_plan.xlsx

Template columns (required unless noted):
  - site_id
  - equipment_code (or design_item_code)
  - serial_number
  - remarks (optional)

Behavior:
  - Requires an active plan with plan_type=dismantle for the project.
  - Ensures `site_id` is linked to the project (Step 1). If not linked, the row fails with an error.
  - Ensures `equipment_code` maps to a design item within the plan; creates `SiteAllocation` if missing.
  - Inserts serial rows as `SerialRecord` with status=planned under the appropriate allocation.
  - Idempotent on (project_id, plan_id, site_id, equipment_code, serial_number).

202 Response:
{
  "job_id": 99,
  "job_status": "queued"
}
```

---

## Validation Rules

```yaml
Sites:
  - Master Site.site_code: unique if provided
  - Master Site.global_id: unique if provided (optional external reference)
  - ProjectSite: (project_id, site_id) must be unique
  - cluster: must be a valid value as per master clusters
  - Bulk import: if creating new master site, require (site_name, cluster, latitude, longitude); `global_id` optional, `site_code` optional

InventoryPlan:
  - design_version_id: must be approved
  - plan_type: must be one of install|dismantle
  - one active plan per project (configurable)

InventoryItem:
  - planned_qty: integer >= 0

SiteAllocation:
  - allocated_qty: integer >= 0 and <= remaining

SerialRecord:
  - serial_number: required, unique within allocation scope
  - status transitions validated (e.g., planned → dismantled → received → verified)
  - For dismantle plans: default status is planned on creation

Excel Upload:
  - Validate columns and data types
  - Produce row-level error report
  - Idempotent re-runs

Dismantle-specific:
  - Project must have an active dismantle plan to accept dismantle serial uploads
  - Serial's equipment_code must match the plan's design items
  - No duplicate serial_number within the same plan; optional global uniqueness across active dismantle plans
  - For each allocation, planned_qty must equal number of planned serials (if planned_qty is explicitly set)
```

---

## Workflow

```yaml
Flow: 1) Finalize approved design → create inventory plan (plan_type=install or dismantle)
  2) Link project sites from master (manual selection) or bulk import Excel (creates missing in master, then links)
  3a) For install: enter/adjust planned quantities per design item → allocate to sites → capture serials/logistics
  3b) For dismantle: upload planned per-serial list per site (bulk) → allocations auto-created as needed
  4) Track serial status transitions
  5) Bulk updates via Excel (optional)
  6) Monitor dashboards and exports
```

---

## Security & Audit

- Tenant isolation on all operations
- Feature gating (to be enforced in Phase 5)
- Audit trail for allocations, serial changes, and uploads
- Rate limiting for bulk operations

---

## Implementation Checklist

- [ ] Models/migrations for sites, plans, items, allocations, serials, jobs
- [ ] Introduce master `Site` model and migrate `ProjectSite` to reference it
- [ ] Services: site linker and bulk site import (create-if-missing + link)
- [ ] Services: allocation engine, serial manager, Excel parser
- [ ] Endpoints and serializers
- [ ] Background processing for Excel jobs
- [ ] Add job_type support to ExcelUploadJob for site imports
- [ ] Add `plan_type` to InventoryPlan and extend SerialRecord statuses to include planned
- [ ] Dismantle bulk import endpoint and processor (allocation auto-create + per-serial insertion)
- [ ] Dashboards and exports
- [ ] Tests: allocation rules, transitions, bulk flows
- [ ] Tests: site linking validations, bulk import idempotency, master site creation
- [ ] Tests: dismantle flows (serial uniqueness, allocation creation, status transitions)

---

## Success Criteria

- [ ] Approved design convertible to inventory plan
- [ ] Sites linkable from master and creatable via bulk import
- [ ] Sites manageable and linkable to allocations
- [ ] Quantities and serials tracked accurately
- [ ] Status transitions validated and auditable
- [ ] Excel import supports large data with clear error reports
- [ ] Dismantle projects supported with per-serial planning and bulk import
