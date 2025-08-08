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
  - Manage serial number capture and barcodes
  - Support Excel uploads and bulk processing
  - Provide dashboards and exports
```

---

## Data Model (Logical)

```yaml
Tables:
  ProjectSite:
    - id, project_id(FK), site_code, site_name, circle, address
    - latitude, longitude
    - is_active, created_at, updated_at

  InventoryPlan:
    - id, project_id(FK), design_version_id(FK, approved)
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
    - barcode (string, optional)
    - status: in_transit|received|verified|dismantled|scrapped
    - received_at, verified_at
    - remarks (text)

  ExcelUploadJob:
    - id, project_id(FK)
    - file_path, uploaded_by, uploaded_at
    - job_status: queued|processing|completed|failed
    - summary_json (jsonb) # counts, errors, warnings
```

---

## API Endpoints

### 1. Sites

```yaml
GET    /api/v1/projects/{project_id}/sites/                 # List sites
POST   /api/v1/projects/{project_id}/sites/                 # Create site
PUT    /api/v1/projects/{project_id}/sites/{id}/            # Update site
DELETE /api/v1/projects/{project_id}/sites/{id}/            # Delete site
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
```

### 5. Excel Upload

```yaml
POST   /api/v1/projects/{project_id}/inventory/excel/       # Upload Excel (multipart)
GET    /api/v1/projects/{project_id}/inventory/excel/jobs/  # List jobs
GET    /api/v1/inventory/excel/jobs/{job_id}/               # Job status + summary
```

---

## Detailed API Specifications

### Create Inventory Plan from Design

```yaml
POST /api/v1/projects/{project_id}/inventory/plans/
Auth: JWT
Permissions: inventory.create
Payload:
{
  "design_version_id": 12,
  "notes": "Plan for Phase 3"
}

201 Response:
{
  "id": 20,
  "project_id": 5,
  "design_version_id": 12,
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

### Add Serials (Bulk)

```yaml
POST /api/v1/allocations/{allocation_id}/serials/
Auth: JWT
Permissions: inventory.serial
Payload:
{
  "serials": [
    { "serial_number": "SN-10001", "barcode": "BC-10001" },
    { "serial_number": "SN-10002", "barcode": "BC-10002" }
  ]
}

201 Response:
{
  "created": 2,
  "duplicates": 0,
  "errors": []
}
```

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

---

## Validation Rules

```yaml
Sites:
  - site_code: required, unique per project
  - circle: must match telecom circles

InventoryPlan:
  - design_version_id: must be approved
  - one active plan per project (configurable)

InventoryItem:
  - planned_qty: integer >= 0

SiteAllocation:
  - allocated_qty: integer >= 0 and <= remaining

SerialRecord:
  - serial_number: required, unique within allocation scope
  - status transitions validated (e.g., received → verified)

Excel Upload:
  - Validate columns and data types
  - Produce row-level error report
  - Idempotent re-runs
```

---

## Workflow

```yaml
Flow: 1) Finalize approved design → create inventory plan
  2) Enter/adjust planned quantities per design item
  3) Create project sites (or import)
  4) Allocate quantities to sites
  5) Capture serials and track statuses
  6) Bulk updates via Excel (optional)
  7) Monitor dashboards and exports
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
- [ ] Services: allocation engine, serial manager, Excel parser
- [ ] Endpoints and serializers
- [ ] Background processing for Excel jobs
- [ ] Dashboards and exports
- [ ] Tests: allocation rules, transitions, bulk flows

---

## Success Criteria

- [ ] Approved design convertible to inventory plan
- [ ] Sites manageable and linkable to allocations
- [ ] Quantities and serials tracked accurately
- [ ] Status transitions validated and auditable
- [ ] Excel import supports large data with clear error reports
