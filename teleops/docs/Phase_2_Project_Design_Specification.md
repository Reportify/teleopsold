# Phase 2: Project Design Specification

## Overview

Phase 2 delivers the Design module for projects, focusing on defining the equipment design scope without enforcing quantities or site allocations. Designs are versioned with a simple Draft → Publish workflow (no approvals). Published versions are locked. The equipment model is flexible (no rigid category constraints) and integrates with the tenant-driven Equipment Inventory Category → Model hierarchy for search suggestions and fast item entry. Quantities and site-level allocations are handled later in Phase 3.

---

## Business Context

### Core Objectives

```yaml
Design Phase Objectives:
  - Define project design scope using flexible equipment items
  - Support template-driven and ad-hoc design entries
  - Maintain design versions and change history (drafts and published versions)
  - Capture optional technical attributes/specifications per item
  - Validate consistency before proceeding to inventory
  - Keep quantities and site allocations out of design
```

### Key Principles

- Separation of concerns: Design ≠ Inventory ≠ Task
- Flexible equipment taxonomy: category is optional metadata
- Version-first: all design changes generate new versions
- Auditability: full trace of design decisions and publishes
- Multi-tenant isolation and unified single-portal approach
- Inventory integration: search and selection leverage tenant-created categories/models (no hard dependency on predefined taxonomy)

---

## Architecture Overview

```yaml
Design Module Architecture:
  Frontend:
    - React/TS + MUI (DataGrid + Forms)
    - Version switcher (draft vs published) + diff viewer
    - Drag-and-drop sorting for items
    - Search with suggestions + keyboard navigation
    - Feature-gated actions (create/update/delete/version/publish)

  Backend (DRF):
    - ViewSets for design versions and items (no attachments)
    - Service layer for validation, versioning, and publish locking
    - Equipment Inventory integration service (reads tenant categories/models for suggestions)

  Data:
    - PostgreSQL models for designs, items, versions
    - Soft delete + audit trail
    - Reads from Equipment Inventory tables: `equipment_categories`, `equipment_models`

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
    - status: active|archived
    - created_by, created_at, updated_at, deleted_at

  ProjectDesignVersion:
    - id, design_id(FK), version_number (1..n)
    - title, notes, changelog
    - status: draft|published
    - is_locked (bool) # true when published
    - published_by, published_at
    - items_count (int, denormalized)
    - created_by, created_at

  DesignItem:
    - id, design_version_id(FK)
    - item_name (string)
    - equipment_code (string, optional)
    - category (string, optional)
    - model (string, optional)
    - manufacturer (string, optional)
    - attributes (jsonb, <=16KB, optional) # flexible key-value specs
    - remarks (text)
    - sort_order (int, default 0)
```

### Constraints & Indexes

```yaml
Constraints:
  - unique(tenant_id, project_id) on ProjectDesign (one container per project)
  - unique(design_id, version_number) on ProjectDesignVersion
  - check: version is immutable when is_locked = true (enforced in service)

Indexes:
  - ProjectDesign: (tenant_id, project_id), (tenant_id, status)
  - ProjectDesignVersion: (design_id, version_number), (design_id, created_at DESC), (design_id, status)
  - DesignItem: (design_version_id, sort_order)
```

---

## API Endpoints

### 1. Design Root

```yaml
GET    /api/v1/projects/{project_id}/design/               # Get design summary with current & latest published
POST   /api/v1/projects/{project_id}/design/versions/      # Create new draft version (from scratch or copy)
GET    /api/v1/projects/{project_id}/design/versions/      # List versions (draft + published)
GET    /api/v1/projects/{project_id}/design/versions/{id}/ # Get version details (items)
POST   /api/v1/projects/{project_id}/design/versions/{id}/publish/ # Publish version (locks version)
POST   /api/v1/projects/{project_id}/design/versions/{id}/archive  # Archive version
POST   /api/v1/projects/{project_id}/design/versions/{id}/clone/   # Clone version (deep copy items + metadata)
```

