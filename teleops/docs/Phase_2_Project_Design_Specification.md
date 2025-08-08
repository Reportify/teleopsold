# Phase 2: Project Design Specification

## Overview

Phase 2 delivers the Design module for projects, focusing on defining the equipment design scope without enforcing quantities or site allocations. Designs are versioned, support attachments (drawings, photos, docs), and use a flexible equipment model (no rigid category constraints). Quantities and site-level allocations are handled later in Phase 3.

---

## Business Context

### Core Objectives

```yaml
Design Phase Objectives:
  - Define project design scope using flexible equipment items
  - Support template-driven and ad-hoc design entries
  - Maintain design versions and change history
  - Capture technical attributes/specifications per item
  - Attach supporting artifacts (drawings, approvals)
  - Validate consistency before proceeding to inventory
  - Keep quantities and site allocations out of design
```

### Key Principles

- Separation of concerns: Design ≠ Inventory ≠ Task
- Flexible equipment taxonomy: category is optional metadata
- Version-first: all design changes generate new versions
- Auditability: full trace of design decisions and approvals
- Multi-tenant isolation and unified single-portal approach

---

## Architecture Overview

```yaml
Design Module Architecture:
  Frontend:
    - React/TS + MUI (DataGrid + Forms)
    - Version switcher + diff viewer
    - Attachment uploader with previews
    - Feature-gated actions (create/update/delete/version)

  Backend (DRF):
    - ViewSets for design items, versions, attachments
    - Service layer for validation and versioning
    - Storage service for file attachments

  Data:
    - PostgreSQL models for designs, items, attributes, versions
    - Soft delete + audit trail

  Security:
    - Tenant-scoped queries
    - Standardized permission codes (to be wired in Phase 5)
```

---

## Data Model (Logical)

```yaml
Tables:
  ProjectDesign:
    - id, project_id(FK), tenant_id(FK)
    - current_version_id(FK)
    - status: draft|under_review|approved|archived
    - created_by, created_at, updated_at, deleted_at

  ProjectDesignVersion:
    - id, design_id(FK), version_number (1..n)
    - title, notes, changelog
    - is_locked (bool) # locked once approved
    - created_by, created_at

  DesignItem:
    - id, design_version_id(FK)
    - item_name (string)
    - equipment_code (string, optional)
    - category (string, optional)
    - model (string, optional)
    - manufacturer (string, optional)
    - attributes (jsonb) # flexible key-value specs
    - remarks (text)
    - sort_order (int)

  DesignAttachment:
    - id, design_version_id(FK)
    - file_path, file_name, file_size
    - file_type (drawing|photo|doc|other)
    - uploaded_by, uploaded_at
```

---

## API Endpoints

### 1. Design Root

```yaml
GET    /api/v1/projects/{project_id}/design/               # Get design summary with current version
POST   /api/v1/projects/{project_id}/design/versions/      # Create new design version (from scratch or copy)
GET    /api/v1/projects/{project_id}/design/versions/      # List versions
GET    /api/v1/projects/{project_id}/design/versions/{id}/ # Get version details (items + attachments)
POST   /api/v1/projects/{project_id}/design/versions/{id}/lock/   # Lock version (approve)
POST   /api/v1/projects/{project_id}/design/versions/{id}/archive # Archive version
```

### 2. Design Items

```yaml
GET    /api/v1/design/versions/{version_id}/items/         # List items
POST   /api/v1/design/versions/{version_id}/items/         # Create item
GET    /api/v1/design/items/{item_id}/                     # Retrieve item
PUT    /api/v1/design/items/{item_id}/                     # Update item
DELETE /api/v1/design/items/{item_id}/                     # Delete item
POST   /api/v1/design/versions/{version_id}/items/bulk/    # Bulk create/update
```

### 3. Attachments