### 2. Design Items

```yaml
GET    /api/v1/design/versions/{version_id}/items/         # List items (paginated)
POST   /api/v1/design/versions/{version_id}/items/         # Create item
GET    /api/v1/design/items/{item_id}/                     # Retrieve item
PUT    /api/v1/design/items/{item_id}/                     # Update item
PATCH  /api/v1/design/items/{item_id}/                     # Partial update
DELETE /api/v1/design/items/{item_id}/                     # Delete item
POST   /api/v1/design/versions/{version_id}/items/bulk/    # Bulk create/update/delete
GET    /api/v1/design/suggestions/                         # Item suggestions from Equipment Inventory
```

Bulk payload (example):

```json
{
  "create": [{ "item_name": "MW Antenna 0.6m", "attributes": { "gain_dbi": 30 } }],
  "update": [{ "id": 45, "attributes": { "polarization": "dual" } }],
  "delete": [51, 52]
}
```

Suggestions API:

```yaml
GET /api/v1/design/suggestions/
Query:
  - q: string (search term)
  - limit: int (default 10)
  - categories_only: bool (optional) # If true, only return category names

200 Response:
{
  "categories": [
    { "id": 12, "name": "CABINET" },
    { "id": 34, "name": "ANTENNA" }
  ],
  "models": [
    { "id": 88, "category_id": 12, "category_name": "CABINET", "model_name": "RBS-2964", "manufacturer": "Ericsson" },
    { "id": 132, "category_id": 34, "category_name": "ANTENNA", "model_name": "Sector-Antenna-900", "manufacturer": "XYZ" }
  ]
}
```

Inline Create Hooks (using Inventory APIs):

```yaml
When user selects "Create category 'X'":
  POST /api/equipment/categories/
  Payload: { category_name: "X", unit_of_measurement: "Unit", requires_serial_number: false }
  On success: refresh suggestions; prefill category field with "X"

When user selects "Create model 'Y' in 'X'":
  1) Resolve or create category 'X' as above (if needed)
  2) POST /api/equipment/categories/{category_id}/models/
     Payload: { model_name: "Y", manufacturer: optional, specifications: {} }
  On success: refresh suggestions; prefill model field with "Y"
```

Pagination & Ordering (applies to versions and items):

```yaml
Query Params:
  - page: int (default 1)
  - page_size: int (default 20, max 100)
  - ordering: string (created_at|-created_at|version_number|-version_number|sort_order)
```

---

## Detailed API Specifications

### 1) Create Design Version (Draft)

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

### 2) Add Design Item (Optional manufacturer/attributes)

```yaml
POST /api/v1/design/versions/{version_id}/items/
Auth: JWT
Permissions: design.update
Payload:
{
  "item_name": "MW Antenna 0.6m",
  "equipment_code": "MW-ANT-060",
  "category": "Antenna",               # optional string; UI suggests from tenant categories
  "model": "RAD-0.6",                  # optional string; UI suggests from tenant models
  "manufacturer": "RADWIN",            # optional
  "attributes": {                        # optional JSON
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

### 3) Publish Version (Locks)

```yaml
POST /api/v1/projects/{project_id}/design/versions/{id}/publish/
Auth: JWT
Permissions: design.publish
Response 200:
{
  "id": 12,
  "status": "published",
  "is_locked": true,
  "message": "Design version published and locked"
}
```

---

## Validation Rules

```yaml
Design Version:
  - title: required, 1..255
  - copy_from_version_id: must belong to same design
  - cannot modify locked versions (no item mutations)
  - status transitions: draft -> published (optionally archived later)
  - publish rules: publish sets status=published, is_locked=true, published_by, published_at
  - publish requires at least 1 item

Design Item:
  - item_name: required
  - attributes: json object, size limit 16KB (optional)
  - sort_order: integer >= 0
  - category/model/manufacturer: optional metadata; if provided at publish time, must exist in Inventory

Cross-Tenant & Referential:
  - All nested routes validate the project belongs to tenant
  - version_id must map to same design and project
  - On publish: validate referenced category/model against tenant Inventory