```yaml
GET    /api/v1/design/versions/{version_id}/attachments/   # List attachments
POST   /api/v1/design/versions/{version_id}/attachments/   # Upload attachment (multipart)
DELETE /api/v1/design/attachments/{attachment_id}/         # Delete attachment
```

---

## Detailed API Specifications

### 1) Create Design Version

```yaml
POST /api/v1/projects/{project_id}/design/versions/
Auth: JWT
Permissions: design.create
Payload:
{
  "title": "Initial Design",
  "notes": "Baseline design for dismantling",
  "copy_from_version_id": null   # or existing version id for cloning
}

201 Response:
{
  "id": 12,
  "design_id": 7,
  "version_number": 3,
  "title": "Initial Design",
  "notes": "Baseline design for dismantling",
  "changelog": "Version created",
  "is_locked": false,
  "created_at": "2025-01-10T10:30:00Z"
}
```

### 2) Add Design Item

```yaml
POST /api/v1/design/versions/{version_id}/items/
Auth: JWT
Permissions: design.update
Payload:
{
  "item_name": "MW Antenna 0.6m",
  "equipment_code": "MW-ANT-060",
  "category": "Antenna",
  "model": "RAD-0.6",
  "manufacturer": "RADWIN",
  "attributes": {
    "gain_dbi": 30,
    "polarization": "dual",
    "mount_type": "pipe"
  },
  "remarks": "Outdoor rated",
  "sort_order": 10
}

201 Response:
{
  "id": 45,
  "design_version_id": 12,
  "item_name": "MW Antenna 0.6m",
  "equipment_code": "MW-ANT-060",
  "category": "Antenna",
  "model": "RAD-0.6",
  "manufacturer": "RADWIN",
  "attributes": { "gain_dbi": 30, "polarization": "dual", "mount_type": "pipe" },
  "remarks": "Outdoor rated",
  "sort_order": 10
}
```

### 3) Lock (Approve) Version

```yaml
POST /api/v1/projects/{project_id}/design/versions/{id}/lock/
Auth: JWT
Permissions: design.approve
Response 200:
{
  "id": 12,
  "status": "approved",
  "is_locked": true,
  "message": "Design version approved and locked"
}
```

---

## Validation Rules

```yaml
Design Version:
  - title: required, 1..255
  - copy_from_version_id: must belong to same design
  - cannot modify locked versions

Design Item:
  - item_name: required
  - attributes: json object, size limit 16KB
  - sort_order: integer >= 0
  - category/model/manufacturer: optional metadata

Attachments:
  - Max size per file: 20MB
  - Allowed types: pdf, png, jpg, jpeg, svg, dxf, docx, xlsx
  - Virus scan (if available)
```

---

## Data Flow & Workflow

```yaml
Flow: 1) User creates/duplicates a design version
  2) User adds/edits items and uploads attachments
  3) System validates entries and ensures referential integrity
  4) Reviewer approves (locks) a version
  5) Approved version becomes the baseline for Phase 3
```

---

## Security

- Tenant isolation on all queries
- Feature-gated endpoints (registered in Phase 5)
- Action audit trail (create/update/delete/approve)
- File storage access control (signed URLs if needed)

---

## Frontend UX Notes

- Version switcher with compare/diff view (item-by-item)
- Inline JSON attribute editor with schema hints
- Attachment previews with type badges
- Unsaved change indicators + optimistic UI

---

## Implementation Checklist

- [ ] Models and migrations
- [ ] Services: versioning, validation, clone
- [ ] Endpoints and serializers
- [ ] Attachment storage service
- [ ] List/detail screens, forms, uploader
- [ ] Version diff component
- [ ] Audit and soft delete
- [ ] Unit/integration tests

---

## Success Criteria

- [ ] Designs can be created, cloned, edited, and approved
- [ ] Flexible attributes captured without rigid taxonomy
- [ ] No quantities or site allocations in Phase 2
- [ ] Version locking prevents mutations
- [ ] Attachments supported and secured
- [ ] Clean handoff to Phase 3 inventory