```

---

## Data Flow & Workflow

```yaml
Flow: 1) User creates/duplicates a draft design version
  2) User adds/edits items (drag-and-drop ordering, search + suggestions)
  3) If equipment not found, user creates missing category/model via inline actions (Inventory APIs)
  4) System validates entries and ensures referential integrity
  5) User publishes the version (locks it)
  6) Latest published version becomes the baseline for Phase 3
```

---

## Security

- Tenant isolation on all queries
- Feature-gated endpoints (registered in Phase 5)
- Action audit trail (create/update/delete/publish)
- File storage access control (signed URLs if needed)
- Suggested permissions:
  - design.view, design.create, design.update, design.delete
- design.version.create, design.version.publish, design.version.archive
- design.item.manage

---

## Frontend UX & Architecture

### Architecture

```yaml
Stack:
  - React 18 + TypeScript
  - MUI v5 (Base components, DataGrid where helpful)
  - React Router v6 (design routes under /projects/:id/design)
  - Zustand or Redux Toolkit Query (lightweight state + API caching)
  - React Query for drafts/publish invalidation (optional)

State Slices:
  - designMeta: { currentVersionId, latestPublishedVersionId, versions[] }
  - designItems: paginated items keyed by versionId, with local order state
  - ui: { isPublishing, isCloning, isReordering, searchQuery, suggestions[] }

Data Fetching:
  - RTK Query endpoints for versions, items, clone, publish, bulk ops, suggestions
  - Normalized caching keyed by projectId + versionId
```

### UX Patterns

- Version switcher with labels: Draft n, Published n-1 (badge)
- Side-by-side diff view (optional) for draft vs last published
- Drag-and-drop (DND Kit) ordering for items; keyboard-accessible reordering
- Search with suggestions: debounce + highlight, arrow-key navigation, Enter to select; suggestions from tenant Equipment Inventory categories/models
- Inline actions when not found:
  - "Create category ‘X’" → calls Inventory API to create tenant category, then refresh suggestions
  - "Create model ‘Y’ in ‘X’" → calls Inventory API to add model under selected/typed category
- Quick add row: type to search or paste; converts to item on Enter
- Minimalistic forms: only item_name required; manufacturer/attributes optional
- Inline edit with enter-to-save, escape-to-cancel
- Empty states with primary call-to-action (Add item / Create draft)
- Unsaved change indicator; optimistic updates with rollback on error
- Pagination for large item sets; sticky header toolbar
- Publish banner with one-click publish; published versions are read-only
- Locked version indicator (chip) with tooltip showing publisher and timestamp

### Accessibility & Performance

- Full keyboard support for DnD and search
- Reduced motion preference respected
- Virtualized lists for large item sets when needed
- Color contrast AA or better; focus-visible styling

### Key Screens

- Design Overview: current draft, latest published, actions (Create Draft, Clone, Publish)
- Version Detail: items table (drag order), add/search with suggestions, bulk ops, publish button
- Version History: list of versions with status, counts, created/published metadata

---

## Implementation Checklist

- [ ] Models and migrations
- [ ] Services: versioning, validation, clone, locking rules
- [ ] Endpoints and serializers (incl. clone, publish, bulk, pagination, ordering)
- [ ] (Removed) Attachment storage service
- [ ] List/detail screens, forms, pagination UI, inline create actions
- [ ] Version diff component
- [ ] Audit and soft delete (default manager hides deleted)
- [ ] Unit/integration tests (workflow transitions, locking invariants, bulk ops)
  - Suggestions and inline create flows
  - Publish-time validation against Inventory

---

## Success Criteria

- [ ] Designs can be created, cloned, edited, and published
- [ ] Flexible attributes captured without rigid taxonomy
- [ ] No quantities or site allocations in Phase 2
- [ ] Version locking prevents mutations
- [ ] (Removed) Attachments are out of scope
- [ ] Clean handoff to Phase 3 inventory
